import { Router } from 'express'
import { getById, list } from '../controllers/report.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { listReportsQuerySchema, reportIdParamSchema } from '../validators/report.validator.js'

const router = Router()
router.use(requireAuth)
router.get('/', validate(listReportsQuerySchema, 'query'), list)
router.get('/:id', validate(reportIdParamSchema, 'params'), getById)

export default router
