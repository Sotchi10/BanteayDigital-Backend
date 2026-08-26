import assert from 'node:assert/strict'
import test from 'node:test'
import validate from '../src/middleware/validate.middleware.js'
import { listReportsQuerySchema } from '../src/validators/report.validator.js'

test('validate parses a read-only Express-style query property in place', () => {
  const query = { page: '2', limit: '10' }
  const request = {}
  Object.defineProperty(request, 'query', { get: () => query })

  let nextError
  validate(listReportsQuerySchema, 'query')(request, {}, (error) => {
    nextError = error
  })

  assert.equal(nextError, undefined)
  assert.deepEqual(query, {
    page: 2,
    limit: 10,
  })
})

test('validate preserves parsed query values when the getter returns a new object', () => {
  const request = {}
  Object.defineProperty(request, 'query', {
    configurable: true,
    get: () => ({ page: '2', limit: '10' }),
  })

  validate(listReportsQuerySchema, 'query')(request, {}, () => {})

  assert.deepEqual(request.query, {
    page: 2,
    limit: 10,
  })
})
