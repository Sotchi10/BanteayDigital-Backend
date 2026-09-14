import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicScanImageUrl } from '../src/services/scan-image-storage.service.js'

test('a signed community-image URL is never created for an unsafe storage path', async () => {
  assert.equal(await getPublicScanImageUrl('../../private-file.png'), null)
  assert.equal(await getPublicScanImageUrl('scans/user-1/scan-1/../private-file.png'), null)
  assert.equal(await getPublicScanImageUrl('https://untrusted.example/image.png'), null)
})
