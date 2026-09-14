import { Router } from 'express'
import { getPublic, listPublic } from '../controllers/safety-knowledge.controller.js'
import validate from '../middleware/validate.middleware.js'
import { listSafetyKnowledgeQuerySchema, topicSlugParamSchema } from '../validators/safety-knowledge.validator.js'

const router = Router()

router.get('/', validate(listSafetyKnowledgeQuerySchema, 'query'), listPublic)
router.get('/:slug', validate(topicSlugParamSchema, 'params'), getPublic)

export default router
