import { Router } from 'express'
import {
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
} from '../controllers/community.controller.js'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js'
import { createRateLimiter } from '../middleware/rate-limit.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import {
  commentIdParamSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  listPostsQuerySchema,
  moderateCommentSchema,
  postIdParamSchema,
  recordShareSchema,
  reportCommentSchema,
  updateCommentSchema,
} from '../validators/community.validator.js'

const router = Router()
const shareRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many share events. Please try again later.',
})

router.get('/posts', optionalAuth, validate(listPostsQuerySchema, 'query'), list)
router.get('/posts/saved', requireAuth, validate(listPostsQuerySchema, 'query'), listSaved)
router.get('/posts/:id', optionalAuth, validate(postIdParamSchema, 'params'), getById)
router.put('/posts/:id/like', requireAuth, validate(postIdParamSchema, 'params'), like)
router.delete('/posts/:id/like', requireAuth, validate(postIdParamSchema, 'params'), unlike)
router.put('/posts/:id/save', requireAuth, validate(postIdParamSchema, 'params'), save)
router.delete('/posts/:id/save', requireAuth, validate(postIdParamSchema, 'params'), unsave)
router.post('/posts/:id/shares', shareRateLimiter, optionalAuth, validate({ params: postIdParamSchema, body: recordShareSchema }), share)
router.get('/posts/:id/comments', validate({ params: postIdParamSchema, query: listCommentsQuerySchema }), listPostComments)
router.post('/posts/:id/comments', requireAuth, validate({ params: postIdParamSchema, body: createCommentSchema }), createPostComment)
router.patch('/comments/:id', requireAuth, validate({ params: commentIdParamSchema, body: updateCommentSchema }), editComment)
router.delete('/comments/:id', requireAuth, validate(commentIdParamSchema, 'params'), removeComment)
router.post('/comments/:id/report', requireAuth, validate({ params: commentIdParamSchema, body: reportCommentSchema }), flagComment)
router.patch('/comments/:id/moderation', requireAuth, requireRole('ADMIN'), validate({ params: commentIdParamSchema, body: moderateCommentSchema }), moderate)

export default router
