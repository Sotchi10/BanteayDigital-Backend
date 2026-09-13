import multer from 'multer'
import ApiError from '../utils/api-error.js'

const MAX_SCAN_IMAGE_BYTES = 10 * 1024 * 1024
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

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
    return next(error)
  })
}

export { MAX_SCAN_IMAGE_BYTES, uploadScanImageIfMultipart }
