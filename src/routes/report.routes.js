import { Router } from 'express'
import {
  create,
  getById,
  listMyReports,
  remove,
  removeEvidence,
  update,
  uploadEvidence,
} from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { upload } from '../middleware/upload.middleware.js'
import {
  createReportSchema,
  evidenceIdParamSchema,
  listMyReportsQuerySchema,
  reportIdParamSchema,
  updateReportSchema,
} from '../validators/report.validator.js'

const router = Router()

// All report endpoints require an authenticated user
router.use(requireAuth)

// Report CRUD
router.post('/', validate(createReportSchema), create)
router.get('/my-reports', validate(listMyReportsQuerySchema, 'query'), listMyReports)
router.get('/:id', validate(reportIdParamSchema, 'params'), getById)
router.patch('/:id', validate({ params: reportIdParamSchema, body: updateReportSchema }), update)
router.delete('/:id', validate(reportIdParamSchema, 'params'), remove)

// Report Evidence
router.post(
  '/:id/evidence',
  validate(reportIdParamSchema, 'params'),
  upload.array('files', 5),
  uploadEvidence
)
router.delete(
  '/:id/evidence/:evidenceId',
  validate(evidenceIdParamSchema, 'params'),
  removeEvidence
)

export default router
