import prisma from '../config/database.js'
import env from '../config/env.js'
import { runScan } from '../scanner/scan.engine.js'
import { analyzeScan, retrieveSimilarScamCases } from './ai-service.client.js'
import ApiError from '../utils/api-error.js'

let scanRepository = prisma
let aiRetriever = retrieveSimilarScamCases
let aiAnalyzer = analyzeScan

const scanSelect = {
  id: true, userId: true, inputType: true, rawInput: true, normalizedInput: true,
  findings: true, assessment: true, deterministicAssessment: true, score: true,
  analysisSummary: true, analysisReasons: true, recommendedActions: true, analysisSource: true,
  citedCaseIds: true, retrievalEvidence: true, createdAt: true,
  reportStatus: true,
  scamCaseMatches: { select: { similarity: true, matchReason: true, scamCase: { select: { id: true, title: true, scamType: true, riskLevel: true } } } },
}

const emptyRetrievalEvidence = { status: 'NOT_REQUESTED', minimumScore: env.aiMatchMinimumScore, confidenceThreshold: env.aiMatchConfidenceThreshold, matches: [] }

const insufficientAnalysis = (summary) => ({
  assessment: 'INSUFFICIENT_EVIDENCE', summary, reasons: [summary],
  recommendedActions: ['Do not share passwords, one-time codes, or banking details.', 'Verify the sender or organization through a contact method you find independently.'],
  citedCaseIds: [], source: 'EVIDENCE_GATE',
})

const assessmentRank = {
  INSUFFICIENT_EVIDENCE: 0, NO_STRONG_WARNING_SIGNS: 0, CAUTION: 1,
  SUSPICIOUS: 2, STRONG_SCAM_INDICATORS: 3, UNABLE_TO_ASSESS: 0,
}

const atLeastDeterministicAssessment = (deterministic, proposed) => (
  (assessmentRank[proposed] ?? 0) >= (assessmentRank[deterministic] ?? 0) ? proposed : deterministic
)

const deterministicAnalysis = ({ assessment, findings }) => ({
  assessment,
  summary: 'Automated checks found scam-risk indicators. AI reasoning was unavailable, so this result is based on the listed indicators only.',
  reasons: findings.map((item) => item.message),
  recommendedActions: ['Do not share passwords, one-time codes, banking details, or identity documents.', 'Verify the sender or organization through a contact method you find independently.'],
  citedCaseIds: [], source: 'DETERMINISTIC_FALLBACK',
})

const serializeScan = ({ scamCaseMatches, analysisReasons, recommendedActions, analysisSource, citedCaseIds, retrievalEvidence, ...scan }, aiMatches = []) => ({
  ...scan,
  matchedScamCases: scamCaseMatches.map(({ scamCase, similarity, matchReason }) => ({ ...scamCase, similarity, matchReason })),
  aiMatches,
  aiRetrieval: retrievalEvidence || emptyRetrievalEvidence,
  analysis: { source: analysisSource || 'LEGACY', summary: scan.analysisSummary, reasons: analysisReasons || [], recommendedActions: recommendedActions || [], citedCaseIds: citedCaseIds || [] },
  recommendations: recommendedActions || [],
})

const retrieveMatches = async ({ type, value }) => {
  try {
    const result = await aiRetriever({ type, value })
    return { status: 'AVAILABLE', matches: Array.isArray(result.matches) ? result.matches : [] }
  } catch {
    return { status: 'UNAVAILABLE', matches: [] }
  }
}

const loadActiveKnowledgeRules = async () => {
  // Scanning must remain available during a rule-store outage; the built-in
  // safety baseline still runs in that case.
  try {
    if (!scanRepository.detectionRule?.findMany) return []
    return await scanRepository.detectionRule.findMany({
      where: { enabled: true },
      select: { code: true, title: true, description: true, severity: true, weight: true, matchTerms: true, enabled: true },
    })
  } catch {
    return []
  }
}

const describeMatches = (matches) => matches
  .filter((match) => Number.isFinite(Number(match.score)) && Number(match.score) >= env.aiMatchMinimumScore)
  .map((match) => {
    const score = Number(match.score)
    const payload = match.payload || {}
    return {
      id: match.id, score, payload,
      relation: payload.kind === 'scam_case' && score >= env.aiMatchConfidenceThreshold ? 'LIKELY_RELATED' : 'CONTEXTUAL',
      evidenceStatus: payload.verified ? 'VERIFIED_KNOWLEDGE_BASE' : 'UNVERIFIED_REFERENCE',
    }
  })

const retrievalEvidenceFor = (status, matches) => ({
  status, minimumScore: env.aiMatchMinimumScore, confidenceThreshold: env.aiMatchConfidenceThreshold,
  matches: matches.map((match) => ({
    caseId: match.payload.caseId ?? null, title: match.payload.title ?? 'Unknown scam case',
    scamType: match.payload.scamType ?? 'unknown', riskLevel: match.payload.riskLevel ?? 'UNKNOWN',
    score: match.score, relation: match.relation, evidenceStatus: match.evidenceStatus,
  })),
})

const createAnalysis = async ({ type, value, findings, matches, deterministicAssessment }) => {
  const hasEvidence = findings.length > 0 || matches.some((match) => match.relation === 'LIKELY_RELATED')
  if (!hasEvidence) return insufficientAnalysis('There is not enough deterministic or retrieved evidence to assess this content.')

  try {
    const analysis = await aiAnalyzer({
      type, value, deterministicFindings: findings,
      retrievedCases: matches.map((match) => ({
        caseId: match.payload.caseId, title: match.payload.title, scamType: match.payload.scamType,
        riskLevel: match.payload.riskLevel, score: match.score, verified: Boolean(match.payload.verified),
      })),
    })
    // Keep the AI service contract small for the testing phase. The backend
    // still fills its existing persistence fields with safe defaults.
    return {
      // AI enriches the explanation; it must not downgrade a concrete,
      // explainable deterministic safety warning.
      assessment: atLeastDeterministicAssessment(deterministicAssessment, analysis.assessment),
      summary: analysis.summary,
      reasons: Array.isArray(analysis.reasons) && analysis.reasons.length ? analysis.reasons : [analysis.summary],
      recommendedActions: Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [],
      citedCaseIds: [],
      source: 'GEMINI_SIMPLE',
    }
  } catch {
    // Do not erase a concrete deterministic warning merely because the
    // optional AI service is down.
    return findings.length ? deterministicAnalysis({ assessment: deterministicAssessment, findings }) : insufficientAnalysis('Grounded AI reasoning was unavailable for this scan.')
  }
}

const createScan = async ({ userId, type, value }) => {
  const knowledgeRules = type === 'TEXT' ? await loadActiveKnowledgeRules() : []
  const deterministic = runScan({ type, value, knowledgeRules })
  const retrieval = await retrieveMatches({ type, value })
  const aiMatches = describeMatches(retrieval.matches)
  const retrievalEvidence = retrievalEvidenceFor(retrieval.status, aiMatches)
  const analysis = await createAnalysis({ type, value, findings: deterministic.findings, matches: aiMatches, deterministicAssessment: deterministic.deterministicAssessment })
  const scan = await scanRepository.scan.create({
    data: {
      userId, inputType: type, rawInput: value, normalizedInput: deterministic.normalizedInput,
      findings: deterministic.findings, assessment: analysis.assessment, deterministicAssessment: deterministic.deterministicAssessment,
      score: deterministic.score, analysisSummary: analysis.summary, analysisReasons: analysis.reasons,
      recommendedActions: analysis.recommendedActions, analysisSource: analysis.source,
      citedCaseIds: analysis.citedCaseIds, retrievalEvidence,
    },
    select: scanSelect,
  })
  return serializeScan(scan, aiMatches)
}

const getOwnedScan = async ({ id, userId }) => {
  const scan = await scanRepository.scan.findFirst({ where: { id, userId }, select: scanSelect })
  if (!scan) throw new ApiError(404, 'Scan not found')
  return serializeScan(scan, scan.retrievalEvidence?.matches || [])
}

const getAdminScan = async ({ id }) => {
  const scan = await scanRepository.scan.findUnique({ where: { id }, select: scanSelect })
  if (!scan) throw new ApiError(404, 'Scan not found')
  return serializeScan(scan, scan.retrievalEvidence?.matches || [])
}

const setScanRepositoryForTests = (repository) => { scanRepository = repository || prisma }
const setAiRetrieverForTests = (retriever) => { aiRetriever = retriever || retrieveSimilarScamCases }
const setAiAnalyzerForTests = (analyzer) => { aiAnalyzer = analyzer || analyzeScan }

export { createScan, getAdminScan, getOwnedScan, setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests }
