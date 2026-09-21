import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET
const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const devBypassRateLimits = nodeEnv === 'development' && process.env.DEV_BYPASS_RATE_LIMITS === 'true'
const enableScanQuota = process.env.ENABLE_SCAN_QUOTA === 'true'
const cookieSameSite = (process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase()
const aiMatchMinimumScore = Number(process.env.AI_MATCH_MIN_SCORE || 0.65)
const aiMatchConfidenceThreshold = Number(process.env.AI_MATCH_CONFIDENCE_THRESHOLD || 0.75)
const dailyQuotaTimeZone = process.env.DAILY_QUOTA_TIME_ZONE || 'Asia/Bangkok'
const guestQuotaHashSecret = process.env.GUEST_QUOTA_HASH_SECRET || (isProduction ? null : jwtSecret || 'development-only-guest-quota-secret')

const productionSecret = (name, value, minimumLength = 32) => {
  if (!isProduction) return
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} must be set to at least ${minimumLength} characters in production`)
  }
}

const parseClientOrigins = () => {
  const configured = process.env.CLIENT_ORIGINS
  if (isProduction && !configured) {
    throw new Error('CLIENT_ORIGINS must explicitly list the main and admin frontend origins in production')
  }

  const origins = (configured || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CLIENT_ORIGINS must contain explicit origins and cannot contain *')
  }

  for (const origin of origins) {
    let parsed
    try {
      parsed = new URL(origin)
    } catch {
      throw new Error(`CLIENT_ORIGINS contains an invalid origin: ${origin}`)
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password) {
      throw new Error(`CLIENT_ORIGINS entries must be plain http(s) origins without paths or credentials: ${origin}`)
    }
    if (isProduction && parsed.protocol !== 'https:') {
      throw new Error(`CLIENT_ORIGINS must use HTTPS in production: ${origin}`)
    }
  }

  return [...new Set(origins)]
}

const parseTrustProxy = () => {
  const value = process.env.TRUST_PROXY?.trim()
  if (!value || value === 'false') return false
  if (value === 'true') return true
  if (/^\d+$/.test(value)) return Number(value)
  throw new Error('TRUST_PROXY must be true, false, or a non-negative proxy hop count')
}

const positiveInteger = (name, fallback) => {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

const authRateLimitWindowMs = positiveInteger('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)
const aiRateLimitWindowMs = positiveInteger('AI_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)
const uploadRateLimitWindowMs = positiveInteger('UPLOAD_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)
const reportRateLimitWindowMs = positiveInteger('REPORT_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)

productionSecret('JWT_SECRET', jwtSecret, 32)
productionSecret('GUEST_QUOTA_HASH_SECRET', guestQuotaHashSecret, 32)
productionSecret('AI_SERVICE_API_KEY', process.env.AI_SERVICE_API_KEY, 32)

if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be lax, strict, or none')
}

if (!Number.isFinite(aiMatchMinimumScore) || aiMatchMinimumScore < 0 || aiMatchMinimumScore > 1) {
  throw new Error('AI_MATCH_MIN_SCORE must be a number between 0 and 1')
}

if (!Number.isFinite(aiMatchConfidenceThreshold) || aiMatchConfidenceThreshold < aiMatchMinimumScore || aiMatchConfidenceThreshold > 1) {
  throw new Error('AI_MATCH_CONFIDENCE_THRESHOLD must be between AI_MATCH_MIN_SCORE and 1')
}

try {
  Intl.DateTimeFormat('en-US', { timeZone: dailyQuotaTimeZone })
} catch {
  throw new Error('DAILY_QUOTA_TIME_ZONE must be a valid IANA time zone')
}

const clientOrigins = parseClientOrigins()

const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: jwtSecret || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'banteay-digital-backend',
  jwtAudience: process.env.JWT_AUDIENCE || 'banteay-digital-clients',
  nodeEnv,
  devBypassRateLimits,
  enableScanQuota,
  cookieSameSite,
  authCookieName: isProduction ? '__Host-banteay_token' : 'token',
  trustProxy: parseTrustProxy(),
  enableApiDocs: process.env.ENABLE_API_DOCS === 'true' || !isProduction,
  enableLocalOcr: process.env.ENABLE_LOCAL_OCR === 'true' || !isProduction,
  aiServiceUrl: process.env.AI_SERVICE_URL || null,
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || null,
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY || null,
  supabaseUrl: process.env.SUPABASE_URL || null,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || null,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || null,
  aiMatchMinimumScore,
  aiMatchConfidenceThreshold,
  dailyQuotaTimeZone,
  guestQuotaHashSecret,
  authRateLimitWindowMs,
  authRateLimitMax: positiveInteger('AUTH_RATE_LIMIT_MAX', 10),
  aiRateLimitWindowMs,
  aiRateLimitMax: positiveInteger('AI_RATE_LIMIT_MAX', 20),
  uploadRateLimitWindowMs,
  uploadRateLimitMax: positiveInteger('UPLOAD_RATE_LIMIT_MAX', 10),
  reportRateLimitWindowMs,
  reportRateLimitMax: positiveInteger('REPORT_RATE_LIMIT_MAX', 60),
  clientOrigins,
}

export default env
