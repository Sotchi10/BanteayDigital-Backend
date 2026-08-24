import { z } from 'zod'

const SCAM_CATEGORIES = [
  'IMPERSONATION',
  'FAKE_NEWS',
  'INVESTMENT_FRAUD',
  'JOB_OFFER',
  'PHISHING_LINK',
  'LOTTERY_PRIZE',
  'LOAN_SCAM',
  'ECOMMERCE_SCAM',
  'ROMANCE_SCAM',
  'MALWARE_APK',
  'OTHER',
]

const REPORT_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
]

const INDICATOR_TYPES = [
  'URL',
  'DOMAIN',
  'PHONE_NUMBER',
  'BANK_ACCOUNT',
  'TELEGRAM_HANDLE',
  'SOCIAL_PROFILE',
  'CRYPTO_WALLET',
  'EMAIL',
]

const EVIDENCE_FILE_TYPES = [
  'IMAGE',
  'DOCUMENT',
  'AUDIO',
  'VIDEO',
]

const indicatorSchema = z.object({
  type: z.enum(INDICATOR_TYPES),
  value: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(255).optional(),
})

const createReportSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(255),
  description: z.string().trim().min(10, 'Description must provide at least 10 characters of context'),
  category: z.enum(SCAM_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${SCAM_CATEGORIES.join(', ')}` }),
  }),
  financialLossAmount: z.coerce.number().min(0).max(999999999.99).optional().nullable(),
  currency: z.enum(['USD', 'KHR']).default('USD').optional(),
  scammerContact: z.string().trim().max(255).optional().nullable(),
  incidentDate: z.coerce.date().optional().nullable(),
  indicators: z.array(indicatorSchema).max(20).optional(),
})

const updateReportSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().trim().min(10).optional(),
  category: z.enum(SCAM_CATEGORIES).optional(),
  financialLossAmount: z.coerce.number().min(0).max(999999999.99).optional().nullable(),
  currency: z.enum(['USD', 'KHR']).optional(),
  scammerContact: z.string().trim().max(255).optional().nullable(),
  incidentDate: z.coerce.date().optional().nullable(),
  indicators: z.array(indicatorSchema).max(20).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update',
})

const listMyReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  category: z.enum(SCAM_CATEGORIES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'incidentDate', 'financialLossAmount', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const reportIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Report ID is required'),
})

const evidenceIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Report ID is required'),
  evidenceId: z.string().trim().min(1, 'Evidence ID is required'),
})

const attachEvidenceUrlSchema = z.object({
  fileUrl: z.string().trim().url('Valid file URL is required').max(512),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.enum(EVIDENCE_FILE_TYPES).default('IMAGE'),
  fileSize: z.coerce.number().int().min(1).optional(),
  mimeType: z.string().trim().max(100).optional(),
  isPublicSafe: z.boolean().default(false).optional(),
})

export {
  SCAM_CATEGORIES,
  REPORT_STATUSES,
  INDICATOR_TYPES,
  EVIDENCE_FILE_TYPES,
  createReportSchema,
  updateReportSchema,
  listMyReportsQuerySchema,
  reportIdParamSchema,
  evidenceIdParamSchema,
  attachEvidenceUrlSchema,
}
