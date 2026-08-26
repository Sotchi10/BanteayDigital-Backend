import { z } from 'zod'

const submissionIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Submission ID is required'),
})

const submissionBody = {
  title: z.string().trim().min(3).max(255).optional().nullable(),
  content: z.string().trim().min(10, 'Content must contain at least 10 characters').max(50000),
  sourceUrl: z.string().trim().url().max(512).optional().nullable(),
}

const createSubmissionSchema = z.object(submissionBody)
const updateSubmissionSchema = z.object(submissionBody).partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required',
)

const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export { createSubmissionSchema, listSubmissionsQuerySchema, submissionIdParamSchema, updateSubmissionSchema }
