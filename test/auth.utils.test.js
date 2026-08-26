import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import env from '../src/config/env.js'
import { signToken } from '../src/utils/auth.js'

test('signToken creates a JWT verifiable with the configured secret', () => {
  const token = signToken('test-user', 2, 'ADMIN')
  const payload = jwt.verify(token, env.jwtSecret)

  assert.equal(payload.sub, 'test-user')
  assert.equal(payload.tokenVersion, 2)
  assert.equal(payload.role, 'ADMIN')
})
