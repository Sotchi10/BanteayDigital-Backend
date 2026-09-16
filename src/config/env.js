import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET
const nodeEnv = process.env.NODE_ENV || 'development'
const devBypassRateLimits = nodeEnv === 'development' && process.env.DEV_BYPASS_RATE_LIMITS === 'true'
const cookieSameSite = process.env.COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax')
const aiMatchMinimumScore = Number(process.env.AI_MATCH_MIN_SCORE || 0.65)
const aiMatchConfidenceThreshold = Number(process.env.AI_MATCH_CONFIDENCE_THRESHOLD || 0.75)
const dailyQuotaTimeZone = process.env.DAILY_QUOTA_TIME_ZONE || 'Asia/Bangkok'
const guestQuotaHashSecret = process.env.GUEST_QUOTA_HASH_SECRET || (nodeEnv === 'production' ? null : jwtSecret || 'development-only-guest-quota-secret')

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

if (!jwtSecret && nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

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

if (!guestQuotaHashSecret) {
  throw new Error('GUEST_QUOTA_HASH_SECRET must be set in production')
}

const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: jwtSecret || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv,
  devBypassRateLimits,
  cookieSameSite,
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
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default env
