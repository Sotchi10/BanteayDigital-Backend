import asyncHandler from '../utils/async-handler.js'
import { getDashboard, listAuditLogs, listUsers } from '../services/admin.service.js'

const dashboard = asyncHandler(async (_request, response) => {
  response.json(await getDashboard())
})

const users = asyncHandler(async (request, response) => {
  response.json(await listUsers({ query: request.query }))
})

const auditLogs = asyncHandler(async (request, response) => {
  response.json(await listAuditLogs({ query: request.query }))
})

export { auditLogs, dashboard, users }
