import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboard, listAuditLogs, listUsers, setAdminRepositoryForTests } from '../src/services/admin.service.js'

test('admin dashboard returns live totals and complete chart series', async (t) => {
  setAdminRepositoryForTests({
    scan: {
      count: async () => 42,
      findMany: async () => [{ createdAt: new Date() }],
    },
    scamReport: {
      count: async ({ where } = {}) => where?.status === 'PENDING' ? 3 : where?.status === 'APPROVED' ? 7 : 12,
      groupBy: async () => [
        { status: 'PENDING', _count: { _all: 3 } },
        { status: 'APPROVED', _count: { _all: 7 } },
        { status: 'REJECTED', _count: { _all: 2 } },
      ],
    },
  })
  t.after(() => setAdminRepositoryForTests())

  const dashboard = await getDashboard()
  assert.deepEqual(dashboard.stats, { totalScans: 42, totalReports: 12, pendingReports: 3, approvedReports: 7 })
  assert.equal(dashboard.scanActivityData.week.length, 7)
  assert.equal(dashboard.scanActivityData.month.length, 30)
  assert.equal(dashboard.scanActivityData.year.length, 12)
  assert.deepEqual(dashboard.reportDistributionData.map(({ count }) => count), [3, 7, 2])
})

test('admin user list excludes administrators and returns activity totals', async (t) => {
  let listWhere
  setAdminRepositoryForTests({
    user: {
      findMany: async ({ where }) => {
        listWhere = where
        return [{
          id: 'user-1', name: 'Reporter', email: 'reporter@example.com', phone_num: null,
          avatarUrl: null, status: 'ACTIVE', createdAt: new Date(), _count: { reports: 4 },
          reports: [{ id: 'published-1' }],
        }]
      },
      count: async ({ where }) => where.reports?.some?.communityPost ? 1 : where.reports ? 2 : 5,
    },
  })
  t.after(() => setAdminRepositoryForTests())

  const result = await listUsers({ query: { page: 1, limit: 20, search: 'report', status: 'ACTIVE' } })
  assert.equal(listWhere.role, 'USER')
  assert.equal(result.users[0].reportCount, 4)
  assert.equal(result.users[0].publishedReportCount, 1)
  assert.equal(result.stats.totalUsers, 5)
})

test('audit feed combines review and publication events chronologically', async (t) => {
  const now = Date.now()
  setAdminRepositoryForTests({
    scamReport: {
      findMany: async () => [{
        id: 'report-1', status: 'APPROVED', reviewNote: null, reviewedAt: new Date(now - 1000),
        reviewedBy: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
      }],
    },
    communityPost: {
      findMany: async () => [{
        id: 'post-1', reportId: 'report-1', title: 'Safety notice', publishedAt: new Date(now),
        author: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
      }],
    },
  })
  t.after(() => setAdminRepositoryForTests())

  const result = await listAuditLogs({ query: { page: 1, limit: 20 } })
  assert.deepEqual(result.logs.map(({ action }) => action), ['Published', 'Approved'])
  assert.equal(result.logs[0].reference, 'report-1')
})
