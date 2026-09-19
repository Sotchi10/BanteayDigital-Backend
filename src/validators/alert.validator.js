import { z } from 'zod'

const alertIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Alert ID is required'),
})

const alertFields = {
  title: z.string().trim().min(1, 'Title is required').max(255),
  content: z.string().trim().min(1, 'Content is required').max(10000),
}

const createAlertSchema = z.object(alertFields)
const updateAlertSchema = z.object({
  title: alertFields.title.optional(),
  content: alertFields.content.optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one alert field is required')
const publishAlertSchema = z.object({ isPublished: z.boolean() })
const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export {
  alertIdParamSchema,
  createAlertSchema,
  listAlertsQuerySchema,
  publishAlertSchema,
  updateAlertSchema,
}
