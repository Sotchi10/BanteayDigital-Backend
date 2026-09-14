import { z } from 'zod'

const postIdParamSchema = z.object({ id: z.string().trim().min(1, 'Post ID is required') })
const commentIdParamSchema = z.object({ id: z.string().trim().min(1, 'Comment ID is required') })

const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const listCommentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
  parentId: z.string().trim().min(1).optional(),
})

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment must not exceed 1000 characters'),
  parentId: z.string().trim().min(1).nullable().optional(),
})

const updateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment must not exceed 1000 characters'),
})

const reportCommentSchema = z.object({
  reason: z.enum(['SPAM', 'HARASSMENT', 'DANGEROUS_LINK', 'MISINFORMATION', 'OTHER']),
  details: z.string().trim().max(500, 'Report details must not exceed 500 characters').optional(),
})

const moderateCommentSchema = z.object({ status: z.enum(['ACTIVE', 'HIDDEN']) })
const recordShareSchema = z.object({ channel: z.enum(['NATIVE', 'TELEGRAM', 'COPY_LINK']) })

export {
  commentIdParamSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  listPostsQuerySchema,
  moderateCommentSchema,
  postIdParamSchema,
  recordShareSchema,
  reportCommentSchema,
  updateCommentSchema,
}
