import { z } from 'zod'

const topicIdParamSchema = z.object({ id: z.string().trim().min(1, 'Knowledge ID is required') })
const topicSlugParamSchema = z.object({ slug: z.string().trim().min(1, 'Knowledge slug is required') })
const slugSchema = z.string().trim().min(3).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens')
const stringList = (label) => z.array(z.string().trim().min(1, `${label} cannot be blank`).max(500)).min(1).max(50)

const knowledgeFields = z.object({
  title: z.string().trim().min(3).max(255),
  titleKm: z.string().trim().min(3).max(255),
  slug: slugSchema,
  category: z.string().trim().min(2).max(100),
  categoryKm: z.string().trim().min(2).max(100),
  shortDescription: z.string().trim().min(10).max(500),
  shortDescriptionKm: z.string().trim().min(10).max(500),
  content: z.string().trim().min(10).max(50000),
  contentKm: z.string().trim().min(10).max(50000),
  warningSigns: stringList('Warning sign'),
  warningSignsKm: stringList('Khmer warning sign'),
  preventionTips: stringList('Prevention tip'),
  preventionTipsKm: stringList('Khmer prevention tip'),
  indicators: stringList('Indicator'),
  indicatorsKm: stringList('Khmer indicator'),
  relatedTopicIds: z.array(z.string().trim().min(1)).max(20).default([]),
  imageUrl: z.string().trim().url().max(512).optional().nullable(),
  icon: z.string().trim().min(1).max(100).optional().nullable(),
  isPublished: z.boolean().default(false),
})

const createSafetyKnowledgeSchema = knowledgeFields
const updateSafetyKnowledgeSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  titleKm: z.string().trim().min(3).max(255).optional(),
  slug: slugSchema.optional(),
  category: z.string().trim().min(2).max(100).optional(),
  categoryKm: z.string().trim().min(2).max(100).optional(),
  shortDescription: z.string().trim().min(10).max(500).optional(),
  shortDescriptionKm: z.string().trim().min(10).max(500).optional(),
  content: z.string().trim().min(10).max(50000).optional(),
  contentKm: z.string().trim().min(10).max(50000).optional(),
  warningSigns: stringList('Warning sign').optional(),
  warningSignsKm: stringList('Khmer warning sign').optional(),
  preventionTips: stringList('Prevention tip').optional(),
  preventionTipsKm: stringList('Khmer prevention tip').optional(),
  indicators: stringList('Indicator').optional(),
  indicatorsKm: stringList('Khmer indicator').optional(),
  relatedTopicIds: z.array(z.string().trim().min(1)).max(20).optional(),
  imageUrl: z.string().trim().url().max(512).optional().nullable(),
  icon: z.string().trim().min(1).max(100).optional().nullable(),
  isPublished: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one knowledge field is required')
const publishSafetyKnowledgeSchema = z.object({ isPublished: z.boolean() })
const listSafetyKnowledgeQuerySchema = z.object({
  lang: z.enum(['en', 'km']).default('en'),
  category: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
const safetyKnowledgeLanguageQuerySchema = z.object({ lang: z.enum(['en', 'km']).default('en') })

export { createSafetyKnowledgeSchema, listSafetyKnowledgeQuerySchema, publishSafetyKnowledgeSchema, safetyKnowledgeLanguageQuerySchema, topicIdParamSchema, topicSlugParamSchema, updateSafetyKnowledgeSchema }
