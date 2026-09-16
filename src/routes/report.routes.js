import { Router } from 'express'
import { getById, list } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { listReportsQuerySchema, reportIdParamSchema } from '../validators/report.validator.js'
import env from '../config/env.js'
import { createRateLimiter } from '../middleware/rate-limit.middleware.js'

const router = Router()
const reportRateLimiter = createRateLimiter({
  windowMs: env.reportRateLimitWindowMs,
  max: env.reportRateLimitMax,
  message: 'Too many report requests. Please try again later.',
})
router.use(requireAuth)
router.use(reportRateLimiter)
router.get('/', validate(listReportsQuerySchema, 'query'), list)
router.get('/:id', validate(reportIdParamSchema, 'params'), getById)

export default router
