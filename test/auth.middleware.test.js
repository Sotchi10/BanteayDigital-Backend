import assert from 'node:assert/strict'
import test from 'node:test'
import { extractToken } from '../src/middleware/auth.middleware.js'

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
