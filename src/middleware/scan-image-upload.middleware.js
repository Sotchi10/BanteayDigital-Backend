import multer from 'multer'
import ApiError from '../utils/api-error.js'

const MAX_SCAN_IMAGE_BYTES = 10 * 1024 * 1024
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

const hasPrefix = (buffer, bytes) => bytes.every((byte, index) => buffer[index] === byte)

const hasValidImageSignature = (file) => {
  const { buffer, mimetype } = file
  if (!Buffer.isBuffer(buffer)) return false
  if (mimetype === 'image/png') return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mimetype === 'image/jpeg') return hasPrefix(buffer, [0xff, 0xd8, 0xff])
  return mimetype === 'image/webp'
    && hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46])
    && buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SCAN_IMAGE_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!supportedImageTypes.has(file.mimetype)) {
      callback(new ApiError(415, 'Image must be a PNG, JPG, JPEG, or WEBP file'))
      return
    }
    callback(null, true)
  },
})

const uploadScanImageIfMultipart = (request, response, next) => {
  if (!request.is('multipart/form-data')) return next()
  uploader.single('image')(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'Image must not exceed 10 MB'))
    }
    if (error instanceof multer.MulterError) {
      return next(new ApiError(400, 'Invalid image upload'))
    }
    if (error) return next(error)
    if (!request.file) return next(new ApiError(400, 'An image file is required'))
    if (!hasValidImageSignature(request.file)) {
      return next(new ApiError(415, 'Image contents do not match a supported PNG, JPG, JPEG, or WEBP file'))
    }
    return next()
  })
}

export { MAX_SCAN_IMAGE_BYTES, hasValidImageSignature, uploadScanImageIfMultipart }
