import { z } from 'zod'

const normalizePhoneNumber = (value) => value.replace(/[\s().-]/g, '')
const acceptedEmailDomains = new Set([
  'gmail.com',
  'student.cadt.edu.kh',
  'outlook.com',
  'icloud.com',
  'yahoo.com',
])
const hasValidEmailDomain = (value) => {
  const domain = value.split('@')[1] || ''
  if (domain.length > 253 || !domain.includes('.')) return false
  const labels = domain.split('.')
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    && /^[a-z]{2,63}$/i.test(labels.at(-1))
}
const hasAcceptedEmailDomain = (value) => acceptedEmailDomains.has((value.split('@')[1] || '').toLowerCase())
const emailSchema = z.string().trim().email().max(255)
  .refine(hasValidEmailDomain, 'Enter an email address with a valid domain')
  .refine(hasAcceptedEmailDomain, 'Email must use an accepted domain: @gmail.com, @student.cadt.edu.kh, @outlook.com, @icloud.com, or @yahoo.com')
  .transform((value) => value.toLowerCase())
const phoneNumberSchema = z.string().trim().max(30)
  .transform(normalizePhoneNumber)
  .refine(
    (value) => /^0\d{8,9}$/.test(value),
    'Phone number must contain 9 to 10 digits and start with 0',
  )
const httpUrlSchema = z.string().trim().url().max(512).refine((value) => {
  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
}, 'URL must use http or https')
const passwordSchema = z.string().min(8).refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  'Password must not exceed 72 UTF-8 bytes',
)

const contactFields = {
  email: emailSchema.optional(),
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
  email: emailSchema.optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one profile field is required' })

export { loginSchema, registerSchema, updateProfileSchema }
