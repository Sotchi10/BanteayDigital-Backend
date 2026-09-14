import { Router } from 'express'
import { login, logout, me, register, updateProfile } from '../controllers/auth.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.validator.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile)
router.post('/logout', requireAuth, logout)

export default router
