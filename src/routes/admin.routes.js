import { Router } from 'express'
import {
  reviewReport,
  createAdminPost,
  updateAdminPost,
  deleteAdminPost,
} from '../controllers/community.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { reportIdParamSchema } from '../validators/report.validator.js'
import {
  postIdParamSchema,
  adminReviewReportSchema,
  adminCreatePostSchema,
  adminUpdatePostSchema,
} from '../validators/community.validator.js'

const router = Router()

// All admin routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'))

// Report review & publication
router.patch(
  '/reports/:id/review',
  validate({ params: reportIdParamSchema, body: adminReviewReportSchema }),
  reviewReport
)

// Direct community post management
router.post(
  '/posts',
  validate(adminCreatePostSchema),
  createAdminPost
)

router.patch(
  '/posts/:id',
  validate({ params: postIdParamSchema, body: adminUpdatePostSchema }),
  updateAdminPost
)

router.delete(
  '/posts/:id',
  validate(postIdParamSchema, 'params'),
  deleteAdminPost
)

export default router
