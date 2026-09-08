import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const ruleSelect = {
  id: true, code: true, title: true, description: true, severity: true, weight: true,
  matchTerms: true, languages: true, recommendation: true, source: true, verified: true,
  enabled: true, createdAt: true, updatedAt: true,
}

const listDetectionRules = () => prisma.detectionRule.findMany({ select: ruleSelect, orderBy: [{ enabled: 'desc' }, { code: 'asc' }] })
const withConflict = async (operation) => {
  try {
    return await operation()
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'A detection rule already uses this code')
    throw error
  }
}

const createDetectionRule = (data) => withConflict(() => prisma.detectionRule.create({ data, select: ruleSelect }))

const updateDetectionRule = async ({ id, data }) => {
  const existing = await prisma.detectionRule.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Detection rule not found')
  return withConflict(() => prisma.detectionRule.update({ where: { id }, data, select: ruleSelect }))
}

export { createDetectionRule, listDetectionRules, updateDetectionRule }
