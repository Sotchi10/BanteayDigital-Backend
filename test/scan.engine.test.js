import assert from 'node:assert/strict'
import test from 'node:test'
import { assess, recommendationsFor, runScan } from '../src/scanner/scan.engine.js'

test('detects explainable suspicious text while ordinary text has no strong warning signs', () => {
  const suspicious = runScan({ type: 'TEXT', value: 'Urgent: please send your OTP now.' })
  const legitimate = runScan({ type: 'TEXT', value: 'Your library book is due next Tuesday. You can renew it online.' })

  assert.equal(suspicious.assessment, 'SUSPICIOUS')
  assert.deepEqual(suspicious.findings.map((item) => item.code), ['URGENCY_LANGUAGE', 'CREDENTIAL_REQUEST'])
  assert.equal(legitimate.assessment, 'NO_STRONG_WARNING_SIGNS')
  assert.deepEqual(legitimate.findings, [])
})

test('treats a monetary prize claim as a caution, not proof of a scam', () => {
  const result = runScan({ type: 'TEXT', value: 'ABA win $1000' })

  assert.equal(result.assessment, 'CAUTION')
  assert.equal(result.score, 15)
  assert.deepEqual(result.findings.map((item) => item.code), ['PRIZE_OR_REWARD_CLAIM'])
})

test('detects suspicious URLs while ordinary HTTPS URLs have no strong warning signs', () => {
  const suspicious = runScan({ type: 'URL', value: 'http://192.0.2.1/login' })
  const legitimate = runScan({ type: 'URL', value: 'https://www.example.org/about' })

  assert.equal(suspicious.assessment, 'SUSPICIOUS')
  assert.deepEqual(suspicious.findings.map((item) => item.code), ['INSECURE_HTTP', 'IP_ADDRESS_HOST', 'SENSITIVE_ACTION_IN_URL'])
  assert.equal(legitimate.assessment, 'NO_STRONG_WARNING_SIGNS')
})

test('compares scans with curated scam cases and returns explainable case matches', () => {
  const scamCase = {
    id: 1,
    title: 'Fake ABA Account Suspension',
    scamType: 'phishing',
    description: 'A fake account suspension message.',
    sampleText: 'Dear customer, your ABA account has been temporarily suspended due to unusual activity. Please verify your account immediately at https://aba-secure-check.example',
    indicators: ['bank impersonation', 'urgency'],
    riskLevel: 'HIGH',
  }
  const result = runScan({ type: 'TEXT', value: scamCase.sampleText, scamCases: [scamCase] })

  assert.equal(result.matchedScamCases.length, 1)
  assert.equal(result.matchedScamCases[0].scamCaseId, 1)
  assert.equal(result.matchedScamCases[0].similarity, 100)
  assert.ok(result.findings.some((item) => item.code === 'SCAM_CASE_MATCH'))
})

test('assessment thresholds and recommendations stay deterministic', () => {
  assert.equal(assess([], 'value'), 'NO_STRONG_WARNING_SIGNS')
  assert.equal(assess([{ weight: 10 }], 'value'), 'CAUTION')
  assert.equal(assess([{ weight: 35 }], 'value'), 'SUSPICIOUS')
  assert.equal(assess([{ weight: 70 }], 'value'), 'STRONG_SCAM_INDICATORS')
  assert.equal(assess([], ''), 'UNABLE_TO_ASSESS')
  assert.match(recommendationsFor('NO_STRONG_WARNING_SIGNS')[0], /No strong warning signs/)
  assert.match(recommendationsFor('STRONG_SCAM_INDICATORS')[0], /Avoid interacting/)
})
