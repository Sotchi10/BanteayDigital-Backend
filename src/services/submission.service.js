import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const submissionSelect = {
  id: true, userId: true, title: true, content: true, sourceUrl: true,
  analysisStatus: true, riskLevel: true, riskScore: true, analysisSummary: true,
  createdAt: true, updatedAt: true,
  report: { select: { id: true, status: true, createdAt: true, updatedAt: true } },
}

const createSubmission = ({ userId, data }) => prisma.scamSubmission.create({
  data: { userId, ...data },
  select: submissionSelect,
})

const listSubmissions = async ({ userId, query }) => {
  const { page, limit } = query
  const where = { userId }
  const [submissions, total] = await Promise.all([
    prisma.scamSubmission.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, select: submissionSelect }),
    prisma.scamSubmission.count({ where }),
  ])
  return { submissions, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const getOwnedSubmission = async ({ id, userId }) => {
  const submission = await prisma.scamSubmission.findFirst({ where: { id, userId }, select: submissionSelect })
  if (!submission) throw new ApiError(404, 'Scam submission not found')
  return submission
}

const updateSubmission = async ({ id, userId, data }) => {
  const submission = await prisma.scamSubmission.findFirst({ where: { id, userId }, select: { id: true, analysisStatus: true, report: { select: { id: true } } } })
  if (!submission) throw new ApiError(404, 'Scam submission not found')
  if (submission.analysisStatus !== 'PENDING' || submission.report) throw new ApiError(409, 'Submission can no longer be edited')
  return prisma.scamSubmission.update({ where: { id }, data, select: submissionSelect })
}

const deleteSubmission = async ({ id, userId }) => {
  const submission = await prisma.scamSubmission.findFirst({ where: { id, userId }, select: { id: true, analysisStatus: true, report: { select: { id: true } } } })
  if (!submission) throw new ApiError(404, 'Scam submission not found')
  if (submission.analysisStatus !== 'PENDING' || submission.report) throw new ApiError(409, 'Submission can no longer be deleted')
  await prisma.scamSubmission.delete({ where: { id } })
}

export { createSubmission, deleteSubmission, getOwnedSubmission, listSubmissions, updateSubmission }
