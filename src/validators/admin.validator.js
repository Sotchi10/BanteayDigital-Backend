import { z } from 'zod'

const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
})

export { userIdParamSchema }
