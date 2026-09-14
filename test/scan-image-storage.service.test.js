import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicScanImageUrl, uploadScanImage } from '../src/services/scan-image-storage.service.js'

test('a signed community-image URL is never created for an unsafe storage path', async () => {
  assert.equal(await getPublicScanImageUrl('../../private-file.png'), null)
  assert.equal(await getPublicScanImageUrl('scans/user-1/scan-1/../private-file.png'), null)
  assert.equal(await getPublicScanImageUrl('https://untrusted.example/image.png'), null)
})

test('storage upload rejects unsafe object paths before contacting Supabase', async () => {
  await assert.rejects(
    uploadScanImage({ path: 'scans/user-1/scan-1/../private.png', image: { buffer: Buffer.from([]), mimetype: 'image/png' } }),
    { statusCode: 400 },
  )
})
