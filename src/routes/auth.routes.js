import { Router } from 'express'
import { login, logout, me, register, updateProfile } from '../controllers/auth.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.validator.js'
import env from '../config/env.js'
import { createRateLimiter } from '../middleware/rate-limit.middleware.js'

const router = Router()
const authRateLimiter = createRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  message: 'Too many authentication attempts. Please try again later.',
})

router.post('/register', authRateLimiter, validate(registerSchema), register)
router.post('/login', authRateLimiter, validate(loginSchema), login)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile)
router.post('/logout', requireAuth, logout)

export default router
