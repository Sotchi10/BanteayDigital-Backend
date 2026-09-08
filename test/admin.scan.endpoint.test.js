import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { setScanRepositoryForTests } from '../src/services/scan.service.js'
import { signToken } from '../src/utils/auth.js'

test('only an administrator can retrieve another user\'s scan', async (t) => {
  setScanRepositoryForTests({
    scan: {
      findUnique: async ({ select }) => {
        const record = {
          id: 'scan-1', userId: 'scan-owner', inputType: 'TEXT', rawInput: 'scan text', normalizedInput: 'scan text',
          findings: [], assessment: 'SUSPICIOUS', deterministicAssessment: 'INSUFFICIENT_EVIDENCE', score: 0,
          analysisSummary: 'Grounded result', analysisReasons: [], recommendedActions: [], analysisSource: 'GEMINI_GROUNDED',
          citedCaseIds: [], retrievalEvidence: { status: 'AVAILABLE', matches: [] }, createdAt: new Date(), scamCaseMatches: [],
        }
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
      },
    },
  })
  t.after(() => setScanRepositoryForTests())
  setAuthRepositoryForTests({
    user: { findUnique: async ({ where }) => ({ id: where.id, tokenVersion: 0, status: 'ACTIVE', role: where.id === 'admin-1' ? 'ADMIN' : 'USER' }) },
  })
  t.after(() => setAuthRepositoryForTests())

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()

  const adminResponse = await fetch(`http://127.0.0.1:${port}/api/v1/scans/scan-1`, {
    headers: { authorization: `Bearer ${signToken('admin-1', 0)}` },
  })
  const userResponse = await fetch(`http://127.0.0.1:${port}/api/v1/admin/scans/scan-1`, {
    headers: { authorization: `Bearer ${signToken('user-1', 0)}` },
  })

  assert.equal(adminResponse.status, 200)
  assert.equal((await adminResponse.json()).scan.userId, 'scan-owner')
  assert.equal(userResponse.status, 403)
})
