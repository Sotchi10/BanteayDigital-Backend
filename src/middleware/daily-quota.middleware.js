import ApiError from '../utils/api-error.js'
import env from '../config/env.js'
import { consumeReportQuota, consumeScanQuota } from '../services/daily-quota.service.js'

const enforceScanQuota = async (request, _response, next) => {
  if (env.devBypassRateLimits) return next()

  try {
    await consumeScanQuota({
      userId: request.auth?.userId,
      ip: request.ip || request.socket.remoteAddress,
      isImage: request.is('multipart/form-data'),
    })
    return next()
  } catch (error) {
    return next(error)
  }
}

const blockGuestImageUploads = (request, _response, next) => {
  if (!request.auth && request.is('multipart/form-data')) {
    return next(new ApiError(403, 'Guest users must sign in before uploading images.'))
  }
  return next()
}

const enforceReportQuota = async (request, _response, next) => {
  if (env.devBypassRateLimits) return next()

  try {
    await consumeReportQuota({ userId: request.auth.userId })
    return next()
  } catch (error) {
    return next(error)
  }
}

export { blockGuestImageUploads, enforceReportQuota, enforceScanQuota }
