import asyncHandler from '../utils/async-handler.js'
import { createScamCase, listScamCases, updateScamCase } from '../services/scam-case.service.js'

const list = asyncHandler(async (_request, response) => {
  response.json({ scamCases: await listScamCases() })
})

const create = asyncHandler(async (request, response) => {
  response.status(201).json(await createScamCase(request.body))
})

const update = asyncHandler(async (request, response) => {
  response.json(await updateScamCase({ id: request.params.id, data: request.body }))
})

export { create, list, update }
