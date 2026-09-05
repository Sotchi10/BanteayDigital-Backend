import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setScanRepositoryForTests } from '../src/services/scan.service.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { signToken } from '../src/utils/auth.js'

test('POST /api/v1/scans validates, scans, saves, and returns a result', async (t) => {
  const saved = []
  setScanRepositoryForTests({
    scamCase: { findMany: async () => [] },
    scan: { create: async ({ data, select }) => {
      const record = { id: 'scan-1', createdAt: new Date('2026-08-28T00:00:00.000Z'), scamCaseMatches: [], ...data }
      saved.push(record)
      return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
    } },
  })
  t.after(() => setScanRepositoryForTests())
  setAuthRepositoryForTests({
    user: { findUnique: async () => ({ id: 'user-1', tokenVersion: 0, role: 'USER', status: 'ACTIVE' }) },
  })
  t.after(() => setAuthRepositoryForTests())

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/scans`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${signToken('user-1', 0)}` },
    body: JSON.stringify({ type: 'TEXT', value: 'Urgent: please send your OTP now.' }),
  })
  const body = await response.json()

  assert.equal(response.status, 201)
  assert.equal(body.scan.id, 'scan-1')
  assert.equal(body.scan.assessment, 'SUSPICIOUS')
  assert.equal(body.scan.score, 50)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].inputType, 'TEXT')
  assert.equal(saved[0].userId, 'user-1')
  assert.ok(Array.isArray(body.scan.recommendations))
  assert.deepEqual(body.scan.matchedScamCases, [])
})
