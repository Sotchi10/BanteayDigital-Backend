import asyncHandler from '../utils/async-handler.js'
import { createDetectionRule, listDetectionRules, updateDetectionRule } from '../services/detection-rule.service.js'

const list = asyncHandler(async (_request, response) => response.json({ detectionRules: await listDetectionRules() }))
const create = asyncHandler(async (request, response) => response.status(201).json({ detectionRule: await createDetectionRule(request.body) }))
const update = asyncHandler(async (request, response) => response.json({ detectionRule: await updateDetectionRule({ id: request.params.id, data: request.body }) }))

export { create, list, update }
