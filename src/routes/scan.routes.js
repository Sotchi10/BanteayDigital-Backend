import { Router } from 'express'
import { create, getById } from '../controllers/scan.controller.js'
import { uploadScanImageIfMultipart } from '../middleware/scan-image-upload.middleware.js'
import { createFromScan } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { imageScanSchema, scanIdParamSchema, scanSchema } from '../validators/scan.validator.js'
import { reportFromScanSchema } from '../validators/report.validator.js'

const router = Router()
const validateScanRequest = (request, response, next) => validate(request.is('multipart/form-data') ? imageScanSchema : scanSchema)(request, response, next)

router.use(requireAuth)
router.post('/', uploadScanImageIfMultipart, validateScanRequest, create)
router.get('/:id', validate(scanIdParamSchema, 'params'), getById)
router.post('/:id/report', validate({ params: scanIdParamSchema, body: reportFromScanSchema }), createFromScan)

export default router
