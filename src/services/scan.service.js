import prisma from '../config/database.js'
import env from '../config/env.js'
import { aggregateRisk } from '../scanner/risk-aggregation.js'
import { recommendationsFor, runScan } from '../scanner/scan.engine.js'
import { retrieveSimilarScamCases } from './ai-service.client.js'
import ApiError from '../utils/api-error.js'

let scanRepository = prisma
let aiRetriever = retrieveSimilarScamCases

const scanSelect = {
  id: true, userId: true, inputType: true, rawInput: true, normalizedInput: true,
  findings: true, assessment: true, deterministicAssessment: true, score: true, analysisSummary: true, retrievalEvidence: true, createdAt: true,
  scamCaseMatches: { select: { similarity: true, matchReason: true, scamCase: { select: { id: true, title: true, scamType: true, riskLevel: true } } } },
}

const emptyAiRetrieval = {
  status: 'NOT_REQUESTED',
  minimumScore: env.aiMatchMinimumScore,
  confidenceThreshold: env.aiMatchConfidenceThreshold,
  likelyRelatedCount: 0,
  contextualMatchCount: 0,
  highRiskLikelyRelatedCount: 0,
  verifiedLikelyRelatedCount: 0,
  unverifiedLikelyRelatedCount: 0,
  strongMatches: [],
}

const serializeScan = ({ scamCaseMatches, retrievalEvidence, ...scan }, recommendations = [], aiMatches = [], aiRetrieval = retrievalEvidence || emptyAiRetrieval) => ({
  ...scan,
  matchedScamCases: scamCaseMatches.map(({ scamCase, similarity, matchReason }) => ({ ...scamCase, similarity, matchReason })),
  recommendations,
  aiMatches,
  aiRetrieval,
})

const findAiMatches = async ({ type, value }) => {
  try {
    const result = await aiRetriever({ type, value })
    return { status: 'AVAILABLE', matches: Array.isArray(result.matches) ? result.matches : [] }
  } catch {
    return { status: 'UNAVAILABLE', matches: [] }
  }
}

const describeAiMatches = (matches) => {
  const describedMatches = matches
    .filter((match) => Number.isFinite(Number(match.score)) && Number(match.score) >= env.aiMatchMinimumScore)
    .map((match) => {
    const score = Number(match.score)
    const isScamCase = match.payload?.kind === 'scam_case'
    const relation = isScamCase && score >= env.aiMatchConfidenceThreshold
      ? 'LIKELY_RELATED'
      : 'CONTEXTUAL'
    const evidenceStatus = match.payload?.verified
      ? 'VERIFIED_KNOWLEDGE_BASE'
      : 'UNVERIFIED_REFERENCE'

    return { ...match, relation, evidenceStatus }
    })

  return {
    matches: describedMatches,
    likelyRelatedCount: describedMatches.filter((match) => match.relation === 'LIKELY_RELATED').length,
    contextualMatchCount: describedMatches.filter((match) => match.relation === 'CONTEXTUAL').length,
  }
}

const aggregationConfig = {
  minimumScore: env.aiMatchMinimumScore,
  confidenceThreshold: env.aiMatchConfidenceThreshold,
  strongMatchCountForStrongAssessment: env.aiRetrievalStrongMatchCount,
  highRiskLevels: env.aiRetrievalHighRiskLevels,
}

const analysisSummaryFor = (findings, retrievalEvidence) => {
  const findingText = `Deterministic checks found ${findings.length} warning sign${findings.length === 1 ? '' : 's'}.`
  if (retrievalEvidence.status === 'UNAVAILABLE') {
    return `${findingText} Retrieval was unavailable, so no semantic evidence was used.`
  }
  if (retrievalEvidence.likelyRelatedCount) {
    const evidenceLabel = retrievalEvidence.verifiedLikelyRelatedCount
      ? 'knowledge-base'
      : 'unverified knowledge-base'
    return `${findingText} Retrieval found ${retrievalEvidence.likelyRelatedCount} strong related ${evidenceLabel} scam case${retrievalEvidence.likelyRelatedCount === 1 ? '' : 's'}.`
  }
  return `${findingText} Retrieval found no strong related scam cases.`
}

const createScan = async ({ userId, type, value }) => {
  const scamCases = await scanRepository.scamCase.findMany({
    select: { id: true, title: true, scamType: true, description: true, sampleText: true, indicators: true, riskLevel: true },
  })
  const result = runScan({ type, value, scamCases })
  const retrieval = await findAiMatches({ type, value })
  const describedMatches = describeAiMatches(retrieval.matches)
  const aggregation = aggregateRisk({
    deterministicAssessment: result.assessment,
    aiMatches: describedMatches.matches,
    retrievalStatus: retrieval.status,
    config: aggregationConfig,
  })
  const scan = await scanRepository.scan.create({
    data: {
      userId,
      inputType: type,
      rawInput: value,
      normalizedInput: result.normalizedInput,
      findings: result.findings,
      assessment: aggregation.assessment,
      deterministicAssessment: result.assessment,
      score: result.score,
      analysisSummary: analysisSummaryFor(result.findings, aggregation.retrievalEvidence),
      retrievalEvidence: aggregation.retrievalEvidence,
      scamCaseMatches: {
        create: result.matchedScamCases.map(({ scamCaseId, similarity, matchReason }) => ({ scamCaseId, similarity, matchReason })),
      },
    },
    select: scanSelect,
  })
  return serializeScan(
    scan,
    recommendationsFor(aggregation.assessment, aggregation.retrievalEvidence),
    describedMatches.matches,
    aggregation.retrievalEvidence,
  )
}

const getOwnedScan = async ({ id, userId }) => {
  const scan = await scanRepository.scan.findFirst({ where: { id, userId }, select: scanSelect })
  if (!scan) {
    throw new ApiError(404, 'Scan not found')
  }
  return serializeScan(scan, recommendationsFor(scan.assessment, scan.retrievalEvidence))
}

// Kept as a small seam so endpoint tests do not require a live MySQL instance.
const setScanRepositoryForTests = (repository) => {
  scanRepository = repository || prisma
}

const setAiRetrieverForTests = (retriever) => {
  aiRetriever = retriever || retrieveSimilarScamCases
}

export { createScan, getOwnedScan, setScanRepositoryForTests, setAiRetrieverForTests }
