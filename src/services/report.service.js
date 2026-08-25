import fs from 'node:fs'
import path from 'node:path'
import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const sanitizeIndicatorValue = (type, value) => {
  const trimmed = value.trim()
  if (type === 'DOMAIN' || type === 'URL' || type === 'EMAIL') {
    return trimmed.toLowerCase()
  }
  return trimmed
}

const createReport = async ({ userId, data }) => {
  const {
    title,
    description,
    category,
    financialLossAmount,
    currency = 'USD',
    scammerContact,
    incidentDate,
    indicators = [],
  } = data

  const report = await prisma.$transaction(async (tx) => {
    const createdReport = await tx.report.create({
      data: {
        userId,
        title,
        description,
        category,
        financialLossAmount,
        currency,
        scammerContact,
        incidentDate,
        status: 'PENDING',
      },
    })

    if (indicators.length > 0) {
      for (const item of indicators) {
        const normalizedVal = sanitizeIndicatorValue(item.type, item.value)
        await tx.scamIndicator.upsert({
          where: { value: normalizedVal },
          create: {
            type: item.type,
            value: normalizedVal,
            sourceReportId: createdReport.id,
            notes: item.notes,
            riskScore: 80,
            matchCount: 1,
            isBlacklisted: true,
          },
          update: {
            matchCount: { increment: 1 },
            notes: item.notes || undefined,
          },
        })
      }
    }

    return tx.report.findUnique({
      where: { id: createdReport.id },
      include: {
        evidence: true,
        extractedIndicators: true,
      },
    })
  })

  return report
}

const getMyReports = async ({ userId, query }) => {
  const {
    status,
    category,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc',
  } = query

  const skip = (page - 1) * limit

  const where = {
    userId,
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
        { scammerContact: { contains: search } },
      ],
    }),
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        evidence: true,
        extractedIndicators: true,
      },
    }),
    prisma.report.count({ where }),
  ])

  return {
    reports,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getReportById = async ({ id, userAuth }) => {
  const isStaff = userAuth.role === 'ADMIN'

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      evidence: true,
      extractedIndicators: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          phone_num: isStaff,
          email: isStaff,
        },
      },
      reviewLogs: isStaff
        ? {
            include: {
              admin: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          }
        : false,
    },
  })

  if (!report) {
    throw new ApiError(404, 'Report not found')
  }

  if (report.userId !== userAuth.userId && !isStaff) {
    throw new ApiError(403, 'You do not have permission to view this report')
  }

  return report
}

const updateReport = async ({ id, userAuth, data }) => {
  const isStaff = userAuth.role === 'ADMIN'

  const existingReport = await prisma.report.findUnique({
    where: { id },
  })

  if (!existingReport) {
    throw new ApiError(404, 'Report not found')
  }

  if (existingReport.userId !== userAuth.userId && !isStaff) {
    throw new ApiError(403, 'You do not have permission to modify this report')
  }

  if (!isStaff && existingReport.status !== 'PENDING') {
    throw new ApiError(400, 'Cannot edit a report that is currently in review or already finalized')
  }

  const { indicators, ...reportFields } = data

  const updated = await prisma.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id },
      data: reportFields,
    })

    if (indicators && indicators.length > 0) {
      for (const item of indicators) {
        const normalizedVal = sanitizeIndicatorValue(item.type, item.value)
        await tx.scamIndicator.upsert({
          where: { value: normalizedVal },
          create: {
            type: item.type,
            value: normalizedVal,
            sourceReportId: id,
            notes: item.notes,
            riskScore: 80,
            matchCount: 1,
            isBlacklisted: true,
          },
          update: {
            matchCount: { increment: 1 },
            notes: item.notes || undefined,
          },
        })
      }
    }

    return tx.report.findUnique({
      where: { id },
      include: {
        evidence: true,
        extractedIndicators: true,
      },
    })
  })

  return updated
}

const deleteReport = async ({ id, userAuth }) => {
  const isStaff = userAuth.role === 'ADMIN'

  const existingReport = await prisma.report.findUnique({
    where: { id },
    include: { evidence: true },
  })

  if (!existingReport) {
    throw new ApiError(404, 'Report not found')
  }

  if (existingReport.userId !== userAuth.userId && userAuth.role !== 'ADMIN') {
    throw new ApiError(403, 'You do not have permission to delete this report')
  }

  if (userAuth.role === 'USER' && existingReport.status !== 'PENDING') {
    throw new ApiError(400, 'Cannot delete a report that is currently in review or already finalized')
  }

  // Remove evidence files from disk if locally hosted
  if (existingReport.evidence && existingReport.evidence.length > 0) {
    for (const item of existingReport.evidence) {
      if (item.fileUrl && item.fileUrl.startsWith('/uploads/')) {
        const localPath = path.resolve(process.cwd(), item.fileUrl.replace(/^\//, ''))
        if (fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath)
          } catch {
            // ignore unlink errors
          }
        }
      }
    }
  }

  await prisma.report.delete({ where: { id } })
  return { message: 'Report deleted successfully' }
}

const addReportEvidence = async ({ reportId, userAuth, evidenceItems }) => {
  const isStaff = userAuth.role === 'ADMIN'

  const existingReport = await prisma.report.findUnique({
    where: { id: reportId },
  })

  if (!existingReport) {
    throw new ApiError(404, 'Report not found')
  }

  if (existingReport.userId !== userAuth.userId && !isStaff) {
    throw new ApiError(403, 'You do not have permission to attach evidence to this report')
  }

  if (!isStaff && existingReport.status !== 'PENDING') {
    throw new ApiError(400, 'Cannot add evidence to a report that is currently in review or finalized')
  }

  const createdEvidence = await prisma.$transaction(
    evidenceItems.map((item) =>
      prisma.reportEvidence.create({
        data: {
          reportId,
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          fileType: item.fileType || 'IMAGE',
          fileSize: item.fileSize || 0,
          mimeType: item.mimeType,
          isPublicSafe: Boolean(item.isPublicSafe),
        },
      })
    )
  )

  return createdEvidence
}

const deleteReportEvidence = async ({ reportId, evidenceId, userAuth }) => {
  const isStaff = userAuth.role === 'ADMIN'

  const evidence = await prisma.reportEvidence.findUnique({
    where: { id: evidenceId },
    include: { report: true },
  })

  if (!evidence || evidence.reportId !== reportId) {
    throw new ApiError(404, 'Evidence not found for this report')
  }

  if (evidence.report.userId !== userAuth.userId && !isStaff) {
    throw new ApiError(403, 'You do not have permission to delete this evidence')
  }

  if (!isStaff && evidence.report.status !== 'PENDING') {
    throw new ApiError(400, 'Cannot delete evidence from a report that is in review or finalized')
  }

  // Delete local file if present
  if (evidence.fileUrl && evidence.fileUrl.startsWith('/uploads/')) {
    const localPath = path.resolve(process.cwd(), evidence.fileUrl.replace(/^\//, ''))
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath)
      } catch {
        // ignore unlink error
      }
    }
  }

  await prisma.reportEvidence.delete({ where: { id: evidenceId } })
  return { message: 'Evidence deleted successfully' }
}

export {
  createReport,
  getMyReports,
  getReportById,
  updateReport,
  deleteReport,
  addReportEvidence,
  deleteReportEvidence,
}
