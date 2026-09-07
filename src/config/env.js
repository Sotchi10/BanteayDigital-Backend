import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET
const aiMatchMinimumScore = Number(process.env.AI_MATCH_MIN_SCORE || 0.65)
const aiMatchConfidenceThreshold = Number(process.env.AI_MATCH_CONFIDENCE_THRESHOLD || 0.75)
const aiRetrievalStrongMatchCount = Number(process.env.AI_RETRIEVAL_STRONG_MATCH_COUNT || 2)
const aiRetrievalHighRiskLevels = (process.env.AI_RETRIEVAL_HIGH_RISK_LEVELS || 'HIGH,CRITICAL')
  .split(',')
  .map((level) => level.trim().toUpperCase())
  .filter(Boolean)

if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

if (!Number.isFinite(aiMatchMinimumScore) || aiMatchMinimumScore < 0 || aiMatchMinimumScore > 1) {
  throw new Error('AI_MATCH_MIN_SCORE must be a number between 0 and 1')
}

if (!Number.isFinite(aiMatchConfidenceThreshold) || aiMatchConfidenceThreshold < aiMatchMinimumScore || aiMatchConfidenceThreshold > 1) {
  throw new Error('AI_MATCH_CONFIDENCE_THRESHOLD must be between AI_MATCH_MIN_SCORE and 1')
}

if (!Number.isInteger(aiRetrievalStrongMatchCount) || aiRetrievalStrongMatchCount < 2) {
  throw new Error('AI_RETRIEVAL_STRONG_MATCH_COUNT must be an integer of at least 2')
}

if (!aiRetrievalHighRiskLevels.length) {
  throw new Error('AI_RETRIEVAL_HIGH_RISK_LEVELS must contain at least one risk level')
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
  aiRetrievalStrongMatchCount,
  aiRetrievalHighRiskLevels,
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default env
