import prisma from '../config/database.js'
import env from '../config/env.js'
import { runScan } from '../scanner/scan.engine.js'
import { analyzeScan, retrieveSimilarScamCases } from './ai-service.client.js'
import ApiError from '../utils/api-error.js'
import { removeScanImage } from './scan-image-storage.service.js'
import { getUrlReputation } from './url-reputation.service.js'

let scanRepository = prisma
let aiRetriever = retrieveSimilarScamCases
let aiAnalyzer = analyzeScan
let urlReputationProvider = getUrlReputation

const scanSelect = {
  id: true, userId: true, inputType: true, imageStoragePath: true, imageMimeType: true, imageSize: true, rawInput: true, normalizedInput: true,
  findings: true, assessment: true, deterministicAssessment: true, score: true,
  analysisSummary: true, analysisReasons: true, analysisSignals: true, evidenceSufficiency: true, recommendedActions: true, analysisSource: true,
  citedCaseIds: true, retrievalEvidence: true, createdAt: true,
  reportStatus: true,
  scamCaseMatches: { select: { similarity: true, matchReason: true, scamCase: { select: { id: true, title: true, scamType: true, riskLevel: true } } } },
}

const emptyRetrievalEvidence = { status: 'NOT_REQUESTED', minimumScore: env.aiMatchMinimumScore, confidenceThreshold: env.aiMatchConfidenceThreshold, matches: [] }

const khmerFallback = {
  insufficientEvidence: 'មិនមានភស្តុតាងគ្រប់គ្រាន់ពីការពិនិត្យ ឬករណីស្រដៀងគ្នា ដើម្បីវាយតម្លៃខ្លឹមសារនេះទេ។',
  reasoningUnavailable: 'សេវាវិភាគ AI មិនអាចប្រើបានសម្រាប់ការពិនិត្យនេះទេ។',
  deterministicSummary: 'ការពិនិត្យស្វ័យប្រវត្តិបានរកឃើញសញ្ញាហានិភ័យនៃការឆបោក។ សេវាវិភាគ AI មិនអាចប្រើបានទេ ដូច្នេះលទ្ធផលនេះផ្អែកលើសញ្ញាដែលបានរាយបញ្ជីប៉ុណ្ណោះ។',
  doNotShare: 'កុំចែករំលែកពាក្យសម្ងាត់ លេខកូដប្រើបានតែម្តង ព័ត៌មានធនាគារ ឬឯកសារអត្តសញ្ញាណ។',
  verifyIndependently: 'ផ្ទៀងផ្ទាត់អ្នកផ្ញើ ឬស្ថាប័នតាមរយៈវិធីទំនាក់ទំនងដែលអ្នកស្វែងរកដោយឯករាជ្យ។',
}

const fallbackText = (language, english, khmer) => language === 'km' ? khmer : english

const insufficientAnalysis = (summary, language = 'en') => ({
  assessment: 'INSUFFICIENT_EVIDENCE', summary, reasons: [summary],
  riskSignals: [], evidenceSufficiency: 'INSUFFICIENT',
  recommendedActions: [
    fallbackText(language, 'Do not share passwords, one-time codes, or banking details.', khmerFallback.doNotShare),
    fallbackText(language, 'Verify the sender or organization through a contact method you find independently.', khmerFallback.verifyIndependently),
  ],
  citedCaseIds: [], source: 'AI_UNAVAILABLE',
})

const assessmentRank = {
  INSUFFICIENT_EVIDENCE: 0, NO_STRONG_WARNING_SIGNS: 0, CAUTION: 1,
  SUSPICIOUS: 2, STRONG_SCAM_INDICATORS: 3, UNABLE_TO_ASSESS: 0,
}

const atLeastDeterministicAssessment = (deterministic, proposed) => (
  (assessmentRank[proposed] ?? 0) >= (assessmentRank[deterministic] ?? 0) ? proposed : deterministic
)

const khmerFinding = (code) => ({
  OTP_OR_VERIFICATION_CODE_REQUEST: 'សារនេះស្នើសុំលេខកូដផ្ទៀងផ្ទាត់ ឬ OTP។',
  CREDENTIAL_OR_FINANCIAL_DETAIL_REQUEST: 'សារនេះស្នើសុំពាក្យសម្ងាត់ ឬព័ត៌មានហិរញ្ញវត្ថុ។',
  URGENCY_OR_ACCOUNT_THREAT: 'សារនេះប្រើពាក្យបន្ទាន់ កាលកំណត់ ឬការគំរាមគណនី ដើម្បីដាក់សម្ពាធ។',
  URGENCY_OR_THREAT_LANGUAGE: 'សារនេះប្រើពាក្យបន្ទាន់ ឬគំរាមកំហែងដើម្បីដាក់សម្ពាធ។',
  COERCED_SENSITIVE_INFORMATION_REQUEST: 'សារនេះស្នើព័ត៌មានសម្ងាត់រួមជាមួយការដាក់សម្ពាធ ឬការគំរាមកំហែង។',
  SUSPICIOUS_LINK: 'សារនេះមានតំណភ្ជាប់ដែលគួរពិនិត្យដោយប្រុងប្រយ័ត្ន។',
  REMOTE_ACCESS_REQUEST: 'សារនេះស្នើឱ្យដំឡើងកម្មវិធី ឬផ្តល់សិទ្ធិចូលប្រើឧបករណ៍។',
  INVESTMENT_OR_TASK_SCAM_PATTERN: 'សារនេះស្រដៀងនឹងលំនាំឆបោកវិនិយោគ ឬការងារបង់ប្រាក់។',
  BLACKMAIL_OR_EXTORTION_THREAT: 'សារនេះមានលំនាំគំរាមកំហែង ឬជំរិតទារប្រាក់។',
})[code]

const deterministicAnalysis = ({ assessment, findings, language = 'en' }) => ({
  assessment,
  summary: fallbackText(language, 'Automated checks found scam-risk indicators. AI reasoning was unavailable, so this result is based on the listed indicators only.', khmerFallback.deterministicSummary),
  reasons: language === 'km'
    ? findings.map((item) => khmerFinding(item.code) || `បានរកឃើញសញ្ញាព្រមាន៖ ${item.code}`)
    : findings.map((item) => item.message),
  recommendedActions: [
    fallbackText(language, 'Do not share passwords, one-time codes, banking details, or identity documents.', khmerFallback.doNotShare),
    fallbackText(language, 'Verify the sender or organization through a contact method you find independently.', khmerFallback.verifyIndependently),
  ],
  riskSignals: [], evidenceSufficiency: 'SUFFICIENT',
  citedCaseIds: [], source: 'DETERMINISTIC_FALLBACK',
})

const serializeScan = ({ scamCaseMatches, analysisReasons, analysisSignals, evidenceSufficiency, recommendedActions, analysisSource, citedCaseIds, retrievalEvidence, ...scan }, aiMatches = []) => ({
  ...scan,
  matchedScamCases: scamCaseMatches.map(({ scamCase, similarity, matchReason }) => ({ ...scamCase, similarity, matchReason })),
  aiMatches,
  aiRetrieval: retrievalEvidence || emptyRetrievalEvidence,
  analysis: {
    source: analysisSource || 'LEGACY', summary: scan.analysisSummary, reasons: analysisReasons || [],
    riskSignals: analysisSignals || [], evidenceSufficiency: evidenceSufficiency || 'INSUFFICIENT',
    recommendedActions: recommendedActions || [], citedCaseIds: citedCaseIds || [],
  },
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

const retrievalEvidenceFor = (status, matches, urlReputation) => ({
  status, minimumScore: env.aiMatchMinimumScore, confidenceThreshold: env.aiMatchConfidenceThreshold,
  matches: matches.map((match) => ({
    caseId: match.payload.caseId ?? null, title: match.payload.title ?? 'Unknown scam case',
    scamType: match.payload.scamType ?? 'unknown', riskLevel: match.payload.riskLevel ?? 'UNKNOWN',
    // Preserve optional localized retrieval fields for later display. They do
    // not participate in matching, scoring, or the stored enum values.
    ...(typeof match.payload.titleKm === 'string' ? { titleKm: match.payload.titleKm } : {}),
    ...(typeof match.payload.scamTypeKm === 'string' ? { scamTypeKm: match.payload.scamTypeKm } : {}),
    ...(match.payload.translations?.km ? { translations: { km: match.payload.translations.km } } : {}),
    score: match.score, relation: match.relation, evidenceStatus: match.evidenceStatus,
  })),
  ...(urlReputation ? { urlReputation } : {}),
})

const urlEvidenceAssessment = (urlEvidence) => {
  const malicious = urlEvidence?.stats?.malicious || 0
  const suspicious = urlEvidence?.stats?.suspicious || 0
  if (malicious >= 2) return 'STRONG_SCAM_INDICATORS'
  if (malicious > 0 || suspicious > 0) return 'SUSPICIOUS'
  return 'INSUFFICIENT_EVIDENCE'
}

const normalizedEvidenceText = (value) => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()

const validatedRiskSignals = (value, riskSignals) => {
  const normalizedInput = normalizedEvidenceText(value)
  return (Array.isArray(riskSignals) ? riskSignals : [])
    .filter((signal) => ['CAUTION', 'SUSPICIOUS', 'CRITICAL'].includes(signal?.severity))
    .filter((signal) => {
      if (typeof signal?.evidence !== 'string') return false
      const evidence = normalizedEvidenceText(signal.evidence)
      return evidence.length > 0 && normalizedInput.includes(evidence)
    })
    .slice(0, 8)
    .map((signal) => ({
      category: typeof signal.category === 'string' ? signal.category : 'OTHER',
      severity: signal.severity,
      evidence: signal.evidence,
      message: typeof signal.message === 'string' && signal.message.trim()
        ? signal.message.trim()
        : (typeof signal.category === 'string' ? signal.category : 'Risk signal'),
    }))
}

const riskSignalAssessment = (riskSignals) => {
  if (riskSignals.some((signal) => signal.severity === 'CRITICAL')) return 'STRONG_SCAM_INDICATORS'
  if (riskSignals.some((signal) => signal.severity === 'SUSPICIOUS')) return 'SUSPICIOUS'
  if (riskSignals.some((signal) => signal.severity === 'CAUTION')) return 'CAUTION'
  return 'INSUFFICIENT_EVIDENCE'
}

const groundedAiAssessment = (analysis, riskSignals) => {
  if (analysis.assessment === 'NO_STRONG_WARNING_SIGNS' && analysis.evidenceSufficiency !== 'SUFFICIENT') {
    return 'INSUFFICIENT_EVIDENCE'
  }
  if ((assessmentRank[analysis.assessment] ?? 0) > 0 && riskSignals.length === 0) {
    return 'INSUFFICIENT_EVIDENCE'
  }
  return analysis.assessment
}

const createAnalysis = async ({ type, value, findings, matches, retrievalStatus, deterministicAssessment, language = 'en', urlEvidence }) => {
  try {
    const retrievedCases = matches
      .filter((match) => Number.isInteger(Number(match.payload.caseId)) && match.payload.title && match.payload.scamType && match.payload.riskLevel)
      .map((match) => ({
        caseId: Number(match.payload.caseId), title: match.payload.title, scamType: match.payload.scamType,
        riskLevel: match.payload.riskLevel, score: match.score, verified: Boolean(match.payload.verified),
        ...(typeof match.payload.description === 'string' ? { description: match.payload.description } : {}),
        ...(typeof match.payload.sampleText === 'string' ? { sampleText: match.payload.sampleText } : {}),
        ...(Array.isArray(match.payload.indicators) ? { indicators: match.payload.indicators.filter((item) => typeof item === 'string') } : {}),
      }))
    const topSimilarity = matches.length ? Math.max(...matches.map((match) => match.score)) : null
    const analysis = await aiAnalyzer({
      type, value, language, deterministicFindings: findings,
      retrievedCases,
      retrievalStatus,
      topSimilarity,
      urlEvidence,
    })
    const riskSignals = validatedRiskSignals(value, analysis.riskSignals)
    const evidenceSufficiency = ['SUFFICIENT', 'AMBIGUOUS', 'INSUFFICIENT'].includes(analysis.evidenceSufficiency)
      ? analysis.evidenceSufficiency
      : 'INSUFFICIENT'
    // Keep the AI service contract small for the testing phase. The backend
    // still fills its existing persistence fields with safe defaults.
    return {
      // AI enriches the explanation; it must not downgrade a concrete,
      // explainable deterministic safety warning.
      assessment: atLeastDeterministicAssessment(
        atLeastDeterministicAssessment(
          atLeastDeterministicAssessment(deterministicAssessment, urlEvidenceAssessment(urlEvidence)),
          riskSignalAssessment(riskSignals),
        ),
        groundedAiAssessment({ ...analysis, evidenceSufficiency }, riskSignals),
      ),
      summary: analysis.summary,
      reasons: riskSignals.length ? riskSignals.map((signal) => signal.message) : [analysis.summary],
      riskSignals,
      evidenceSufficiency,
      recommendedActions: Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [],
      citedCaseIds: [],
      source: 'GEMINI_SIMPLE',
    }
  } catch {
    // Do not erase a concrete deterministic warning merely because the
    // optional AI service is down.
    const fallbackAssessment = atLeastDeterministicAssessment(deterministicAssessment, urlEvidenceAssessment(urlEvidence))
    const fallbackFindings = findings.length ? findings : (assessmentRank[fallbackAssessment] > 0 ? [{
      code: 'URL_REPUTATION_DETECTION', severity: 'SUSPICIOUS',
      message: 'URL reputation providers reported malicious or suspicious detections.',
    }] : [])
    return fallbackFindings.length
      ? deterministicAnalysis({ assessment: fallbackAssessment, findings: fallbackFindings, language })
      : insufficientAnalysis(fallbackText(language, 'Grounded AI reasoning was unavailable for this scan.', khmerFallback.reasoningUnavailable), language)
  }
}

const createScan = async ({ id, userId, type, value, inputType = type, imageMetadata, language = 'en' }) => {
  const knowledgeRules = type === 'TEXT' ? await loadActiveKnowledgeRules() : []
  const deterministic = runScan({ type, value, knowledgeRules })
  const [retrieval, urlReputation] = await Promise.all([
    retrieveMatches({ type, value }),
    type === 'URL' ? urlReputationProvider(value) : Promise.resolve(null),
  ])
  const aiMatches = describeMatches(retrieval.matches)
  const retrievalEvidence = retrievalEvidenceFor(retrieval.status, aiMatches, urlReputation)
  const analysis = await createAnalysis({
    type, value, findings: deterministic.findings, matches: aiMatches,
    retrievalStatus: retrieval.status,
    deterministicAssessment: deterministic.deterministicAssessment,
    language: language === 'km' ? 'km' : 'en',
    urlEvidence: urlReputation?.evidence,
  })
  const scan = await scanRepository.scan.create({
    data: {
      ...(id ? { id } : {}), userId, inputType, ...(imageMetadata || {}), rawInput: value, normalizedInput: deterministic.normalizedInput,
      findings: deterministic.findings, assessment: analysis.assessment, deterministicAssessment: deterministic.deterministicAssessment,
      score: deterministic.score, analysisSummary: analysis.summary, analysisReasons: analysis.reasons,
      analysisSignals: analysis.riskSignals, evidenceSufficiency: analysis.evidenceSufficiency,
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

const deleteOwnedScan = async ({ id, userId }) => {
  const scan = await scanRepository.scan.findFirst({
    where: { id, userId },
    select: { id: true, imageStoragePath: true },
  })
  if (!scan) throw new ApiError(404, 'Scan not found')

  await scanRepository.scan.delete({ where: { id: scan.id } })
  await removeScanImage(scan.imageStoragePath)
  return { id: scan.id }
}

const listOwnedScans = async ({ userId, query }) => {
  const { page, limit } = query
  const where = { userId }
  const [scans, total] = await Promise.all([
    scanRepository.scan.findMany({ where, select: scanSelect, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    scanRepository.scan.count({ where }),
  ])
  return {
    scans: scans.map((scan) => serializeScan(scan, scan.retrievalEvidence?.matches || [])),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

const getAdminScan = async ({ id }) => {
  const scan = await scanRepository.scan.findUnique({ where: { id }, select: scanSelect })
  if (!scan) throw new ApiError(404, 'Scan not found')
  return serializeScan(scan, scan.retrievalEvidence?.matches || [])
}

const setScanRepositoryForTests = (repository) => { scanRepository = repository || prisma }
const setAiRetrieverForTests = (retriever) => { aiRetriever = retriever || retrieveSimilarScamCases }
const setAiAnalyzerForTests = (analyzer) => { aiAnalyzer = analyzer || analyzeScan }
const setUrlReputationProviderForTests = (provider) => { urlReputationProvider = provider || getUrlReputation }

export { createScan, deleteOwnedScan, getAdminScan, getOwnedScan, listOwnedScans, setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests, setUrlReputationProviderForTests }
