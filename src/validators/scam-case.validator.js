import { z } from 'zod'

const scamCaseFields = z.object({
  title: z.string().trim().min(3).max(255),
  scamType: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(10000),
  sampleText: z.string().trim().min(3).max(50000),
  indicators: z.array(z.string().trim().min(1).max(200)).max(30),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  source: z.string().trim().min(2).max(255),
  verified: z.boolean().default(false),
})

const scamCaseIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
const createScamCaseSchema = scamCaseFields
const updateScamCaseSchema = scamCaseFields.partial()

export { createScamCaseSchema, scamCaseIdParamSchema, updateScamCaseSchema }
