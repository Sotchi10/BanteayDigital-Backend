import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import ApiError from '../utils/api-error.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/evidence')

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
    const ext = path.extname(file.originalname).toLowerCase()
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    cb(null, `${baseName}-${uniqueSuffix}${ext}`)
  },
})

const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', 'IMAGE'],
  ['image/png', 'IMAGE'],
  ['image/webp', 'IMAGE'],
  ['image/gif', 'IMAGE'],
  ['application/pdf', 'DOCUMENT'],
  ['video/mp4', 'VIDEO'],
  ['audio/mpeg', 'AUDIO'],
  ['audio/mp4', 'AUDIO'],
  ['audio/wav', 'AUDIO'],
  ['audio/x-m4a', 'AUDIO'],
])

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, PDF, MP4, MP3, WAV.`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
    files: 5, // Up to 5 files per request
  },
})

const mapMimeToEvidenceType = (mimetype) => ALLOWED_MIME_TYPES.get(mimetype) || 'IMAGE'

export { upload, mapMimeToEvidenceType, UPLOAD_DIR }
