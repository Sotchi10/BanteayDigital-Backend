import prisma from '../config/database.js'
import { recommendationsFor, runScan } from '../scanner/scan.engine.js'
import ApiError from '../utils/api-error.js'

let scanRepository = prisma

const scanSelect = {
  id: true, userId: true, inputType: true, rawInput: true, normalizedInput: true,
  findings: true, assessment: true, score: true, analysisSummary: true, createdAt: true,
  scamCaseMatches: { select: { similarity: true, matchReason: true, scamCase: { select: { id: true, title: true, scamType: true, riskLevel: true } } } },
}

const serializeScan = ({ scamCaseMatches, ...scan }, recommendations = []) => ({
  ...scan,
  matchedScamCases: scamCaseMatches.map(({ scamCase, similarity, matchReason }) => ({ ...scamCase, similarity, matchReason })),
  recommendations,
})

const createScan = async ({ userId, type, value }) => {
  const scamCases = await scanRepository.scamCase.findMany({
    select: { id: true, title: true, scamType: true, description: true, sampleText: true, indicators: true, riskLevel: true },
  })
  const result = runScan({ type, value, scamCases })
  const scan = await scanRepository.scan.create({
    data: {
      userId,
      inputType: type,
      rawInput: value,
      normalizedInput: result.normalizedInput,
      findings: result.findings,
      assessment: result.assessment,
      score: result.score,
      analysisSummary: `Deterministic checks found ${result.findings.length} warning sign${result.findings.length === 1 ? '' : 's'}. No automated result guarantees that content is safe.`,
      scamCaseMatches: {
        create: result.matchedScamCases.map(({ scamCaseId, similarity, matchReason }) => ({ scamCaseId, similarity, matchReason })),
      },
    },
    select: scanSelect,
  })
  return serializeScan(scan, result.recommendations)
}

const getOwnedScan = async ({ id, userId }) => {
  const scan = await scanRepository.scan.findFirst({ where: { id, userId }, select: scanSelect })
  if (!scan) {
    throw new ApiError(404, 'Scan not found')
  }
  return serializeScan(scan, recommendationsFor(scan.assessment))
}

// Kept as a small seam so endpoint tests do not require a live MySQL instance.
const setScanRepositoryForTests = (repository) => {
  scanRepository = repository || prisma
}

export { createScan, getOwnedScan, setScanRepositoryForTests }
