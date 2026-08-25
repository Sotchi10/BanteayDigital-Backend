import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import ApiError from '../utils/api-error.js'
import prisma from '../config/database.js'

const extractToken = (request) => {
  const authorization = request.get('authorization')
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  return request.cookies.token || bearerToken
}

const requireAuth = async (request, _response, next) => {
  const token = extractToken(request)

  if (!token) {
    return next(new ApiError(401, 'Authentication is required'))
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true, role: true, status: true },
    })

    if (!user || payload.tokenVersion !== user.tokenVersion) {
      return next(new ApiError(401, 'Authentication token has been revoked'))
    }

    if (user.status === 'BANNED') {
      return next(new ApiError(403, 'Your account has been banned due to security violations'))
    }

    if (user.status === 'SUSPENDED') {
      return next(new ApiError(403, 'Your account has been temporarily suspended'))
    }

    request.auth = {
      userId: user.id,
      role: user.role,
      status: user.status,
    }

    return next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired authentication token'))
  }
}

/**
 * Optional authentication middleware for endpoints accessible to both
 * guests and logged-in users (e.g., instant scans or public feeds).
 */
const optionalAuth = async (request, _response, next) => {
  const token = extractToken(request)

  if (!token) {
    return next()
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true, role: true, status: true },
    })

    if (user && payload.tokenVersion === user.tokenVersion && user.status === 'ACTIVE') {
      request.auth = {
        userId: user.id,
        role: user.role,
        status: user.status,
      }
    }
  } catch {
    // If optional auth token is invalid, continue as unauthenticated guest
  }

  return next()
}

export default requireAuth
export { optionalAuth, requireAuth }
