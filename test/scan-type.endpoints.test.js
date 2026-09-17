import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { setImageStorageForTests, setOcrExtractorForTests } from '../src/services/scan-image.service.js'
import { setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests } from '../src/services/scan.service.js'
import { signToken } from '../src/utils/auth.js'

test('type-specific scan endpoints accept text, URL, and image input', async (t) => {
  setAuthRepositoryForTests({
    user: { findUnique: async () => ({ id: 'user-1', tokenVersion: 0, role: 'USER', status: 'ACTIVE' }) },
  })
  t.after(() => setAuthRepositoryForTests())

  let sequence = 0
  setScanRepositoryForTests({
    scan: { create: async ({ data, select }) => {
      const record = { id: `scan-${++sequence}`, createdAt: new Date(), scamCaseMatches: [], ...data }
      return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
    } },
    scamCase: { findMany: async () => [] },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async () => ({ matches: [] }))
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => ({
    riskLevel: 'HIGH', confidenceScore: 0.9, assessment: 'SUSPICIOUS', evidenceSufficiency: 'SUFFICIENT',
    riskSignals: [], summary: 'Suspicious input.', recommendedActions: ['Do not interact with it.'],
  }))
  t.after(() => setAiAnalyzerForTests())
  setOcrExtractorForTests(async () => ({ text: 'Send your OTP now', languages: 'eng', character_count: 17 }))
  t.after(() => setOcrExtractorForTests())
  setImageStorageForTests({ uploader: async ({ path }) => path, remover: async () => {} })
  t.after(() => setImageStorageForTests())

  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const headers = { authorization: `Bearer ${signToken('user-1', 0)}` }

  const textResponse = await fetch(`${baseUrl}/api/v1/scans/text`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'Send your OTP now' }),
  })
  const urlResponse = await fetch(`${baseUrl}/api/v1/scans/url`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'http://192.0.2.1/login' }),
  })
  const form = new FormData()
  form.append('image', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'scan.png')
  const imageResponse = await fetch(`${baseUrl}/api/v1/scans/image`, { method: 'POST', headers, body: form })

  assert.equal(textResponse.status, 201)
  assert.equal((await textResponse.json()).scan.inputType, 'TEXT')
  assert.equal(urlResponse.status, 201)
  assert.equal((await urlResponse.json()).scan.inputType, 'URL')
  assert.equal(imageResponse.status, 201)
  assert.equal((await imageResponse.json()).scan.inputType, 'IMAGE')
})
