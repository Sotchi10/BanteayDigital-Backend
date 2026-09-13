import { createClient } from '@supabase/supabase-js'
import env from '../config/env.js'
import ApiError from '../utils/api-error.js'

let storageClient

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

export { removeScanImage, uploadScanImage }
