import { Router } from 'express'
import { listPublic } from '../controllers/alert.controller.js'
import validate from '../middleware/validate.middleware.js'
import { listAlertsQuerySchema } from '../validators/alert.validator.js'

const router = Router()

router.get('/', validate(listAlertsQuerySchema, 'query'), listPublic)

export default router
