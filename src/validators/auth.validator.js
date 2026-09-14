import { z } from 'zod'

const contactFields = {
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
  phoneNumber: z.string().trim().min(3).max(30).optional(),
}

const hasContact = (data) => Boolean(data.email || data.phoneNumber)
const hasExactlyOneContact = (data) => Number(Boolean(data.email)) + Number(Boolean(data.phoneNumber)) === 1

const registerSchema = z.object({
  ...contactFields,
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100).optional(),
  age: z.coerce.number().int().min(13).max(120).optional(),
  avatarUrl: z.string().trim().url().max(512).optional(),
}).refine(hasContact, { message: 'Email or phone number is required', path: ['email'] })

const loginSchema = z.object({
  ...contactFields,
  password: z.string().min(1).max(72),
}).refine(hasExactlyOneContact, { message: 'Provide either email or phone number, not both', path: ['email'] })

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one profile field is required' })

export { loginSchema, registerSchema, updateProfileSchema }
