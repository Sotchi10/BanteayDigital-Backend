import assert from 'node:assert/strict'
import test from 'node:test'
import { hasValidImageSignature } from '../src/middleware/scan-image-upload.middleware.js'

test('image upload validation rejects MIME-spoofed files in memory', () => {
  assert.equal(hasValidImageSignature({
    mimetype: 'image/png',
    buffer: Buffer.from('not a PNG'),
  }), false)
  assert.equal(hasValidImageSignature({
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  }), true)
})
