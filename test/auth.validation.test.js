import assert from 'node:assert/strict'
import test from 'node:test'
import { loginSchema, registerSchema, updateProfileSchema } from '../src/validators/auth.validator.js'

test('login accepts exactly one contact identifier', () => {
  assert.equal(loginSchema.safeParse({ email: 'sokha@example.com', password: 'password123' }).success, true)
  assert.equal(loginSchema.safeParse({ phoneNumber: '012345678', password: 'password123' }).success, true)
  assert.equal(loginSchema.safeParse({ password: 'password123' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'sokha@example.com', phoneNumber: '012345678', password: 'password123' }).success, false)
})

test('auth validation normalizes phone numbers and limits URL schemes and bcrypt byte length', () => {
  const registration = registerSchema.parse({
    phoneNumber: '012-345-678',
    password: 'password123',
    avatarUrl: 'https://cdn.example/avatar.png',
  })
  assert.equal(registration.phoneNumber, '012345678')
  assert.equal(registerSchema.safeParse({ email: 'a@example.com', password: 'password123', avatarUrl: 'javascript:alert(1)' }).success, false)
  assert.equal(registerSchema.safeParse({ email: 'a@example.com', password: 'ក'.repeat(30) }).success, false)
})

test('auth validation requires a dotted email domain and a 9 to 10 digit local phone number', () => {
  assert.equal(registerSchema.safeParse({ email: 'person@example', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ email: 'person@-example.com', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ email: 'person@example.c', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ phoneNumber: '01234567', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ phoneNumber: '01234567890', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ phoneNumber: '123456789', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ phoneNumber: '+85512345678', password: 'password123' }).success, false)
  assert.equal(registerSchema.safeParse({ phoneNumber: '012345678', password: 'password123' }).success, true)
  assert.equal(registerSchema.safeParse({ phoneNumber: '0123456789', password: 'password123' }).success, true)
})

test('profile updates accept only safe editable account fields', () => {
  assert.equal(updateProfileSchema.safeParse({ name: 'Sreynich Chan', username: 'sreynich_1', email: 'sreynich@example.com' }).success, true)
  assert.equal(updateProfileSchema.safeParse({ username: 'not allowed' }).success, false)
  assert.equal(updateProfileSchema.safeParse({}).success, false)
})
