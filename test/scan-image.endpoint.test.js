import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { setAuthRepositoryForTests } from '../src/middleware/auth.middleware.js'
import { setImageStorageForTests, setOcrExtractorForTests } from '../src/services/scan-image.service.js'
import { setAiAnalyzerForTests, setAiRetrieverForTests, setScanRepositoryForTests } from '../src/services/scan.service.js'
import { signToken } from '../src/utils/auth.js'

const activeUser = {
  user: { findUnique: async () => ({ id: 'user-1', tokenVersion: 0, role: 'USER', status: 'ACTIVE' }) },
}

const startServer = async (t) => {
  const server = http.createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  return `http://127.0.0.1:${server.address().port}`
}

const configureImageScanDependencies = (t) => {
  setImageStorageForTests({
    uploader: async ({ path, image }) => {
      assert.match(path, /^scans\/user-1\/[0-9a-f-]+\/image\.png$/)
      assert.equal(image.size, 8)
      return path
    },
    remover: async () => {},
  })
  t.after(() => setImageStorageForTests())
  setScanRepositoryForTests({
    scamCase: { findMany: async () => [] },
    scan: { create: async ({ data, select }) => {
      assert.equal(data.imageMimeType, 'image/png')
      assert.equal(data.imageSize, 8)
      assert.match(data.imageStoragePath, /^scans\/user-1\/[0-9a-f-]+\/image\.png$/)
      const record = { id: 'image-scan-1', createdAt: new Date('2026-09-12T00:00:00.000Z'), scamCaseMatches: [], ...data }
      return Object.fromEntries(Object.keys(select).map((key) => [key, key === 'scamCaseMatches' ? [] : record[key]]))
    } },
  })
  t.after(() => setScanRepositoryForTests())
  setAiRetrieverForTests(async ({ type, value }) => {
    assert.equal(type, 'TEXT')
    assert.equal(value, 'Send your OTP now')
    return { matches: [] }
  })
  t.after(() => setAiRetrieverForTests())
  setAiAnalyzerForTests(async () => ({
    assessment: 'SUSPICIOUS', summary: 'The image text requests an OTP.', recommendedActions: ['Do not share your OTP.'],
  }))
  t.after(() => setAiAnalyzerForTests())
}

test('POST /api/v1/scans analyzes an IMAGE through the text scan flow', async (t) => {
  setAuthRepositoryForTests(activeUser)
  t.after(() => setAuthRepositoryForTests())
  setOcrExtractorForTests(async (image) => {
    assert.equal(image.originalname, 'scan.png')
    assert.equal(image.mimetype, 'image/png')
    return { text: 'Send your OTP now', languages: 'khm+eng', character_count: 17 }
  })
  t.after(() => setOcrExtractorForTests())
  configureImageScanDependencies(t)
  const baseUrl = await startServer(t)
  const form = new FormData()
  form.append('inputType', 'IMAGE')
  form.append('image', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'scan.png')

  const response = await fetch(`${baseUrl}/api/v1/scans`, {
    method: 'POST',
    headers: { authorization: `Bearer ${signToken('user-1', 0)}` },
    body: form,
  })

  assert.equal(response.status, 201)
  const body = await response.json()
  assert.match(body.scan.id, /^[0-9a-f-]{36}$/)
  assert.equal(body.scan.inputType, 'IMAGE')
  assert.equal(body.scan.rawInput, 'Send your OTP now')
  assert.equal(body.scan.analysis.source, 'GEMINI_SIMPLE')
})

test('POST /api/v1/scans rejects unsupported image types', async (t) => {
  setAuthRepositoryForTests(activeUser)
  t.after(() => setAuthRepositoryForTests())
  const baseUrl = await startServer(t)
  const form = new FormData()
  form.append('inputType', 'IMAGE')
  form.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'note.txt')

  const response = await fetch(`${baseUrl}/api/v1/scans`, {
    method: 'POST',
    headers: { authorization: `Bearer ${signToken('user-1', 0)}` },
    body: form,
  })

  assert.equal(response.status, 415)
  assert.deepEqual(await response.json(), { message: 'Image must be a PNG, JPG, JPEG, or WEBP file' })
})

test('POST /api/v1/scans returns NO_READABLE_TEXT without retrieval', async (t) => {
  setAuthRepositoryForTests(activeUser)
  t.after(() => setAuthRepositoryForTests())
  setOcrExtractorForTests(async () => ({ text: '   ', languages: 'khm+eng', character_count: 0 }))
  t.after(() => setOcrExtractorForTests())
  let removedPath
  setImageStorageForTests({
    uploader: async ({ path }) => path,
    remover: async (path) => { removedPath = path },
  })
  t.after(() => setImageStorageForTests())
  setAiRetrieverForTests(async () => { throw new Error('Retrieval must not run') })
  t.after(() => setAiRetrieverForTests())
  const baseUrl = await startServer(t)
  const form = new FormData()
  form.append('inputType', 'IMAGE')
  form.append('image', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'empty.png')

  const response = await fetch(`${baseUrl}/api/v1/scans`, {
    method: 'POST',
    headers: { authorization: `Bearer ${signToken('user-1', 0)}` },
    body: form,
  })

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: 'No readable text was found in the image',
    details: { code: 'NO_READABLE_TEXT' },
  })
  assert.match(removedPath, /^scans\/user-1\/[0-9a-f-]+\/image\.png$/)
})
