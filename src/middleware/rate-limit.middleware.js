import env from '../config/env.js'

const createRateLimiter = ({ windowMs, max, message = 'Too many requests. Please try again later.', bypass = env.devBypassRateLimits }) => {
  const requests = new Map()

  return (request, response, next) => {
    if (bypass) return next()

    const now = Date.now()
    const key = request.ip || request.socket.remoteAddress || 'unknown'
    const entry = requests.get(key)

    if (!entry || now >= entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      response.set('Retry-After', String(retryAfterSeconds))
      return response.status(429).json({ message })
    }

    entry.count += 1
    return next()
  }
}

export { createRateLimiter }
