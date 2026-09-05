import { z } from 'zod'

const scanSchema = z.object({
  type: z.enum(['TEXT', 'URL']),
  value: z.string().trim().min(1, 'Scan value is required').max(10000),
}).superRefine((data, context) => {
  if (data.type !== 'URL') return
  try {
    const url = new URL(data.value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'URL must use http or https' })
    }
  } catch {
    context.addIssue({ code: 'custom', path: ['value'], message: 'A valid http or https URL is required' })
  }
})

const scanIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Scan ID is required'),
})

export { scanIdParamSchema, scanSchema }
