import assert from 'node:assert/strict'
import test from 'node:test'
import { adminReviewSchema, listAdminReportsQuerySchema, listReportsQuerySchema } from '../src/validators/report.validator.js'

test('admin report list validation parses review status and pagination', () => {
  const result = listReportsQuerySchema.parse({ status: 'PENDING', page: '2', limit: '10' })
  assert.deepEqual(result, { status: 'PENDING', page: 2, limit: 10 })
})

test('admin report list accepts a user filter unavailable to standard report queries', () => {
  const result = listAdminReportsQuerySchema.parse({ userId: 'user-1', page: '3' })

  assert.deepEqual(result, { userId: 'user-1', page: 3, limit: 20 })
  assert.deepEqual(listReportsQuerySchema.parse({ userId: 'user-1' }), { page: 1, limit: 20 })
})

test('admin review accepts an optional review note only', () => {
  assert.equal(adminReviewSchema.safeParse({ reviewNote: 'Confirmed as a scam.' }).success, true)
  assert.equal(adminReviewSchema.safeParse({ status: 'APPROVED' }).success, true)
})
