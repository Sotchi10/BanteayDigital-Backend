import { Router } from 'express'
import {
  editComment,
  removeComment,
} from '../controllers/community.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import {
  commentIdParamSchema,
  updateCommentSchema,
} from '../validators/community.validator.js'

const router = Router()

// Comment management requires authentication
router.use(requireAuth)

router.patch(
  '/:id',
  validate({ params: commentIdParamSchema, body: updateCommentSchema }),
  editComment
)

router.delete(
  '/:id',
  validate(commentIdParamSchema, 'params'),
  removeComment
)

export default router
