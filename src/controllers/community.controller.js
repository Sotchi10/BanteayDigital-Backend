import asyncHandler from '../utils/async-handler.js'
import {
  createComment,
  deleteComment,
  getPostById,
  likePost,
  listComments,
  listPosts,
  listSavedPosts,
  moderateComment,
  recordPostShare,
  reportComment,
  savePost,
  unlikePost,
  unsavePost,
  updateComment,
} from '../services/community.service.js'

const list = asyncHandler(async (request, response) => {
  const posts = await listPosts({ query: request.query, userId: request.auth?.userId })
  response.json(posts)
})

const getById = asyncHandler(async (request, response) => {
  const post = await getPostById({ id: request.params.id, userId: request.auth?.userId })
  response.json({ post })
})

const listSaved = asyncHandler(async (request, response) => {
  response.json(await listSavedPosts({ query: request.query, userId: request.auth.userId }))
})

const like = asyncHandler(async (request, response) => {
  response.json(await likePost({ postId: request.params.id, userId: request.auth.userId }))
})

const unlike = asyncHandler(async (request, response) => {
  response.json(await unlikePost({ postId: request.params.id, userId: request.auth.userId }))
})

const save = asyncHandler(async (request, response) => {
  response.json(await savePost({ postId: request.params.id, userId: request.auth.userId }))
})

const unsave = asyncHandler(async (request, response) => {
  response.json(await unsavePost({ postId: request.params.id, userId: request.auth.userId }))
})

const share = asyncHandler(async (request, response) => {
  const interaction = await recordPostShare({
    postId: request.params.id,
    userId: request.auth?.userId,
    channel: request.body.channel,
  })
  response.status(201).json(interaction)
})

const listPostComments = asyncHandler(async (request, response) => {
  response.json(await listComments({ postId: request.params.id, query: request.query }))
})

const createPostComment = asyncHandler(async (request, response) => {
  const comment = await createComment({
    postId: request.params.id,
    authorId: request.auth.userId,
    content: request.body.content,
    parentId: request.body.parentId,
  })
  response.status(201).json({ comment })
})

const editComment = asyncHandler(async (request, response) => {
  const comment = await updateComment({ id: request.params.id, authorId: request.auth.userId, content: request.body.content })
  response.json({ comment })
})

const removeComment = asyncHandler(async (request, response) => {
  const comment = await deleteComment({ id: request.params.id, authorId: request.auth.userId })
  response.json({ comment })
})

const flagComment = asyncHandler(async (request, response) => {
  const report = await reportComment({ id: request.params.id, reporterId: request.auth.userId, ...request.body })
  response.status(201).json({ report })
})

const moderate = asyncHandler(async (request, response) => {
  const comment = await moderateComment({ id: request.params.id, status: request.body.status })
  response.json({ comment })
})

export {
  createPostComment,
  editComment,
  flagComment,
  getById,
  like,
  list,
  listPostComments,
  listSaved,
  moderate,
  removeComment,
  save,
  share,
  unlike,
  unsave,
}
