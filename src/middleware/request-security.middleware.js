import env from '../config/env.js'
import ApiError from '../utils/api-error.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const allowedOrigins = new Set(env.clientOrigins)

const normalizeOrigin = (value) => {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true)
  return callback(new ApiError(403, 'Origin is not allowed'))
}

// CORS controls whether a browser can read a response, but it does not stop a
// cross-site request from reaching the API. Reject unsafe browser requests from
// untrusted origins before cookie authentication or route handlers run.
const enforceTrustedBrowserOrigin = (request, _response, next) => {
  if (SAFE_METHODS.has(request.method)) return next()

  const origin = normalizeOrigin(request.get('origin'))
  const requestOrigin = `${request.protocol}://${request.get('host')}`
  const fetchSite = request.get('sec-fetch-site')
  const hasSessionCookie = Boolean(request.cookies?.[env.authCookieName])
  if (!hasSessionCookie) return next()

  if (origin && (allowedOrigins.has(origin) || origin === requestOrigin)) return next()
  if (!origin && (!fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none')) {
    return next()
  }
  return next(new ApiError(403, 'Untrusted request origin'))
}

const setSecurityHeaders = (_request, response, next) => {
  response.set({
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'Cross-Origin-Resource-Policy': 'same-site',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })
  if (env.nodeEnv === 'production') {
    response.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

export { corsOrigin, enforceTrustedBrowserOrigin, setSecurityHeaders }
