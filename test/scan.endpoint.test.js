import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests, setUrlReputationProviderForTests } from '../src/services/scan.service.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { signToken } from '../src/utils/auth.js'

test('POST /api/v1/scans validates, scans, saves, and returns a result', async (t) => {
  const saved = []
  let analyzerLanguage
  setScanRepositoryForTests({
    scamCase: { findMany: async () => [] },
    scan: { create: async ({ data, select }) => {
      const record = { id: 'scan-1', createdAt: new Date('2026-08-28T00:00:00.000Z'), scamCaseMatches: [], ...data }
      saved.push(record)
      return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
    } },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({
    matches: [
      { id: 'case-1', score: 0.98, payload: { kind: 'scam_case', title: 'OTP scam', riskLevel: 'HIGH', verified: false } },
      { id: 'case-2', score: 0.70, payload: { kind: 'scam_case', title: 'Prize scam', riskLevel: 'HIGH', verified: false } },
      { id: 'case-3', score: 0.60, payload: { kind: 'scam_case', title: 'Unrelated case' } },
    ],
  }))
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async ({ language }) => {
    analyzerLanguage = language
    return {
      riskLevel: 'CRITICAL', confidenceScore: 0.94,
      assessment: 'SUSPICIOUS',
      summary: 'The message requests an OTP and resembles a retrieved case.',
      reasons: ['It requests an OTP.'],
      recommendedActions: ['Do not share your OTP.'],
      citedCaseIds: [1],
    }
  })
  t.after(() => setAiAnalyzerForTests())
  setAuthRepositoryForTests({
    user: { findUnique: async () => ({ id: 'user-1', tokenVersion: 0, role: 'USER', status: 'ACTIVE' }) },
  })
  t.after(() => setAuthRepositoryForTests())

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/scans`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${signToken('user-1', 0)}` },
    body: JSON.stringify({ type: 'TEXT', value: 'Urgent: please send your OTP now.', language: 'km' }),
  })
  const body = await response.json()

  assert.equal(response.status, 201)
  assert.equal(body.scan.id, 'scan-1')
  assert.equal(body.scan.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(body.scan.deterministicAssessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(body.scan.score, 65)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].inputType, 'TEXT')
  assert.equal(saved[0].userId, 'user-1')
  assert.equal(analyzerLanguage, 'km')
  assert.ok(Array.isArray(body.scan.recommendations))
  assert.deepEqual(body.scan.matchedScamCases, [])
  assert.deepEqual(body.scan.aiMatches, [
    { id: 'case-1', score: 0.98, payload: { kind: 'scam_case', title: 'OTP scam', riskLevel: 'HIGH', verified: false }, relation: 'LIKELY_RELATED', evidenceStatus: 'UNVERIFIED_REFERENCE' },
    { id: 'case-2', score: 0.70, payload: { kind: 'scam_case', title: 'Prize scam', riskLevel: 'HIGH', verified: false }, relation: 'CONTEXTUAL', evidenceStatus: 'UNVERIFIED_REFERENCE' },
  ])
  assert.equal(body.scan.analysis.source, 'GEMINI_INDEPENDENT')
  assert.equal(body.scan.analysis.riskLevel, 'CRITICAL')
  assert.equal(body.scan.analysis.confidenceScore, 0.94)
  assert.deepEqual(body.scan.analysis.citedCaseIds, [])
})

test('TEXT scanning retains deterministic warnings when retrieval and AI fail', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-fallback', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => { throw new Error('Qdrant unavailable') })
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => { throw new Error('AI unavailable') })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'TEXT', value: 'Urgent: send your OTP now.' })

  assert.equal(scan.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(scan.analysis.source, 'DETERMINISTIC_FALLBACK')
  assert.equal(scan.aiRetrieval.status, 'UNAVAILABLE')
  assert.ok(scan.findings.some((item) => item.code === 'OTP_OR_VERIFICATION_CODE_REQUEST'))
})

test('Khmer scans retain Khmer warnings and safety recommendations when AI is unavailable', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-khmer-fallback', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => { throw new Error('Qdrant unavailable') })
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => { throw new Error('AI unavailable') })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'TEXT', value: 'Urgent: send your OTP now.', language: 'km' })

  assert.match(scan.analysis.summary, /[\u1780-\u17ff]/)
  assert.ok(scan.analysis.reasons.every((reason) => /[\u1780-\u17ff]/.test(reason)))
  assert.ok(scan.analysis.recommendedActions.every((action) => /[\u1780-\u17ff]/.test(action)))
})

test('TEXT scanning calls AI even when rules and retrieval find no evidence', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-ai-only', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  let analyzerCalls = 0
  setAiAnalyzerForTests(async ({ deterministicFindings, retrievedCases, retrievalStatus, topSimilarity }) => {
    analyzerCalls++
    assert.deepEqual(deterministicFindings, [])
    assert.deepEqual(retrievedCases, [])
    assert.equal(retrievalStatus, 'AVAILABLE')
    assert.equal(topSimilarity, null)
    return {
      riskLevel: 'MEDIUM', confidenceScore: 0.82,
      assessment: 'CAUTION', evidenceSufficiency: 'SUFFICIENT',
      riskSignals: [{ category: 'SOCIAL_ENGINEERING', severity: 'CAUTION', evidence: 'this offer', message: 'The offer needs independent verification.' }],
      summary: 'Verify this offer before responding.', recommendedActions: ['Verify the sender.'],
    }
  })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'TEXT', value: 'Please contact me about this offer.' })

  assert.equal(analyzerCalls, 1)
  assert.equal(scan.assessment, 'CAUTION')
  assert.equal(scan.analysis.source, 'GEMINI_INDEPENDENT')
  assert.equal(scan.analysis.riskLevel, 'MEDIUM')
  assert.equal(scan.analysis.confidenceScore, 0.82)
})

test('validated critical AI signals protect novel scams from a low-risk verdict', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-novel', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => ({
    riskLevel: 'CRITICAL', confidenceScore: 0.91,
    assessment: 'NO_STRONG_WARNING_SIGNS',
    evidenceSufficiency: 'SUFFICIENT',
    riskSignals: [{
      category: 'PAYMENT_OR_ASSET_TRANSFER', severity: 'CRITICAL',
      evidence: 'convert the balance into game credits',
      message: 'The sender requests an irreversible transfer of value.',
    }],
    summary: 'The request could cause financial loss.',
    recommendedActions: ['Do not transfer the balance.'],
  }))
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({
    userId: 'user-1', type: 'TEXT',
    value: 'For account migration, convert the balance into game credits and send the redemption string.',
  })

  assert.equal(scan.deterministicAssessment, 'INSUFFICIENT_EVIDENCE')
  assert.equal(scan.aiRetrieval.matches.length, 0)
  assert.equal(scan.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(scan.analysis.riskSignals.length, 1)
  assert.equal(scan.analysis.riskSignals[0].severity, 'CRITICAL')
})

test('unsupported AI signal quotes cannot raise risk and ambiguity cannot become low risk', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-ambiguous', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => ({
    riskLevel: 'LOW', confidenceScore: 0.88,
    assessment: 'NO_STRONG_WARNING_SIGNS',
    evidenceSufficiency: 'AMBIGUOUS',
    riskSignals: [{
      category: 'CREDENTIAL_THEFT', severity: 'CRITICAL', evidence: 'share your password',
      message: 'The message asks for a password.',
    }],
    summary: 'There is not enough context.',
    recommendedActions: ['Verify the sender.'],
  }))
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'TEXT', value: 'Can you complete the process today?' })

  assert.equal(scan.assessment, 'INSUFFICIENT_EVIDENCE')
  assert.deepEqual(scan.analysis.riskSignals, [])
  assert.equal(scan.analysis.evidenceSufficiency, 'AMBIGUOUS')
})

test('URL reputation evidence reaches AI and cannot be downgraded', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-url', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  const evidence = {
    provider: 'VirusTotal', status: 'completed', analysisDate: 1700000000,
    stats: { malicious: 2, suspicious: 0, harmless: 40, undetected: 10, timeout: 0 },
    detections: [{ engine: 'Example', category: 'malicious', result: 'phishing' }],
    finalUrl: null, source: 'report',
  }
  setUrlReputationProviderForTests(async () => ({ status: 'AVAILABLE', evidence }))
  t.after(() => setUrlReputationProviderForTests())
  setAiAnalyzerForTests(async (request) => {
    assert.deepEqual(request.urlEvidence, evidence)
    return { riskLevel: 'LOW', confidenceScore: 0.9, assessment: 'NO_STRONG_WARNING_SIGNS', evidenceSufficiency: 'SUFFICIENT', riskSignals: [], summary: 'No warning signs.', recommendedActions: ['Proceed carefully.'] }
  })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'URL', value: 'https://example.com/login' })

  assert.equal(scan.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(scan.aiRetrieval.urlReputation.status, 'AVAILABLE')
})

test('no Qdrant match uses the independent AI risk level and confidence', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-independent', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async ({ retrievedCases, topSimilarity }) => {
    assert.deepEqual(retrievedCases, [])
    assert.equal(topSimilarity, null)
    return {
      riskLevel: 'HIGH', confidenceScore: 0.87,
      assessment: 'INSUFFICIENT_EVIDENCE', evidenceSufficiency: 'SUFFICIENT',
      riskSignals: [],
      summary: 'This request could compromise the account even though it does not match a known case.',
      recommendedActions: ['Do not provide the private phrase.', 'Verify the request through the official service.'],
    }
  })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({
    userId: 'user-1', type: 'TEXT',
    value: 'Complete the migration by sending your private activation phrase to this chat.',
  })

  assert.equal(scan.assessment, 'SUSPICIOUS')
  assert.equal(scan.analysis.riskLevel, 'HIGH')
  assert.equal(scan.analysis.confidenceScore, 0.87)
  assert.equal(scan.analysis.source, 'GEMINI_INDEPENDENT')
  assert.match(scan.analysis.summary, /does not match a known case/)
  assert.deepEqual(scan.analysis.reasons, [scan.analysis.summary])
  assert.equal(scan.analysis.recommendedActions.length, 2)
})

test('URL reputation evidence remains a safety floor when AI is unavailable', async (t) => {
  setScanRepositoryForTests({
    scan: {
      create: async ({ data, select }) => {
        const record = { id: 'scan-url-fallback', createdAt: new Date(), scamCaseMatches: [], ...data }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  setUrlReputationProviderForTests(async () => ({
    status: 'AVAILABLE',
    evidence: {
      provider: 'VirusTotal', status: 'completed', analysisDate: 1700000000,
      stats: { malicious: 1, suspicious: 0, harmless: 20, undetected: 5, timeout: 0 },
      detections: [{ engine: 'Example', category: 'malicious', result: 'phishing' }],
      finalUrl: null, source: 'report',
    },
  }))
  t.after(() => setUrlReputationProviderForTests())
  setAiAnalyzerForTests(async () => { throw new Error('AI unavailable') })
  t.after(() => setAiAnalyzerForTests())

  const { createScan } = await import('../src/services/scan.service.js')
  const scan = await createScan({ userId: 'user-1', type: 'URL', value: 'https://example.com/login' })

  assert.equal(scan.assessment, 'SUSPICIOUS')
  assert.equal(scan.analysis.source, 'DETERMINISTIC_FALLBACK')
})
