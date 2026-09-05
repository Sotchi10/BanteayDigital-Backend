import { Router } from 'express'
import { approve, getAdminById, listAdmin, publish, reject } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { adminReviewSchema, listAdminReportsQuerySchema, publishReportSchema, reportIdParamSchema } from '../validators/report.validator.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))
router.get('/reports', validate(listAdminReportsQuerySchema, 'query'), listAdmin)
router.get('/reports/:id', validate(reportIdParamSchema, 'params'), getAdminById)
router.patch('/reports/:id/approve', validate({ params: reportIdParamSchema, body: adminReviewSchema }), approve)
router.patch('/reports/:id/reject', validate({ params: reportIdParamSchema, body: adminReviewSchema }), reject)
router.post('/reports/:id/publish', validate({ params: reportIdParamSchema, body: publishReportSchema }), publish)

export default router
