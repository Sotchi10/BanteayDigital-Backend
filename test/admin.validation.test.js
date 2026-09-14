import assert from 'node:assert/strict'
import test from 'node:test'
import { listAuditLogsQuerySchema, listUsersQuerySchema } from '../src/validators/admin.validator.js'
import { updateManagedReportSchema } from '../src/validators/report.validator.js'

test('admin user query accepts allowlisted account statuses', () => {
  const parsed = listUsersQuerySchema.parse({ page: '2', limit: '50', search: 'reporter', status: 'SUSPENDED' })
  assert.deepEqual(parsed, { page: 2, limit: 50, search: 'reporter', status: 'SUSPENDED' })
  assert.equal(listUsersQuerySchema.safeParse({ status: 'ADMIN' }).success, false)
})

test('admin audit query applies safe pagination limits', () => {
  assert.deepEqual(listAuditLogsQuerySchema.parse({}), { page: 1, limit: 20 })
  assert.equal(listAuditLogsQuerySchema.safeParse({ limit: 101 }).success, false)
})

test('managed report edits require at least one validated public field', () => {
  assert.equal(updateManagedReportSchema.safeParse({}).success, false)
  assert.equal(updateManagedReportSchema.safeParse({ title: 'Updated warning' }).success, true)
  assert.equal(updateManagedReportSchema.safeParse({ content: 'too short' }).success, false)
})
