import asyncHandler from '../utils/async-handler.js'
import { getUserActivity } from '../services/admin.service.js'
import { completeSubmissionAndCreateReport } from '../services/report.service.js'

const getUserActivityById = asyncHandler(async (request, response) => {
  const activity = await getUserActivity({
    userId: request.params.userId,
    query: request.query,
  })

  response.json(activity)
})

const completeSubmission = asyncHandler(async (request, response) => {
  const report = await completeSubmissionAndCreateReport(request.params.id)
  response.json({ report })
})

export { completeSubmission, getUserActivityById }
