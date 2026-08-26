import { z } from 'zod'

const postIdParamSchema = z.object({ id: z.string().trim().min(1, 'Post ID is required') })
const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export { listPostsQuerySchema, postIdParamSchema }
