import { Router } from 'express'
import { create, getById } from '../controllers/scan.controller.js'
import { createFromScan } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { scanIdParamSchema, scanSchema } from '../validators/scan.validator.js'
import { reportFromScanSchema } from '../validators/report.validator.js'

const router = Router()

router.use(requireAuth)
router.post('/', validate(scanSchema), create)
router.get('/:id', validate(scanIdParamSchema, 'params'), getById)
router.post('/:id/report', validate({ params: scanIdParamSchema, body: reportFromScanSchema }), createFromScan)

export default router
