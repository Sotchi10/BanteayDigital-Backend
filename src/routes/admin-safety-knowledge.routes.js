import { Router } from 'express'
import { create, getAdmin, listAdmin, publish, remove, update } from '../controllers/safety-knowledge.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { createSafetyKnowledgeSchema, listSafetyKnowledgeQuerySchema, publishSafetyKnowledgeSchema, topicIdParamSchema, updateSafetyKnowledgeSchema } from '../validators/safety-knowledge.validator.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))

router.get('/', validate(listSafetyKnowledgeQuerySchema, 'query'), listAdmin)
router.post('/', validate(createSafetyKnowledgeSchema), create)
router.get('/:id', validate(topicIdParamSchema, 'params'), getAdmin)
router.patch('/:id', validate({ params: topicIdParamSchema, body: updateSafetyKnowledgeSchema }), update)
router.patch('/:id/publish', validate({ params: topicIdParamSchema, body: publishSafetyKnowledgeSchema }), publish)
router.delete('/:id', validate(topicIdParamSchema, 'params'), remove)

export default router
