import { Router } from 'express'
import { getById, list } from '../controllers/community.controller.js'
import validate from '../middleware/validate.middleware.js'
import { listPostsQuerySchema, postIdParamSchema } from '../validators/community.validator.js'

const router = Router()
router.get('/', validate(listPostsQuerySchema, 'query'), list)
router.get('/:id', validate(postIdParamSchema, 'params'), getById)

export default router
