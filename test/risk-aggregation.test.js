import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateRisk } from '../src/scanner/risk-aggregation.js'

const config = {
  minimumScore: 0.65,
  confidenceThreshold: 0.75,
  strongMatchCountForStrongAssessment: 2,
  highRiskLevels: ['HIGH', 'CRITICAL'],
}

const match = ({ score = 0.9, riskLevel = 'HIGH', verified = false } = {}) => ({
  score,
  relation: 'LIKELY_RELATED',
  evidenceStatus: verified ? 'VERIFIED_KNOWLEDGE_BASE' : 'UNVERIFIED_REFERENCE',
  payload: { caseId: 1, title: 'Fake job recruitment', riskLevel },
})

const aggregate = ({ deterministicAssessment = 'NO_STRONG_WARNING_SIGNS', aiMatches = [], retrievalStatus = 'AVAILABLE' } = {}) => (
  aggregateRisk({ deterministicAssessment, aiMatches, retrievalStatus, config })
)

test('raises a no-finding scan to suspicious for one strong high-risk job-scam match', () => {
  const result = aggregate({ aiMatches: [match()] })

  assert.equal(result.assessment, 'SUSPICIOUS')
  assert.equal(result.retrievalEvidence.highRiskLikelyRelatedCount, 1)
  assert.equal(result.retrievalEvidence.unverifiedLikelyRelatedCount, 1)
})

test('keeps strong deterministic findings strong when retrieval is weak', () => {
  const result = aggregate({
    deterministicAssessment: 'STRONG_SCAM_INDICATORS',
    aiMatches: [{ ...match(), score: 0.7, relation: 'CONTEXTUAL' }],
  })

  assert.equal(result.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(result.retrievalEvidence.likelyRelatedCount, 0)
})

test('uses insufficient evidence for unrelated normal text', () => {
  const result = aggregate({
    aiMatches: [{ ...match(), score: 0.7, relation: 'CONTEXTUAL' }],
  })

  assert.equal(result.assessment, 'INSUFFICIENT_EVIDENCE')
})

test('raises the assessment for multiple strong high-risk matches', () => {
  const result = aggregate({ aiMatches: [match(), match({ riskLevel: 'CRITICAL', verified: true })] })

  assert.equal(result.assessment, 'STRONG_SCAM_INDICATORS')
  assert.equal(result.retrievalEvidence.verifiedLikelyRelatedCount, 1)
})

test('uses insufficient evidence when retrieval is unavailable and there are no findings', () => {
  const result = aggregate({ retrievalStatus: 'UNAVAILABLE' })

  assert.equal(result.assessment, 'INSUFFICIENT_EVIDENCE')
  assert.equal(result.retrievalEvidence.status, 'UNAVAILABLE')
})
