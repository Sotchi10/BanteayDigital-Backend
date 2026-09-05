import asyncHandler from '../utils/async-handler.js'
import { createReportFromScan, getAdminReport, getUserReport, listAdminReports, listUserReports, publishReport, reviewReport } from '../services/report.service.js'

const createFromScan = asyncHandler(async (request, response) => {
  const report = await createReportFromScan({ scanId: request.params.id, userId: request.auth.userId, title: request.body.title })
  response.status(201).json({ report })
})

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
  const report = await reviewReport({
    id: request.params.id,
    adminId: request.auth.userId,
    status: 'APPROVED',
    reviewNote: request.body.reviewNote,
  })

  response.json({ report })
})

const reject = asyncHandler(async (request, response) => {
  const report = await reviewReport({
    id: request.params.id,
    adminId: request.auth.userId,
    status: 'REJECTED',
    reviewNote: request.body.reviewNote,
  })

  response.json({ report })
})

const publish = asyncHandler(async (request, response) => {
  const post = await publishReport({ id: request.params.id, adminId: request.auth.userId, ...request.body })
  response.status(201).json({ post })
})

export { approve, createFromScan, getAdminById, getById, list, listAdmin, publish, reject }
