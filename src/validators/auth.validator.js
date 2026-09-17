import { z } from 'zod'

const normalizePhoneNumber = (value) => value.replace(/[\s().-]/g, '')
const phoneNumberSchema = z.string().trim().max(30)
  .transform(normalizePhoneNumber)
  .refine((value) => /^(?:\+[1-9]\d{7,14}|0\d{7,14})$/.test(value), 'Enter a valid phone number')
const httpUrlSchema = z.string().trim().url().max(512).refine((value) => {
  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
}, 'URL must use http or https')
const passwordSchema = z.string().min(8).refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  'Password must not exceed 72 UTF-8 bytes',
)

const contactFields = {
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
  phoneNumber: phoneNumberSchema.optional(),
}

const hasContact = (data) => Boolean(data.email || data.phoneNumber)
const hasExactlyOneContact = (data) => Number(Boolean(data.email)) + Number(Boolean(data.phoneNumber)) === 1

const registerSchema = z.object({
  ...contactFields,
  password: passwordSchema,
  name: z.string().trim().min(1).max(100).optional(),
  age: z.coerce.number().int().min(13).max(120).optional(),
  avatarUrl: httpUrlSchema.optional(),
}).refine(hasContact, { message: 'Email or phone number is required', path: ['email'] })

const loginSchema = z.object({
  ...contactFields,
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long'),
}).refine(hasExactlyOneContact, { message: 'Provide either email or phone number, not both', path: ['email'] })

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one profile field is required' })

export { loginSchema, registerSchema, updateProfileSchema }
