import { z } from 'zod'

const ruleFields = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{2,99}$/, 'Use uppercase letters, numbers, and underscores.'),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  severity: z.enum(['CAUTION', 'SUSPICIOUS']),
  weight: z.number().int().min(1).max(50),
  matchTerms: z.array(z.string().trim().min(2).max(200)).min(1).max(30),
  languages: z.array(z.string().trim().min(2).max(20)).min(1).max(20),
  recommendation: z.string().trim().min(3).max(5000).optional().nullable(),
  source: z.string().trim().min(2).max(255),
  verified: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const detectionRuleIdParamSchema = z.object({ id: z.string().trim().min(1) })
const createDetectionRuleSchema = ruleFields
const updateDetectionRuleSchema = ruleFields.partial()

export { createDetectionRuleSchema, detectionRuleIdParamSchema, updateDetectionRuleSchema }
