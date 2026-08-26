import assert from 'node:assert/strict'
import test from 'node:test'
import { userIdParamSchema } from '../src/validators/admin.validator.js'

test('admin user activity requires a user ID', () => {
  assert.equal(userIdParamSchema.safeParse({ userId: 'user-1' }).success, true)
  assert.equal(userIdParamSchema.safeParse({ userId: '  ' }).success, false)
})
