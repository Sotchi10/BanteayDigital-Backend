import assert from 'node:assert/strict'
import test from 'node:test'
import requireRole from '../src/middleware/role.middleware.js'

test('requireRole blocks unauthenticated request', () => {
  const middleware = requireRole('ADMIN')
  let receivedError = null

  const req = {}
  const res = {}
  const next = (err) => {
    receivedError = err
  }

  middleware(req, res, next)

  assert.ok(receivedError)
  assert.equal(receivedError.statusCode, 401)
})

test('requireRole blocks user with insufficient role', () => {
  const middleware = requireRole('ADMIN', 'MODERATOR')
  let receivedError = null

  const req = { auth: { userId: 'user-1', role: 'USER' } }
  const res = {}
  const next = (err) => {
    receivedError = err
  }

  middleware(req, res, next)

  assert.ok(receivedError)
  assert.equal(receivedError.statusCode, 403)
})

test('requireRole permits user with authorized role', () => {
  const middleware = requireRole('ADMIN', 'MODERATOR')
  let calledNext = false
  let receivedError = null

  const req = { auth: { userId: 'admin-1', role: 'ADMIN' } }
  const res = {}
  const next = (err) => {
    calledNext = true
    receivedError = err
  }

  middleware(req, res, next)

  assert.equal(calledNext, true)
  assert.equal(receivedError, undefined)
})
