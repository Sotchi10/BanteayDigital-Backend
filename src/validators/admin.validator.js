import { z } from 'zod'

const pagination = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

const listUsersQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
})

const listAuditLogsQuerySchema = z.object(pagination)

export { listAuditLogsQuerySchema, listUsersQuerySchema }
