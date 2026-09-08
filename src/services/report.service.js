import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

let reportRepository = prisma

const PENDING_REPORT_STATUS = 'PENDING'
const APPROVED_REPORT_STATUS = 'APPROVED'

const reportInclude = {
  scan: {
    select: {
      id: true, inputType: true, normalizedInput: true, findings: true, assessment: true,
      score: true, analysisSummary: true, reportStatus: true, createdAt: true,
      scamCaseMatches: { select: { similarity: true, matchReason: true, scamCase: { select: { id: true, title: true, scamType: true, riskLevel: true } } } },
    },
  },
  communityPost: { select: { id: true, title: true, publishedAt: true } },
}

const pageResult = async (where, query, include = reportInclude) => {
  const { page, limit } = query
  const [reports, total] = await Promise.all([
    reportRepository.scamReport.findMany({ where, include, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    reportRepository.scamReport.count({ where }),
  ])
  return { reports, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const listUserReports = ({ userId, query }) => pageResult({ userId, ...(query.status && { status: query.status }) }, query)

const getUserReport = async ({ id, userId }) => {
  const report = await reportRepository.scamReport.findFirst({ where: { id, userId }, include: reportInclude })
  if (!report) throw new ApiError(404, 'Scam report not found')
  return report
}

const listAdminReports = ({ query }) => pageResult({
  ...(query.status && { status: query.status }),
  ...(query.userId && { userId: query.userId }),
}, query, {
  ...reportInclude,
  reviewedBy: { select: { id: true, name: true, email: true } },
})

const getAdminReport = async ({ id }) => {
  const report = await reportRepository.scamReport.findUnique({ where: { id }, include: { ...reportInclude, reviewedBy: { select: { id: true, name: true, email: true } } } })
  if (!report) throw new ApiError(404, 'Scam report not found')
  return report
}

const createReportFromScan = async ({ scanId, userId, title }) => {
  try {
    return await reportRepository.$transaction(async (tx) => {
      const scan = await tx.scan.findFirst({
        where: { id: scanId, userId },
        select: { id: true, inputType: true, rawInput: true, assessment: true },
      })
      if (!scan) throw new ApiError(404, 'Scan not found')
      if (scan.assessment === 'UNABLE_TO_ASSESS') throw new ApiError(409, 'This scan cannot be reported until it has a usable result')

      const report = await tx.scamReport.create({
        data: {
          userId,
          scanId: scan.id,
          title: title || null,
          content: scan.rawInput,
          ...(scan.inputType === 'URL' ? { sourceUrl: scan.rawInput } : {}),
        },
        include: reportInclude,
      })
      await tx.scan.update({ where: { id: scan.id }, data: { reportStatus: 'REPORTED' } })
      return report
    })
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'This scan has already been reported')
    throw error
  }
}

const reviewReport = async ({ id, adminId, status, reviewNote }) => {
  const report = await reportRepository.scamReport.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!report) throw new ApiError(404, 'Scam report not found')
  if (report.status !== PENDING_REPORT_STATUS) throw new ApiError(409, 'Scam report has already been reviewed')

  const update = await reportRepository.scamReport.updateMany({
    where: { id, status: PENDING_REPORT_STATUS },
    data: { status, reviewNote: reviewNote || null, reviewedById: adminId, reviewedAt: new Date() },
  })
  if (update.count !== 1) throw new ApiError(409, 'Scam report has already been reviewed')

  return reportRepository.scamReport.findUnique({ where: { id }, include: reportInclude })
}

const publishReport = async ({ id, adminId, title, summary, content }) => {
  const report = await reportRepository.scamReport.findUnique({ where: { id }, select: { id: true, status: true, communityPost: { select: { id: true } } } })
  if (!report) throw new ApiError(404, 'Scam report not found')
  if (report.status !== APPROVED_REPORT_STATUS) throw new ApiError(409, 'Only approved reports can be published')
  if (report.communityPost) throw new ApiError(409, 'This report has already been published')
  try {
    return await reportRepository.communityPost.create({ data: { reportId: id, authorId: adminId, title, summary, content } })
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'This report has already been published')
    throw error
  }
}

const setReportRepositoryForTests = (repository) => {
  reportRepository = repository || prisma
}

export { createReportFromScan, getAdminReport, getUserReport, listAdminReports, listUserReports, publishReport, reviewReport, setReportRepositoryForTests }
