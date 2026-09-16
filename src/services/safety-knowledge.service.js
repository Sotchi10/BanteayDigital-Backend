import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const topicFields = { id: true, title: true, slug: true, category: true, shortDescription: true, content: true, warningSigns: true, preventionTips: true, indicators: true, imageUrl: true, icon: true, isPublished: true, createdAt: true, updatedAt: true }
const selectFor = (publishedRelatedOnly) => ({
  ...topicFields,
  relatedFrom: { where: publishedRelatedOnly ? { target: { isPublished: true } } : undefined, select: { target: { select: topicFields } } },
})
const serialize = ({ relatedFrom, ...topic }) => ({ ...topic, relatedTopics: relatedFrom.map(({ target }) => target) })
const relationData = (sourceId, relatedTopicIds) => relatedTopicIds.map((targetId) => ({ sourceId, targetId }))

const verifyRelatedTopics = async (repository, sourceId, relatedTopicIds) => {
  const ids = [...new Set(relatedTopicIds || [])]
  if (ids.includes(sourceId)) throw new ApiError(400, 'A knowledge item cannot be related to itself')
  if (!ids.length) return ids
  const count = await repository.safetyKnowledge.count({ where: { id: { in: ids } } })
  if (count !== ids.length) throw new ApiError(400, 'One or more related knowledge items do not exist')
  return ids
}

const listPublicSafetyKnowledge = async (query) => {
  const { page, limit, category, q } = query
  const where = {
    isPublished: true,
    ...(category ? { category } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { shortDescription: { contains: q } }, { category: { contains: q } }] } : {}),
  }
  const [topics, total] = await Promise.all([
    prisma.safetyKnowledge.findMany({ where, select: selectFor(true), skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: 'desc' } }),
    prisma.safetyKnowledge.count({ where }),
  ])
  return { knowledge: topics.map(serialize), meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const getPublicSafetyKnowledge = async (slug) => {
  const topic = await prisma.safetyKnowledge.findFirst({ where: { slug, isPublished: true }, select: selectFor(true) })
  if (!topic) throw new ApiError(404, 'Safety knowledge item not found')
  return serialize(topic)
}

const listAdminSafetyKnowledge = async (query) => {
  const { page, limit, category, q } = query
  const where = { ...(category ? { category } : {}), ...(q ? { OR: [{ title: { contains: q } }, { shortDescription: { contains: q } }, { category: { contains: q } }] } : {}) }
  const [topics, total] = await Promise.all([
    prisma.safetyKnowledge.findMany({ where, select: selectFor(false), skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: 'desc' } }),
    prisma.safetyKnowledge.count({ where }),
  ])
  return { knowledge: topics.map(serialize), meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const getAdminSafetyKnowledge = async (id) => {
  const topic = await prisma.safetyKnowledge.findUnique({ where: { id }, select: selectFor(false) })
  if (!topic) throw new ApiError(404, 'Safety knowledge item not found')
  return serialize(topic)
}

const createSafetyKnowledge = async ({ relatedTopicIds, ...data }) => {
  try {
    const topic = await prisma.$transaction(async (tx) => {
      const created = await tx.safetyKnowledge.create({ data, select: { id: true } })
      const ids = await verifyRelatedTopics(tx, created.id, relatedTopicIds)
      if (ids.length) await tx.safetyKnowledgeRelation.createMany({ data: relationData(created.id, ids) })
      return tx.safetyKnowledge.findUnique({ where: { id: created.id }, select: selectFor(false) })
    })
    return serialize(topic)
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'A safety knowledge item with that slug already exists')
    throw error
  }
}

const updateSafetyKnowledge = async ({ id, data }) => {
  try {
    const topic = await prisma.$transaction(async (tx) => {
      const existing = await tx.safetyKnowledge.findUnique({ where: { id }, select: { id: true } })
      if (!existing) throw new ApiError(404, 'Safety knowledge item not found')
      const { relatedTopicIds, ...fields } = data
      if (Object.keys(fields).length) await tx.safetyKnowledge.update({ where: { id }, data: fields })
      if (relatedTopicIds !== undefined) {
        const ids = await verifyRelatedTopics(tx, id, relatedTopicIds)
        await tx.safetyKnowledgeRelation.deleteMany({ where: { sourceId: id } })
        if (ids.length) await tx.safetyKnowledgeRelation.createMany({ data: relationData(id, ids) })
      }
      return tx.safetyKnowledge.findUnique({ where: { id }, select: selectFor(false) })
    })
    return serialize(topic)
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'A safety knowledge item with that slug already exists')
    throw error
  }
}

const setSafetyKnowledgePublication = async ({ id, isPublished }) => updateSafetyKnowledge({ id, data: { isPublished } })

const deleteSafetyKnowledge = async (id) => {
  const found = await prisma.safetyKnowledge.findUnique({ where: { id }, select: { id: true } })
  if (!found) throw new ApiError(404, 'Safety knowledge item not found')
  await prisma.safetyKnowledge.delete({ where: { id } })
}

export { createSafetyKnowledge, deleteSafetyKnowledge, getAdminSafetyKnowledge, getPublicSafetyKnowledge, listAdminSafetyKnowledge, listPublicSafetyKnowledge, setSafetyKnowledgePublication, updateSafetyKnowledge }
