import { Router } from 'express'
import { approve, getAdminById, listAdmin, reject } from '../controllers/report.controller.js'
import { completeSubmission, getUserActivityById } from '../controllers/admin.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { adminReviewSchema, listAdminReportsQuerySchema, listReportsQuerySchema, reportIdParamSchema } from '../validators/report.validator.js'
import { userIdParamSchema } from '../validators/admin.validator.js'
import { submissionIdParamSchema } from '../validators/submission.validator.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))
router.get('/reports', validate(listAdminReportsQuerySchema, 'query'), listAdmin)
router.get('/reports/:id', validate(reportIdParamSchema, 'params'), getAdminById)
router.patch('/reports/:id/approve', validate({ params: reportIdParamSchema, body: adminReviewSchema }), approve)
router.patch('/reports/:id/reject', validate({ params: reportIdParamSchema, body: adminReviewSchema }), reject)
router.get('/users/:userId/activity', validate({ params: userIdParamSchema, query: listReportsQuerySchema }), getUserActivityById)
router.patch('/submissions/:id/complete', validate(submissionIdParamSchema, 'params'), completeSubmission)

export default router
