import { Router } from 'express'
import { create, getById, list, remove, update } from '../controllers/submission.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { createSubmissionSchema, listSubmissionsQuerySchema, submissionIdParamSchema, updateSubmissionSchema } from '../validators/submission.validator.js'

const router = Router()
router.use(requireAuth)
router.post('/', validate(createSubmissionSchema), create)
router.get('/', validate(listSubmissionsQuerySchema, 'query'), list)
router.get('/:id', validate(submissionIdParamSchema, 'params'), getById)
router.patch('/:id', validate({ params: submissionIdParamSchema, body: updateSubmissionSchema }), update)
router.delete('/:id', validate(submissionIdParamSchema, 'params'), remove)

export default router
