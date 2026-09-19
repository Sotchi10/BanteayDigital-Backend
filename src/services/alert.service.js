import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

let alertRepository = prisma

const alertFields = {
  id: true,
  title: true,
  content: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
}

const pagination = ({ page, limit }, total) => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
})

const listPublicAlerts = async ({ page, limit }) => {
  const where = { isPublished: true }
  const [alerts, total] = await Promise.all([
    alertRepository.alertMessage.findMany({
      where,
      select: alertFields,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    }),
    alertRepository.alertMessage.count({ where }),
  ])
  return { alerts, meta: pagination({ page, limit }, total) }
}

const listAdminAlerts = async ({ page, limit }) => {
  const [alerts, total] = await Promise.all([
    alertRepository.alertMessage.findMany({
      select: alertFields,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    alertRepository.alertMessage.count(),
  ])
  return { alerts, meta: pagination({ page, limit }, total) }
}

const createAlert = (data) => alertRepository.alertMessage.create({
  data,
  select: alertFields,
})

const updateAlert = async ({ id, data }) => {
  const existing = await alertRepository.alertMessage.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new ApiError(404, 'Alert not found')
  return alertRepository.alertMessage.update({ where: { id }, data, select: alertFields })
}

const setAlertPublication = async ({ id, isPublished }) => updateAlert({
  id,
  data: {
    isPublished,
    publishedAt: isPublished ? new Date() : null,
  },
})

const deleteAlert = async (id) => {
  const existing = await alertRepository.alertMessage.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new ApiError(404, 'Alert not found')
  await alertRepository.alertMessage.delete({ where: { id } })
}

const setAlertRepositoryForTests = (repository) => {
  alertRepository = repository || prisma
}

export {
  createAlert,
  deleteAlert,
  listAdminAlerts,
  listPublicAlerts,
  setAlertPublication,
  setAlertRepositoryForTests,
  updateAlert,
}
