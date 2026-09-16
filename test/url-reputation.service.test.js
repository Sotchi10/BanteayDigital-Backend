import assert from 'node:assert/strict'
import test from 'node:test'
import env from '../src/config/env.js'
import { getUrlReputation } from '../src/services/url-reputation.service.js'

test('URL reputation normalizes a VirusTotal report', async (t) => {
  const originalKey = env.virusTotalApiKey
  const originalFetch = globalThis.fetch
  env.virusTotalApiKey = 'test-key'
  globalThis.fetch = async (address, options) => {
    assert.match(String(address), /^https:\/\/www\.virustotal\.com\/api\/v3\/urls\//)
    assert.equal(options.headers['x-apikey'], 'test-key')
    return Response.json({ data: { attributes: {
      last_analysis_date: 1700000000,
      last_analysis_stats: { malicious: 1, suspicious: 2, harmless: 20, undetected: 5, timeout: 0 },
      last_analysis_results: {
        Alpha: { category: 'malicious', result: 'phishing' },
        Beta: { category: 'harmless', result: 'clean' },
      },
    } } })
  }
  t.after(() => {
    env.virusTotalApiKey = originalKey
    globalThis.fetch = originalFetch
  })

  const result = await getUrlReputation('https://example.com/login')

  assert.equal(result.status, 'AVAILABLE')
  assert.equal(result.evidence.stats.malicious, 1)
  assert.deepEqual(result.evidence.detections, [{ engine: 'Alpha', category: 'malicious', result: 'phishing' }])
})
