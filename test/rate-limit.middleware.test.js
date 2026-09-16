import assert from 'node:assert/strict'
import test from 'node:test'
import { createRateLimiter } from '../src/middleware/rate-limit.middleware.js'

test('rate limiter returns 429 and Retry-After after the configured maximum', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, bypass: false })
  const request = { ip: '127.0.0.1' }
  let nextCalls = 0
  let statusCode
  let body
  let retryAfter
  const response = {
    set: (name, value) => { if (name === 'Retry-After') retryAfter = value },
    status: (code) => {
      statusCode = code
      return { json: (value) => { body = value } }
    },
  }

  limiter(request, response, () => { nextCalls += 1 })
  limiter(request, response, () => { nextCalls += 1 })
  limiter(request, response, () => { nextCalls += 1 })

  assert.equal(nextCalls, 2)
  assert.equal(statusCode, 429)
  assert.equal(retryAfter, '60')
  assert.deepEqual(body, { message: 'Too many requests. Please try again later.' })
})
