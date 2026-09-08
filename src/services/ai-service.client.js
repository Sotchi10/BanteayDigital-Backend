import env from '../config/env.js'
import ApiError from '../utils/api-error.js'

const getAiServiceHealth = async () => {
  if (!env.aiServiceUrl) {
    throw new ApiError(503, 'AI service is not configured')
  }

  let response
  try {
    const healthUrl = new URL('/health', env.aiServiceUrl)
    response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
  } catch {
    throw new ApiError(503, 'AI service is unavailable')
  }

  if (!response.ok) {
    throw new ApiError(503, 'AI service health check failed')
  }

  const health = await response.json()
  if (health.status !== 'ok') {
    throw new ApiError(503, 'AI service reported an unhealthy status')
  }

  return health
}

const retrieveSimilarScamCases = async ({ type, value, limit = 3 }) => {
  if (!env.aiServiceUrl) {
    throw new ApiError(503, 'AI service is not configured')
  }

  let response
  try {
    const retrieveUrl = new URL('/api/v1/retrieve', env.aiServiceUrl)
    response = await fetch(retrieveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.aiServiceApiKey ? { 'X-AI-Service-Key': env.aiServiceApiKey } : {}),
      },
      body: JSON.stringify({ type, value, limit }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new ApiError(503, 'AI retrieval service is unavailable')
  }

  if (!response.ok) {
    throw new ApiError(503, 'AI retrieval request failed')
  }

  return response.json()
}

const analyzeScan = async ({ type, value, deterministicFindings, retrievedCases }) => {
  if (!env.aiServiceUrl) {
    throw new ApiError(503, 'AI service is not configured')
  }

  let response
  try {
    const analyzeUrl = new URL('/api/v1/analyze', env.aiServiceUrl)
    response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.aiServiceApiKey ? { 'X-AI-Service-Key': env.aiServiceApiKey } : {}),
      },
      body: JSON.stringify({ type, value, deterministicFindings, retrievedCases }),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError(503, 'AI analysis service is unavailable')
  }

  if (!response.ok) {
    throw new ApiError(503, 'AI analysis request failed')
  }

  return response.json()
}

const indexScamCase = async (caseId) => {
  if (!env.aiServiceUrl) throw new ApiError(503, 'AI service is not configured')

  let response
  try {
    const indexUrl = new URL(`/api/v1/index/scam-cases/${caseId}`, env.aiServiceUrl)
    response = await fetch(indexUrl, {
      method: 'POST',
      headers: env.aiServiceApiKey ? { 'X-AI-Service-Key': env.aiServiceApiKey } : {},
      signal: AbortSignal.timeout(30000),
    })
  } catch {
    throw new ApiError(503, 'AI indexing service is unavailable')
  }

  if (!response.ok) throw new ApiError(503, 'AI indexing request failed')
  return response.json()
}

export { analyzeScan, getAiServiceHealth, indexScamCase, retrieveSimilarScamCases }
