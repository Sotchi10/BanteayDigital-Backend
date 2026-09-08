import prisma from '../config/database.js'
import { indexScamCase } from './ai-service.client.js'
import ApiError from '../utils/api-error.js'

const scamCaseSelect = {
  id: true, title: true, scamType: true, description: true, sampleText: true,
  indicators: true, riskLevel: true, source: true, verified: true, updatedAt: true,
}

const reindex = async (scamCase) => {
  try {
    await indexScamCase(scamCase.id)
    return 'INDEXED'
  } catch {
    return 'PENDING_REINDEX'
  }
}

const listScamCases = () => prisma.scamCase.findMany({ select: scamCaseSelect, orderBy: { id: 'asc' } })

const createScamCase = async (data) => {
  const scamCase = await prisma.scamCase.create({ data, select: scamCaseSelect })
  return { scamCase, indexStatus: await reindex(scamCase) }
}

const updateScamCase = async ({ id, data }) => {
  const existing = await prisma.scamCase.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Scam case not found')

  const scamCase = await prisma.scamCase.update({ where: { id }, data, select: scamCaseSelect })
  return { scamCase, indexStatus: await reindex(scamCase) }
}

export { createScamCase, listScamCases, updateScamCase }
