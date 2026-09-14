import { Router } from 'express'
import { getByUsername } from '../controllers/public-profile.controller.js'
import validate from '../middleware/validate.middleware.js'
import { z } from 'zod'

const router = Router()
const usernameParamSchema = z.object({ username: z.string().trim().min(1).max(191) })

router.get('/:username', validate(usernameParamSchema, 'params'), getByUsername)

export default router
