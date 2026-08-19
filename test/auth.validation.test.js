import assert from 'node:assert/strict'
import test from 'node:test'
import { loginSchema } from '../src/validators/auth.validator.js'

test('login accepts exactly one contact identifier', () => {
  assert.equal(loginSchema.safeParse({ email: 'sokha@example.com', password: 'password123' }).success, true)
  assert.equal(loginSchema.safeParse({ phoneNumber: '+85512345678', password: 'password123' }).success, true)
  assert.equal(loginSchema.safeParse({ password: 'password123' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'sokha@example.com', phoneNumber: '+85512345678', password: 'password123' }).success, false)
})
