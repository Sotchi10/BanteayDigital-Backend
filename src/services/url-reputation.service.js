import env from '../config/env.js'

const emptyResult = (status) => ({ status, evidence: null })

const normalizedStats = (value = {}) => ({
  malicious: Math.max(0, Number(value.malicious) || 0),
  suspicious: Math.max(0, Number(value.suspicious) || 0),
  harmless: Math.max(0, Number(value.harmless) || 0),
  undetected: Math.max(0, Number(value.undetected) || 0),
  timeout: Math.max(0, Number(value.timeout) || 0),
})

const getUrlReputation = async (value) => {
  if (!env.virusTotalApiKey) return emptyResult('NOT_CONFIGURED')

  const urlId = Buffer.from(value).toString('base64url')
  let response
  try {
    response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': env.virusTotalApiKey },
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return emptyResult('UNAVAILABLE')
  }

  if (response.status === 404) return emptyResult('NOT_FOUND')
  if (!response.ok) return emptyResult('UNAVAILABLE')

  const payload = await response.json().catch(() => null)
  const attributes = payload?.data?.attributes
  if (!attributes) return emptyResult('UNAVAILABLE')

  const stats = normalizedStats(attributes.last_analysis_stats)
  if (Object.values(stats).every((count) => count === 0)) return emptyResult('NOT_FOUND')

  const detections = Object.entries(attributes.last_analysis_results || {})
    .filter(([, result]) => ['malicious', 'suspicious'].includes(result?.category))
    .slice(0, 50)
    .map(([engine, result]) => ({
      engine,
      category: result.category,
      result: typeof result.result === 'string' ? result.result.slice(0, 200) : null,
    }))

  return {
    status: 'AVAILABLE',
    evidence: {
      provider: 'VirusTotal',
      status: 'completed',
      analysisDate: Number.isInteger(attributes.last_analysis_date) ? attributes.last_analysis_date : null,
      stats,
      detections,
      finalUrl: typeof attributes.last_final_url === 'string' ? attributes.last_final_url : null,
      source: 'report',
    },
  }
}

export { getUrlReputation }
