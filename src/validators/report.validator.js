import { z } from 'zod'

const reportIdParamSchema = z.object({ id: z.string().trim().min(1, 'Report ID is required') })
const listReportsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
const listAdminReportsQuerySchema = listReportsQuerySchema.extend({
  userId: z.string().trim().min(1).optional(),
})
const adminReviewSchema = z.object({ reviewNote: z.string().trim().min(1).max(2000).optional().nullable() })
const reportFromScanSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  reason: z.string().trim().min(1).max(100).optional(),
  details: z.string().trim().min(10).max(5000).optional(),
  evidence: z.string().trim().max(2000).optional(),
})
const publishReportSchema = z.object({
  title: z.string().trim().min(3).max(255),
  summary: z.string().trim().min(10).max(500),
  content: z.string().trim().min(10).max(50000),
})
const reportPublicationSchema = z.object({ isPublished: z.boolean() })
const updateManagedReportSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  content: z.string().trim().min(10).max(50000).optional(),
  summary: z.string().trim().min(10).max(500).optional(),
  details: z.string().trim().min(10).max(5000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one report field is required')

export {
  adminReviewSchema,
  listAdminReportsQuerySchema,
  listReportsQuerySchema,
  publishReportSchema,
  reportFromScanSchema,
  reportIdParamSchema,
  reportPublicationSchema,
  updateManagedReportSchema,
}
