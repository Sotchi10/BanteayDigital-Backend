import asyncHandler from '../utils/async-handler.js'
import { getAdminReport, getUserReport, listAdminReports, listUserReports, reviewReport } from '../services/report.service.js'

const list = asyncHandler(async (request, response) => {
  const reports = await listUserReports({
    userId: request.auth.userId,
    query: request.query,
  })

  response.json(reports)
})

const getById = asyncHandler(async (request, response) => {
  const report = await getUserReport({
    id: request.params.id,
    userId: request.auth.userId,
  })

  response.json({ report })
})

const listAdmin = asyncHandler(async (request, response) => {
  const reports = await listAdminReports({ query: request.query })
  response.json(reports)
})

const getAdminById = asyncHandler(async (request, response) => {
  const report = await getAdminReport({ id: request.params.id })
  response.json({ report })
})

const approve = asyncHandler(async (request, response) => {
  const result = await reviewReport({
    id: request.params.id,
    adminId: request.auth.userId,
    status: 'APPROVED',
    reviewNote: request.body.reviewNote,
  })

  response.json(result)
})

const reject = asyncHandler(async (request, response) => {
  const result = await reviewReport({
    id: request.params.id,
    adminId: request.auth.userId,
    status: 'REJECTED',
    reviewNote: request.body.reviewNote,
  })

  response.json(result)
})

export { approve, getAdminById, getById, list, listAdmin, reject }
