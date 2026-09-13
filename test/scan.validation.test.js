import assert from 'node:assert/strict'
import test from 'node:test'
import { scanSchema } from '../src/validators/scan.validator.js'

test('scan validation rejects malformed URL and blank text', () => {
  assert.equal(scanSchema.safeParse({ inputType: 'URL', value: 'not a url' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'URL', value: 'not a url' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'URL', value: 'ftp://example.com' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'TEXT', value: '   ' }).success, false)
})
