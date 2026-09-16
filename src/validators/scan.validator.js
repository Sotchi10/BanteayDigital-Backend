import { z } from 'zod'

const scanTypeSchema = z.enum(['TEXT', 'URL'])

const scanSchema = z.object({
  inputType: scanTypeSchema.optional(),
  // Keep current JSON clients working while frontend callers migrate to the
  // documented inputType discriminator.
  type: scanTypeSchema.optional(),
  value: z.string().trim().min(1, 'Scan value is required').max(10000),
}).superRefine((data, context) => {
  if (!data.inputType && !data.type) {
    context.addIssue({ code: 'custom', path: ['inputType'], message: 'inputType is required' })
    return
  }
  if (data.inputType && data.type && data.inputType !== data.type) {
    context.addIssue({ code: 'custom', path: ['inputType'], message: 'inputType and type must match' })
  }
  if ((data.inputType || data.type) !== 'URL') return
  try {
    const url = new URL(data.value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'URL must use http or https' })
    }
  } catch {
    context.addIssue({ code: 'custom', path: ['value'], message: 'A valid http or https URL is required' })
  }
}).transform(({ inputType, type, value }) => ({ inputType: inputType || type, value }))

const imageScanSchema = z.object({
  inputType: z.literal('IMAGE'),
})

const scanIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Scan ID is required'),
})

const listScansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export { imageScanSchema, listScansQuerySchema, scanIdParamSchema, scanSchema }
