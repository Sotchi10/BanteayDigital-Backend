import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { setAlertRepositoryForTests } from '../src/services/alert.service.js'
import { signToken } from '../src/utils/auth.js'

const makeAlertRepository = () => {
  const now = new Date('2026-09-19T08:00:00.000Z')
  const records = [
    {
      id: 'published-alert',
      title: 'Security warning',
      content: 'Do not share your one-time password.',
      isPublished: true,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'draft-alert',
      title: 'Maintenance draft',
      content: 'This alert is not ready yet.',
      isPublished: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ]

  return {
    records,
    alertMessage: {
      findMany: async ({ where, skip = 0, take = records.length }) => records
        .filter((alert) => where?.isPublished === undefined || alert.isPublished === where.isPublished)
        .slice(skip, skip + take),
      count: async ({ where } = {}) => records
        .filter((alert) => where?.isPublished === undefined || alert.isPublished === where.isPublished)
        .length,
      findUnique: async ({ where }) => records.find((alert) => alert.id === where.id) || null,
      create: async ({ data }) => {
        const alert = {
          id: `alert-${records.length + 1}`,
          ...data,
          isPublished: false,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        }
        records.push(alert)
        return alert
      },
      update: async ({ where, data }) => {
        const index = records.findIndex((alert) => alert.id === where.id)
        records[index] = { ...records[index], ...data, updatedAt: now }
        return records[index]
      },
      delete: async ({ where }) => {
        const index = records.findIndex((alert) => alert.id === where.id)
        return records.splice(index, 1)[0]
      },
    },
  }
}

test('official alert endpoints expose published alerts and support admin CRUD', async (t) => {
  const repository = makeAlertRepository()
  setAlertRepositoryForTests(repository)
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
  t.after(() => {
    setAlertRepositoryForTests()
    setAuthRepositoryForTests()
  })

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}/api/v1`
  const adminHeaders = {
    authorization: `Bearer ${signToken('admin-1', 0)}`,
    'content-type': 'application/json',
  }
  const userHeaders = { authorization: `Bearer ${signToken('user-1', 0)}` }

  const publicResponse = await fetch(`${baseUrl}/alerts`)
  assert.equal(publicResponse.status, 200)
  const publicPayload = await publicResponse.json()
  assert.deepEqual(publicPayload.alerts.map(({ id }) => id), ['published-alert'])

  const [unauthorizedResponse, forbiddenResponse, adminListResponse] = await Promise.all([
    fetch(`${baseUrl}/admin/alerts`),
    fetch(`${baseUrl}/admin/alerts`, { headers: userHeaders }),
    fetch(`${baseUrl}/admin/alerts`, { headers: adminHeaders }),
  ])
  assert.equal(unauthorizedResponse.status, 401)
  assert.equal(forbiddenResponse.status, 403)
  assert.equal(adminListResponse.status, 200)
  assert.equal((await adminListResponse.json()).alerts.length, 2)

  const invalidCreateResponse = await fetch(`${baseUrl}/admin/alerts`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: '', content: '' }),
  })
  assert.equal(invalidCreateResponse.status, 400)

  const createResponse = await fetch(`${baseUrl}/admin/alerts`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Planned maintenance',
      content: 'Service may be briefly unavailable tonight.',
      isPublished: true,
    }),
  })
  assert.equal(createResponse.status, 201)
  const created = (await createResponse.json()).alert
  assert.equal(created.isPublished, false)

  const updateResponse = await fetch(`${baseUrl}/admin/alerts/${created.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Maintenance complete' }),
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).alert.title, 'Maintenance complete')

  const publishResponse = await fetch(`${baseUrl}/admin/alerts/${created.id}/publish`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ isPublished: true }),
  })
  assert.equal(publishResponse.status, 200)
  const published = (await publishResponse.json()).alert
  assert.equal(published.isPublished, true)
  assert.ok(published.publishedAt)

  const unpublishResponse = await fetch(`${baseUrl}/admin/alerts/${created.id}/publish`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ isPublished: false }),
  })
  assert.equal(unpublishResponse.status, 200)
  assert.equal((await unpublishResponse.json()).alert.publishedAt, null)

  const deleteResponse = await fetch(`${baseUrl}/admin/alerts/${created.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(deleteResponse.status, 204)
  assert.equal(repository.records.some(({ id }) => id === created.id), false)
})
