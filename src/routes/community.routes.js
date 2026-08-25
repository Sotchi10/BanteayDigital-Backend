import { Router } from 'express'
import {
  getPosts,
  getPost,
  likePost,
  getLikes,
  bookmarkPost,
  getComments,
  addComment,
  sharePost,
} from '../controllers/community.controller.js'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import {
  listPostsQuerySchema,
  postIdParamSchema,
  createCommentSchema,
  trackShareSchema,
} from '../validators/community.validator.js'

const router = Router()

// Public / Guest accessible feed & post details (enriches with user likes/bookmarks if authenticated)
router.get('/', optionalAuth, validate(listPostsQuerySchema, 'query'), getPosts)
router.get('/:id', optionalAuth, validate(postIdParamSchema, 'params'), getPost)

// Likes & Bookmarks
router.get('/:id/likes', validate(postIdParamSchema, 'params'), getLikes)
router.post('/:id/like', requireAuth, validate(postIdParamSchema, 'params'), likePost)
router.post('/:id/bookmark', requireAuth, validate(postIdParamSchema, 'params'), bookmarkPost)

// 1-Level Threaded Comments
router.get('/:id/comments', validate(postIdParamSchema, 'params'), getComments)
router.post(
  '/:id/comments',
  requireAuth,
  validate({ params: postIdParamSchema, body: createCommentSchema }),
  addComment
)

// External Share Tracking
router.post(
  '/:id/share',
  optionalAuth,
  validate({ params: postIdParamSchema, body: trackShareSchema }),
  sharePost
)

export default router
