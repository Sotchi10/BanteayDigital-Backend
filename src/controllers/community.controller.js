import asyncHandler from '../utils/async-handler.js'
import { getPostById, listPosts } from '../services/community.service.js'

const list = asyncHandler(async (request, response) => {
  const posts = await listPosts({ query: request.query })
  response.json(posts)
})

const getById = asyncHandler(async (request, response) => {
  const post = await getPostById(request.params.id)
  response.json({ post })
})

export { getById, list }
