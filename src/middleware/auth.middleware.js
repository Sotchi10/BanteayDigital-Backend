import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import ApiError from '../utils/api-error.js'
import prisma from '../config/database.js'

const requireAuth = async (request, _response, next) => {
  const authorization = request.get('authorization')
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  const token = request.cookies.token || bearerToken

  if (!token) {
    return next(new ApiError(401, 'Authentication is required'))
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    })

    if (!user || payload.tokenVersion !== user.tokenVersion) {
      return next(new ApiError(401, 'Authentication token has been revoked'))
    }

    request.auth = { userId: payload.sub }
    return next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired authentication token'))
  }
}

export default requireAuth
