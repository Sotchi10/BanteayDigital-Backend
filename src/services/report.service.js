import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const reportInclude = {
  submission: { select: { id: true, userId: true, title: true, content: true, sourceUrl: true, analysisStatus: true, riskLevel: true, riskScore: true, analysisSummary: true, createdAt: true } },
  communityPost: { select: { id: true, title: true, publishedAt: true } },
}

const pageResult = async (where, query, include = reportInclude) => {
  const { page, limit } = query
  const [reports, total] = await Promise.all([
    prisma.scamReport.findMany({ where, include, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.scamReport.count({ where }),
  ])
  return { reports, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const listUserReports = ({ userId, query }) => pageResult({ submission: { is: { userId } }, ...(query.status && { status: query.status }) }, query)

const getUserReport = async ({ id, userId }) => {
  const report = await prisma.scamReport.findFirst({ where: { id, submission: { is: { userId } } }, include: reportInclude })
  if (!report) throw new ApiError(404, 'Scam report not found')
  return report
}

const listAdminReports = ({ query }) => pageResult({
  ...(query.status && { status: query.status }),
  ...(query.userId && { submission: { is: { userId: query.userId } } }),
}, query, {
  ...reportInclude,
  reviewedBy: { select: { id: true, name: true, email: true } },
})

const getAdminReport = async ({ id }) => {
  const report = await prisma.scamReport.findUnique({ where: { id }, include: { ...reportInclude, reviewedBy: { select: { id: true, name: true, email: true } } } })
  if (!report) throw new ApiError(404, 'Scam report not found')
  return report
}

const reviewReport = async ({ id, adminId, status, reviewNote }) => {
  const report = await prisma.scamReport.findUnique({ where: { id }, include: { submission: true, communityPost: true } })
  if (!report) throw new ApiError(404, 'Scam report not found')
  if (report.status !== 'PENDING') throw new ApiError(409, 'Scam report has already been reviewed')

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.scamReport.update({ where: { id }, data: { status, reviewNote: reviewNote || null, reviewedById: adminId, reviewedAt: new Date() } })
    let communityPost = null
    if (status === 'APPROVED') {
      const content = report.submission.analysisSummary || report.submission.content
      const title = report.submission.title || 'Community scam alert'
      communityPost = await tx.communityPost.create({
        data: { reportId: report.id, authorId: adminId, title, summary: content.slice(0, 500), content },
      })
    }
    return { report: updatedReport, communityPost }
  })
}

// Intended for the future analysis service. It deliberately performs no analysis.
const createReportForCompletedSubmission = async (submissionId) => {
  const submission = await prisma.scamSubmission.findUnique({ where: { id: submissionId }, select: { id: true, analysisStatus: true } })
  if (!submission) throw new ApiError(404, 'Scam submission not found')
  if (submission.analysisStatus !== 'COMPLETED') throw new ApiError(409, 'Submission analysis is not complete')
  return prisma.scamReport.upsert({ where: { submissionId }, create: { submissionId }, update: {} })
}

const completeSubmissionAndCreateReport = async (submissionId) => prisma.$transaction(async (transaction) => {
  const submission = await transaction.scamSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, analysisStatus: true },
  })

  if (!submission) {
    throw new ApiError(404, 'Scam submission not found')
  }

  if (submission.analysisStatus === 'FAILED') {
    throw new ApiError(409, 'A failed submission cannot be completed')
  }

  if (submission.analysisStatus !== 'COMPLETED') {
    await transaction.scamSubmission.update({
      where: { id: submissionId },
      data: { analysisStatus: 'COMPLETED' },
    })
  }

  return transaction.scamReport.upsert({
    where: { submissionId },
    create: { submissionId },
    update: {},
    include: reportInclude,
  })
})

export { completeSubmissionAndCreateReport, createReportForCompletedSubmission, getAdminReport, getUserReport, listAdminReports, listUserReports, reviewReport }
