import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests } from '../src/services/scan.service.js'
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
  assert.equal(body.scan.analysis.source, 'GEMINI_SIMPLE')
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
