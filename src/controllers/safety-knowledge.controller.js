import asyncHandler from '../utils/async-handler.js'
import {
  createSafetyKnowledge,
  deleteSafetyKnowledge,
  getAdminSafetyKnowledge,
  getPublicSafetyKnowledge,
  listAdminSafetyKnowledge,
  listPublicSafetyKnowledge,
  setSafetyKnowledgePublication,
  updateSafetyKnowledge,
} from '../services/safety-knowledge.service.js'

const listPublic = asyncHandler(async (request, response) => {
  response.json(await listPublicSafetyKnowledge(request.query))
})

const getPublic = asyncHandler(async (request, response) => {
  response.json({ knowledge: await getPublicSafetyKnowledge(request.params.slug) })
})

const listAdmin = asyncHandler(async (request, response) => {
  response.json(await listAdminSafetyKnowledge(request.query))
})

const getAdmin = asyncHandler(async (request, response) => {
  response.json({ knowledge: await getAdminSafetyKnowledge(request.params.id) })
})

const create = asyncHandler(async (request, response) => {
  response.status(201).json({ knowledge: await createSafetyKnowledge(request.body) })
})

const update = asyncHandler(async (request, response) => {
  response.json({ knowledge: await updateSafetyKnowledge({ id: request.params.id, data: request.body }) })
})

const publish = asyncHandler(async (request, response) => {
  response.json({ knowledge: await setSafetyKnowledgePublication({ id: request.params.id, isPublished: request.body.isPublished }) })
})

const remove = asyncHandler(async (request, response) => {
  await deleteSafetyKnowledge(request.params.id)
  response.status(204).end()
})

export { create, getAdmin, getPublic, listAdmin, listPublic, publish, remove, update }
