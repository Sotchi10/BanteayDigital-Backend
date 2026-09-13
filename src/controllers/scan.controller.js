import asyncHandler from '../utils/async-handler.js'
import { createScan, getAdminScan, getOwnedScan } from '../services/scan.service.js'
import { createImageScan } from '../services/scan-image.service.js'

const create = asyncHandler(async (request, response) => {
  const scan = request.body.inputType === 'IMAGE'
    ? await createImageScan({ userId: request.auth.userId, image: request.file })
    : await createScan({ userId: request.auth.userId, type: request.body.inputType, value: request.body.value })
  response.status(201).json({ scan })
})

const getById = asyncHandler(async (request, response) => {
  const scan = request.auth.role === 'ADMIN'
    ? await getAdminScan({ id: request.params.id })
    : await getOwnedScan({ id: request.params.id, userId: request.auth.userId })
  response.json({ scan })
})

const getForAdmin = asyncHandler(async (request, response) => {
  const scan = await getAdminScan({ id: request.params.id })
  response.json({ scan })
})

export { create, getById, getForAdmin }
