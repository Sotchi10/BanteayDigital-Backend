import asyncHandler from '../utils/async-handler.js'
import { createSubmission, deleteSubmission, getOwnedSubmission, listSubmissions, updateSubmission } from '../services/submission.service.js'

const create = asyncHandler(async (request, response) => {
  const submission = await createSubmission({
    userId: request.auth.userId,
    data: request.body,
  })

  response.status(201).json({ submission })
})

const list = asyncHandler(async (request, response) => {
  const submissions = await listSubmissions({
    userId: request.auth.userId,
    query: request.query,
  })

  response.json(submissions)
})

const getById = asyncHandler(async (request, response) => {
  const submission = await getOwnedSubmission({
    id: request.params.id,
    userId: request.auth.userId,
  })

  response.json({ submission })
})

const update = asyncHandler(async (request, response) => {
  const submission = await updateSubmission({
    id: request.params.id,
    userId: request.auth.userId,
    data: request.body,
  })

  response.json({ submission })
})

const remove = asyncHandler(async (request, response) => {
  await deleteSubmission({
    id: request.params.id,
    userId: request.auth.userId,
  })

  response.status(204).send()
})

export { create, getById, list, remove, update }
