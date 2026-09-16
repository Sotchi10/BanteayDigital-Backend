import { Router } from 'express'
import { create, getById, list, remove } from '../controllers/scan.controller.js'
import { uploadScanImageIfMultipart } from '../middleware/scan-image-upload.middleware.js'
import { createFromScan } from '../controllers/report.controller.js'
import requireAuth, { optionalAuth } from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { imageScanSchema, listScansQuerySchema, scanIdParamSchema, scanSchema } from '../validators/scan.validator.js'
import { reportFromScanSchema } from '../validators/report.validator.js'
import env from '../config/env.js'
import { createRateLimiter } from '../middleware/rate-limit.middleware.js'
import { blockGuestImageUploads, enforceReportQuota, enforceScanQuota } from '../middleware/daily-quota.middleware.js'
import ApiError from '../utils/api-error.js'

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

// The original endpoint accepts all scan inputs at one address.  Keep it for
// existing clients, while also exposing stable, type-specific endpoints for
// clients that select Text, Link, or Image before submitting a scan.
const setScanInputType = (inputType) => (request, _response, next) => {
  const suppliedType = request.body?.inputType || request.body?.type
  if (suppliedType && suppliedType !== inputType) {
    return next(new ApiError(400, `This endpoint only accepts ${inputType} scans`))
  }
  request.body = { ...(request.body || {}), inputType }
  return next()
}

const scanRequestMiddleware = [optionalAuth, blockGuestImageUploads, limitMultipartUploads, aiRateLimiter, uploadScanImageIfMultipart]
const textOrUrlScanMiddleware = [optionalAuth, aiRateLimiter]

router.post('/', ...scanRequestMiddleware, validateScanRequest, enforceScanQuota, create)
router.post('/text', ...textOrUrlScanMiddleware, setScanInputType('TEXT'), validate(scanSchema), enforceScanQuota, create)
router.post('/url', ...textOrUrlScanMiddleware, setScanInputType('URL'), validate(scanSchema), enforceScanQuota, create)
router.post('/image', ...scanRequestMiddleware, setScanInputType('IMAGE'), validate(imageScanSchema), enforceScanQuota, create)
router.get('/', requireAuth, validate(listScansQuerySchema, 'query'), list)
router.get('/:id', requireAuth, validate(scanIdParamSchema, 'params'), getById)
router.delete('/:id', requireAuth, validate(scanIdParamSchema, 'params'), remove)
router.post('/:id/report', requireAuth, reportRateLimiter, validate({ params: scanIdParamSchema, body: reportFromScanSchema }), enforceReportQuota, createFromScan)

export default router
