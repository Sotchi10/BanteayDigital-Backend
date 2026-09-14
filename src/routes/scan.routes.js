import { Router } from 'express'
import { create, getById, list } from '../controllers/scan.controller.js'
import { uploadScanImageIfMultipart } from '../middleware/scan-image-upload.middleware.js'
import { createFromScan } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { imageScanSchema, listScansQuerySchema, scanIdParamSchema, scanSchema } from '../validators/scan.validator.js'
import { reportFromScanSchema } from '../validators/report.validator.js'
import env from '../config/env.js'
import { createRateLimiter } from '../middleware/rate-limit.middleware.js'

const router = Router()
const validateScanRequest = (request, response, next) => validate(request.is('multipart/form-data') ? imageScanSchema : scanSchema)(request, response, next)
const aiRateLimiter = createRateLimiter({
  windowMs: env.aiRateLimitWindowMs,
  max: env.aiRateLimitMax,
  message: 'Too many analysis requests. Please try again later.',
})
const uploadRateLimiter = createRateLimiter({
  windowMs: env.uploadRateLimitWindowMs,
  max: env.uploadRateLimitMax,
  message: 'Too many upload requests. Please try again later.',
})
const reportRateLimiter = createRateLimiter({
  windowMs: env.reportRateLimitWindowMs,
  max: env.reportRateLimitMax,
  message: 'Too many report requests. Please try again later.',
})
const limitMultipartUploads = (request, response, next) => (
  request.is('multipart/form-data')
    ? uploadRateLimiter(request, response, next)
    : next()
)

router.use(requireAuth)
router.post('/', limitMultipartUploads, aiRateLimiter, uploadScanImageIfMultipart, validateScanRequest, create)
router.get('/', validate(listScansQuerySchema, 'query'), list)
router.get('/:id', validate(scanIdParamSchema, 'params'), getById)
router.post('/:id/report', reportRateLimiter, validate({ params: scanIdParamSchema, body: reportFromScanSchema }), createFromScan)

export default router
