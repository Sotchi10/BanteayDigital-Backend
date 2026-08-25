import { z } from 'zod'
import { SCAM_CATEGORIES } from './report.validator.js'

const POST_TYPES = [
  'COMMUNITY_REPORT',
  'OFFICIAL_ALERT',
  'EDUCATIONAL_TIP',
  'TREND_REPORT',
]

const SEVERITY_LEVELS = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]

const POST_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]

const SHARE_CHANNELS = [
  'TELEGRAM',
  'FACEBOOK',
  'MESSENGER',
  'COPY_LINK',
  'OTHER',
]

const listPostsQuerySchema = z.object({
  category: z.enum(SCAM_CATEGORIES).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  postType: z.enum(POST_TYPES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['latest', 'popular', 'critical']).default('latest'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const postIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Post ID is required'),
})

const commentIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Comment ID is required'),
})

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content is required').max(2000, 'Comment exceeds 2000 characters limit'),
  parentId: z.string().trim().min(1).optional().nullable(),
})

const updateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content is required').max(2000, 'Comment exceeds 2000 characters limit'),
})

const trackShareSchema = z.object({
  channel: z.enum(SHARE_CHANNELS).default('OTHER').optional(),
})

const adminReviewReportSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'IN_REVIEW']),
  reviewNote: z.string().trim().max(1000).optional().nullable(),
  publishToCommunity: z.boolean().default(true).optional(),
  postTitle: z.string().trim().min(3).max(255).optional(),
  postSummary: z.string().trim().min(3).max(500).optional(),
  postContent: z.string().trim().min(10).optional(),
  severity: z.enum(SEVERITY_LEVELS).default('HIGH').optional(),
  category: z.enum(SCAM_CATEGORIES).optional(),
  isPinned: z.boolean().default(false).optional(),
  publicEvidenceIds: z.array(z.string().trim().min(1)).optional(),
})

const adminCreatePostSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(255),
  summary: z.string().trim().min(3, 'Summary must be at least 3 characters long').max(500),
  content: z.string().trim().min(10, 'Content must provide at least 10 characters'),
  category: z.enum(SCAM_CATEGORIES).default('OTHER').optional(),
  severity: z.enum(SEVERITY_LEVELS).default('HIGH').optional(),
  postType: z.enum(POST_TYPES).default('COMMUNITY_REPORT').optional(),
  isPinned: z.boolean().default(false).optional(),
  reportId: z.string().trim().optional().nullable(),
  media: z.array(
    z.object({
      mediaUrl: z.string().trim().min(1).max(512),
      mediaType: z.string().trim().max(50).default('IMAGE').optional(),
      caption: z.string().trim().max(255).optional().nullable(),
      order: z.number().int().default(0).optional(),
    })
  ).max(10).optional(),
})

const adminUpdatePostSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  summary: z.string().trim().min(3).max(500).optional(),
  content: z.string().trim().min(10).optional(),
  category: z.enum(SCAM_CATEGORIES).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  postType: z.enum(POST_TYPES).optional(),
  status: z.enum(POST_STATUSES).optional(),
  isPinned: z.boolean().optional(),
  media: z.array(
    z.object({
      mediaUrl: z.string().trim().min(1).max(512),
      mediaType: z.string().trim().max(50).default('IMAGE').optional(),
      caption: z.string().trim().max(255).optional().nullable(),
      order: z.number().int().default(0).optional(),
    })
  ).max(10).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update',
})

export {
  POST_TYPES,
  SEVERITY_LEVELS,
  POST_STATUSES,
  SHARE_CHANNELS,
  listPostsQuerySchema,
  postIdParamSchema,
  commentIdParamSchema,
  createCommentSchema,
  updateCommentSchema,
  trackShareSchema,
  adminReviewReportSchema,
  adminCreatePostSchema,
  adminUpdatePostSchema,
}
