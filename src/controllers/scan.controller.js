import asyncHandler from '../utils/async-handler.js'
import { createScan, getOwnedScan } from '../services/scan.service.js'

const create = asyncHandler(async (request, response) => {
  const scan = await createScan({ userId: request.auth.userId, ...request.body })
  response.status(201).json({ scan })
})

const getById = asyncHandler(async (request, response) => {
  const scan = await getOwnedScan({ id: request.params.id, userId: request.auth.userId })
  response.json({ scan })
})

export { create, getById }
