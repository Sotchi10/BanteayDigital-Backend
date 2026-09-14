import assert from 'node:assert/strict'
import test from 'node:test'
import { scanSchema } from '../src/validators/scan.validator.js'

test('scan validation rejects malformed URL and blank text', () => {
  assert.equal(scanSchema.safeParse({ inputType: 'URL', value: 'not a url' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'URL', value: 'not a url' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'URL', value: 'ftp://example.com' }).success, false)
  assert.equal(scanSchema.safeParse({ type: 'TEXT', value: '   ' }).success, false)
})

test('scan validation defaults missing and unsupported explanation languages to English', () => {
  assert.equal(scanSchema.parse({ inputType: 'TEXT', value: 'hello' }).language, 'en')
  assert.equal(scanSchema.parse({ inputType: 'TEXT', value: 'hello', language: 'fr' }).language, 'en')
  assert.equal(scanSchema.parse({ inputType: 'TEXT', value: 'hello', language: 'km' }).language, 'km')
})
