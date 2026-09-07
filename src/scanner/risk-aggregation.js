const assessmentRank = {
  INSUFFICIENT_EVIDENCE: 0,
  NO_STRONG_WARNING_SIGNS: 0,
  CAUTION: 1,
  SUSPICIOUS: 2,
  STRONG_SCAM_INDICATORS: 3,
  UNABLE_TO_ASSESS: 0,
}

const higherAssessment = (first, second) => (
  assessmentRank[first] >= assessmentRank[second] ? first : second
)

const summarizeStrongMatch = (match) => ({
  caseId: match.payload?.caseId ?? null,
  title: match.payload?.title ?? 'Unknown scam case',
  riskLevel: match.payload?.riskLevel ?? 'UNKNOWN',
  score: match.score,
  evidenceStatus: match.evidenceStatus,
})

const aggregateRisk = ({ deterministicAssessment, aiMatches, retrievalStatus, config }) => {
  const likelyRelatedMatches = aiMatches.filter((match) => match.relation === 'LIKELY_RELATED')
  const highRiskMatches = likelyRelatedMatches.filter((match) => (
    config.highRiskLevels.includes(match.payload?.riskLevel)
  ))
  const verifiedStrongMatches = likelyRelatedMatches.filter((match) => (
    match.evidenceStatus === 'VERIFIED_KNOWLEDGE_BASE'
  ))

  let assessment = deterministicAssessment
  if (assessment === 'NO_STRONG_WARNING_SIGNS') {
    assessment = 'INSUFFICIENT_EVIDENCE'
  }

  if (retrievalStatus === 'AVAILABLE') {
    if (highRiskMatches.length >= config.strongMatchCountForStrongAssessment) {
      assessment = higherAssessment(assessment, 'STRONG_SCAM_INDICATORS')
    } else if (highRiskMatches.length > 0 || likelyRelatedMatches.length >= config.strongMatchCountForStrongAssessment) {
      assessment = higherAssessment(assessment, 'SUSPICIOUS')
    }
  }

  return {
    assessment,
    retrievalEvidence: {
      status: retrievalStatus,
      minimumScore: config.minimumScore,
      confidenceThreshold: config.confidenceThreshold,
      strongMatchCountForStrongAssessment: config.strongMatchCountForStrongAssessment,
      likelyRelatedCount: likelyRelatedMatches.length,
      contextualMatchCount: aiMatches.filter((match) => match.relation === 'CONTEXTUAL').length,
      highRiskLikelyRelatedCount: highRiskMatches.length,
      verifiedLikelyRelatedCount: verifiedStrongMatches.length,
      unverifiedLikelyRelatedCount: likelyRelatedMatches.length - verifiedStrongMatches.length,
      strongMatches: likelyRelatedMatches.map(summarizeStrongMatch),
    },
  }
}

export { aggregateRisk }
