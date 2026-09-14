import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { setAdminRepositoryForTests } from '../src/services/admin.service.js'
import { signToken } from '../src/utils/auth.js'

test('admin console endpoints require ADMIN and return integration data', async (t) => {
  setAuthRepositoryForTests({
    user: {
      findUnique: async ({ where }) => ({
        id: where.id,
        tokenVersion: 0,
        status: 'ACTIVE',
        role: where.id === 'admin-1' ? 'ADMIN' : 'USER',
      }),
    },
  })
  t.after(() => setAuthRepositoryForTests())

  setAdminRepositoryForTests({
    scan: { count: async () => 4, findMany: async () => [] },
    scamReport: {
      count: async ({ where } = {}) => where?.status === 'PENDING' ? 1 : where?.status === 'APPROVED' ? 2 : 3,
      groupBy: async () => [{ status: 'PENDING', _count: { _all: 1 } }, { status: 'APPROVED', _count: { _all: 2 } }],
      findMany: async () => [],
    },
    communityPost: { findMany: async () => [] },
    user: { count: async () => 0, findMany: async () => [] },
  })
  t.after(() => setAdminRepositoryForTests())

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()
  const adminHeaders = { authorization: `Bearer ${signToken('admin-1', 0)}` }
  const userHeaders = { authorization: `Bearer ${signToken('user-1', 0)}` }

  const [dashboardResponse, usersResponse, logsResponse, forbiddenResponse] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/v1/admin/dashboard`, { headers: adminHeaders }),
    fetch(`http://127.0.0.1:${port}/api/v1/admin/users`, { headers: adminHeaders }),
    fetch(`http://127.0.0.1:${port}/api/v1/admin/audit-logs`, { headers: adminHeaders }),
    fetch(`http://127.0.0.1:${port}/api/v1/admin/dashboard`, { headers: userHeaders }),
  ])

  assert.equal(dashboardResponse.status, 200)
  assert.equal((await dashboardResponse.json()).stats.totalScans, 4)
  assert.equal(usersResponse.status, 200)
  assert.deepEqual((await usersResponse.json()).users, [])
  assert.equal(logsResponse.status, 200)
  assert.deepEqual((await logsResponse.json()).logs, [])
  assert.equal(forbiddenResponse.status, 403)
})
