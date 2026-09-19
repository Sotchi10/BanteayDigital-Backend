import { Router } from 'express'
import { create, listAdmin, publish, remove, update } from '../controllers/alert.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import {
  alertIdParamSchema,
  createAlertSchema,
  listAlertsQuerySchema,
  publishAlertSchema,
  updateAlertSchema,
} from '../validators/alert.validator.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))

router.get('/', validate(listAlertsQuerySchema, 'query'), listAdmin)
router.post('/', validate(createAlertSchema), create)
router.patch('/:id', validate({ params: alertIdParamSchema, body: updateAlertSchema }), update)
router.patch('/:id/publish', validate({ params: alertIdParamSchema, body: publishAlertSchema }), publish)
router.delete('/:id', validate(alertIdParamSchema, 'params'), remove)

export default router
