import { createClient } from '@supabase/supabase-js'
import env from '../config/env.js'
import ApiError from '../utils/api-error.js'

let storageClient
const PUBLIC_POST_IMAGE_TTL_SECONDS = 5 * 60
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

const isSafeScanImagePath = (value) => (
  typeof value === 'string'
  && /^scans\/[^/]+\/[^/]+\/[^/]+$/.test(value)
  && !value.includes('..')
)

const getStorageClient = () => {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabaseStorageBucket) {
    throw new ApiError(503, 'Image storage is not configured')
  }
  storageClient ||= createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return storageClient
}

const uploadScanImage = async ({ path, image }) => {
  if (!isSafeScanImagePath(path) || !image || !Buffer.isBuffer(image.buffer) || !supportedImageTypes.has(image.mimetype)) {
    throw new ApiError(400, 'Invalid image upload')
  }

  const { error } = await getStorageClient().storage.from(env.supabaseStorageBucket).upload(path, image.buffer, {
    contentType: image.mimetype,
    upsert: false,
  })
  if (error) throw new ApiError(503, 'Image storage is unavailable')
  return path
}

const removeScanImage = async (path) => {
  if (!path) return
  try {
    await getStorageClient().storage.from(env.supabaseStorageBucket).remove([path])
  } catch {
    // The original scan error remains the useful response. An orphaned object
    // can be cleaned through normal storage lifecycle tooling if needed.
  }
}

// Images may be stored in a private bucket. Generate a short-lived URL for an
// approved community post instead of assuming the bucket is publicly readable.
const getPublicScanImageUrl = async (path) => {
  if (!isSafeScanImagePath(path)) return null
  try {
    const { data, error } = await getStorageClient().storage
      .from(env.supabaseStorageBucket)
      .createSignedUrl(path, PUBLIC_POST_IMAGE_TTL_SECONDS)
    return error ? null : data?.signedUrl || null
  } catch {
    // Storage is optional for scans. A missing image must not make the public
    // feed unavailable; the post text can still be shown.
    return null
  }
}

export { getPublicScanImageUrl, removeScanImage, uploadScanImage }
