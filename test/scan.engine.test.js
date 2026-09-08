import assert from 'node:assert/strict'
import test from 'node:test'
import { runScan } from '../src/scanner/scan.engine.js'

test('flags an OTP request in Khmer text', () => {
  const result = runScan({ type: 'TEXT', value: 'គណនីរបស់អ្នកនឹងត្រូវផ្អាក។ សូមផ្ញើលេខកូដ OTP ភ្លាមៗ។' })
  assert.equal(result.deterministicAssessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(result.score, 65)
  assert.ok(result.findings.some((item) => item.code === 'OTP_OR_VERIFICATION_CODE_REQUEST'))
})

test('combines transparent text-based scam signals', () => {
  const result = runScan({ type: 'TEXT', value: 'Urgent: send your OTP and transfer money now or your account will be locked.' })
  assert.equal(result.deterministicAssessment, 'STRONG_SCAM_INDICATORS')
  assert.deepEqual(result.findings.map((item) => item.code), [
    'OTP_OR_VERIFICATION_CODE_REQUEST', 'URGENCY_OR_ACCOUNT_THREAT', 'PAYMENT_REQUEST',
    'COERCED_SENSITIVE_INFORMATION_REQUEST', 'COERCED_PAYMENT_REQUEST',
  ])
})

test('applies URL safety checks to a link embedded in text', () => {
  const result = runScan({ type: 'TEXT', value: 'Open http://192.0.2.1/login to verify your account.' })
  assert.deepEqual(result.findings.map((item) => item.code), ['INSECURE_HTTP', 'IP_ADDRESS_HOST'])
})

test('retains objective URL structure checks', () => {
  const result = runScan({ type: 'URL', value: 'http://192.0.2.1/login' })
  assert.equal(result.deterministicAssessment, 'SUSPICIOUS')
  assert.deepEqual(result.findings.map((item) => item.code), ['INSECURE_HTTP', 'IP_ADDRESS_HOST'])
})

test('detects layered impersonation, pressure, and credential theft', () => {
  const result = runScan({ type: 'TEXT', value: 'This is your bank. Act now: provide your password or your account will be suspended.' })
  assert.equal(result.deterministicAssessment, 'STRONG_SCAM_INDICATORS')
  assert.ok(result.findings.some((item) => item.code === 'IMPERSONATION_WITH_HIGH_RISK_REQUEST'))
  assert.ok(result.findings.some((item) => item.code === 'COERCED_SENSITIVE_INFORMATION_REQUEST'))
})

test('recognizes common investment, task, remote-access, and extortion patterns', () => {
  const investment = runScan({ type: 'TEXT', value: 'Earn guaranteed daily profit by completing review tasks for commission.' })
  const remote = runScan({ type: 'TEXT', value: 'Install AnyDesk now so support can access your phone.' })
  const extortion = runScan({ type: 'TEXT', value: 'Send bitcoin or we will publish your private video.' })
  assert.ok(investment.findings.some((item) => item.code === 'INVESTMENT_OR_TASK_SCAM_PATTERN'))
  assert.ok(remote.findings.some((item) => item.code === 'REMOTE_ACCESS_OR_MALWARE_REQUEST'))
  assert.ok(extortion.findings.some((item) => item.code === 'BLACKMAIL_OR_EXTORTION_THREAT'))
})

test('normalizes zero-width and simple leetspeak obfuscation', () => {
  const result = runScan({ type: 'TEXT', value: 'S\u200bend your 0TP immediately.' })
  assert.ok(result.findings.some((item) => item.code === 'OTP_OR_VERIFICATION_CODE_REQUEST'))
})

test('applies administrator-managed knowledge rules as explainable findings', () => {
  const result = runScan({
    type: 'TEXT',
    value: 'Your parcel is held; pay the customs fee before delivery.',
    knowledgeRules: [{
      code: 'PARCEL_FEE_SCAM', title: 'Parcel fee scam',
      description: 'A delivery fee is requested before a parcel can be released.',
      severity: 'SUSPICIOUS', weight: 25, matchTerms: ['customs fee', 'parcel is held'], enabled: true,
    }],
  })

  assert.ok(result.findings.some((item) => item.code === 'PARCEL_FEE_SCAM'))
  assert.equal(result.deterministicAssessment, 'SUSPICIOUS')
})

test('does not treat clear safety advice as an OTP or credential request', () => {
  const result = runScan({ type: 'TEXT', value: 'Security reminder: never share your OTP, password, or PIN with anyone.' })

  assert.equal(result.deterministicAssessment, 'INSUFFICIENT_EVIDENCE')
  assert.deepEqual(result.findings, [])
})

test('does not double-score a knowledge rule that uses a built-in rule code', () => {
  const result = runScan({
    type: 'TEXT', value: 'Urgent: send your OTP now.',
    knowledgeRules: [{ code: 'OTP_OR_VERIFICATION_CODE_REQUEST', description: 'Duplicate', severity: 'SUSPICIOUS', weight: 50, matchTerms: ['send your otp'], enabled: true }],
  })

  assert.equal(result.findings.filter((item) => item.code === 'OTP_OR_VERIFICATION_CODE_REQUEST').length, 1)
})
