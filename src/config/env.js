import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET
const aiMatchMinimumScore = Number(process.env.AI_MATCH_MIN_SCORE || 0.65)
const aiMatchConfidenceThreshold = Number(process.env.AI_MATCH_CONFIDENCE_THRESHOLD || 0.75)

if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

if (!Number.isFinite(aiMatchMinimumScore) || aiMatchMinimumScore < 0 || aiMatchMinimumScore > 1) {
  throw new Error('AI_MATCH_MIN_SCORE must be a number between 0 and 1')
}

if (!Number.isFinite(aiMatchConfidenceThreshold) || aiMatchConfidenceThreshold < aiMatchMinimumScore || aiMatchConfidenceThreshold > 1) {
  throw new Error('AI_MATCH_CONFIDENCE_THRESHOLD must be between AI_MATCH_MIN_SCORE and 1')
}

const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: jwtSecret || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  aiServiceUrl: process.env.AI_SERVICE_URL || null,
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || null,
  aiMatchMinimumScore,
  aiMatchConfidenceThreshold,
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default env
