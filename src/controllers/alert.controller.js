import asyncHandler from '../utils/async-handler.js'
import {
  createAlert,
  deleteAlert,
  listAdminAlerts,
  listPublicAlerts,
  setAlertPublication,
  updateAlert,
} from '../services/alert.service.js'

const listPublic = asyncHandler(async (request, response) => {
  response.json(await listPublicAlerts(request.query))
})

const listAdmin = asyncHandler(async (request, response) => {
  response.json(await listAdminAlerts(request.query))
})

const create = asyncHandler(async (request, response) => {
  response.status(201).json({ alert: await createAlert(request.body) })
})

const update = asyncHandler(async (request, response) => {
  response.json({ alert: await updateAlert({ id: request.params.id, data: request.body }) })
})

const publish = asyncHandler(async (request, response) => {
  response.json({
    alert: await setAlertPublication({
      id: request.params.id,
      isPublished: request.body.isPublished,
    }),
  })
})

const remove = asyncHandler(async (request, response) => {
  await deleteAlert(request.params.id)
  response.status(204).end()
})

export { create, listAdmin, listPublic, publish, remove, update }
