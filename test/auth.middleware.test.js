import assert from 'node:assert/strict'
import test from 'node:test'
import { extractToken, requireAuth, setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { signToken } from '../src/utils/auth.js'

test('extractToken prefers an explicit bearer token over a cookie token', () => {
  const request = {
    cookies: { token: 'stale-cookie-token' },
    get: (header) => header === 'authorization' ? 'Bearer fresh-bearer-token' : undefined,
  }

  assert.equal(extractToken(request), 'fresh-bearer-token')
})

test('extractToken falls back to the session cookie', () => {
  const request = {
    cookies: { token: 'cookie-token' },
    get: () => undefined,
  }

  assert.equal(extractToken(request), 'cookie-token')
})

test('extractToken accepts a case-insensitive bearer scheme and tolerates absent cookies', () => {
  const request = {
    get: (header) => header === 'authorization' ? 'bearer token-with-extra-space' : undefined,
  }

  assert.equal(extractToken(request), 'token-with-extra-space')
})

test('a token issued before logout is rejected after token-version invalidation', async (t) => {
  const oldToken = signToken('user-a', 0)
  setAuthRepositoryForTests({
    user: { findUnique: async () => ({ id: 'user-a', tokenVersion: 1, role: 'USER', status: 'ACTIVE' }) },
  })
  t.after(() => setAuthRepositoryForTests())

  const error = await new Promise((resolve) => requireAuth(
    { cookies: {}, get: (header) => header === 'authorization' ? `Bearer ${oldToken}` : undefined },
    {},
    resolve,
  ))

  assert.equal(error.statusCode, 401)
  assert.match(error.message, /revoked/)
})
