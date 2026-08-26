import { z } from 'zod'

const reportIdParamSchema = z.object({ id: z.string().trim().min(1, 'Report ID is required') })
const listReportsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
const listAdminReportsQuerySchema = listReportsQuerySchema.extend({
  userId: z.string().trim().min(1).optional(),
})
const adminReviewSchema = z.object({ reviewNote: z.string().trim().min(1).max(2000).optional().nullable() })

export { adminReviewSchema, listAdminReportsQuerySchema, listReportsQuerySchema, reportIdParamSchema }
