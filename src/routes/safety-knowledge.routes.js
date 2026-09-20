import { Router } from 'express'
import { getPublic, listPublic } from '../controllers/safety-knowledge.controller.js'
import validate from '../middleware/validate.middleware.js'
import { listSafetyKnowledgeQuerySchema, safetyKnowledgeLanguageQuerySchema, topicSlugParamSchema } from '../validators/safety-knowledge.validator.js'

const router = Router()

router.get('/', validate(listSafetyKnowledgeQuerySchema, 'query'), listPublic)
router.get('/:slug', validate({ params: topicSlugParamSchema, query: safetyKnowledgeLanguageQuerySchema }), getPublic)

export default router
