import {
  addReportEvidence,
  createReport,
  deleteReport,
  deleteReportEvidence,
  getMyReports,
  getReportById,
  updateReport,
} from '../services/report.service.js'
import asyncHandler from '../utils/async-handler.js'
import { mapMimeToEvidenceType } from '../middleware/upload.middleware.js'
import ApiError from '../utils/api-error.js'

const create = asyncHandler(async (request, response) => {
  const report = await createReport({
    userId: request.auth.userId,
    data: request.body,
  })

  response.status(201).json({
    message: 'Report created successfully',
    report,
  })
})

const listMyReports = asyncHandler(async (request, response) => {
  const result = await getMyReports({
    userId: request.auth.userId,
    query: request.query,
  })

  response.status(200).json(result)
})

const getById = asyncHandler(async (request, response) => {
  const report = await getReportById({
    id: request.params.id,
    userAuth: request.auth,
  })

  response.status(200).json({ report })
})

const update = asyncHandler(async (request, response) => {
  const report = await updateReport({
    id: request.params.id,
    userAuth: request.auth,
    data: request.body,
  })

  response.status(200).json({
    message: 'Report updated successfully',
    report,
  })
})

const remove = asyncHandler(async (request, response) => {
  const result = await deleteReport({
    id: request.params.id,
    userAuth: request.auth,
  })

  response.status(200).json(result)
})

const uploadEvidence = asyncHandler(async (request, response) => {
  const reportId = request.params.id
  let evidenceItems = []

  // Check if multipart files were uploaded via multer
  if (request.files && Array.isArray(request.files) && request.files.length > 0) {
    evidenceItems = request.files.map((file) => ({
      fileUrl: `/uploads/evidence/${file.filename}`,
      fileName: file.originalname,
      fileType: mapMimeToEvidenceType(file.mimetype),
      fileSize: file.size,
      mimeType: file.mimetype,
      isPublicSafe: request.body.isPublicSafe === 'true' || request.body.isPublicSafe === true,
    }))
  } else if (request.file) {
    evidenceItems = [
      {
        fileUrl: `/uploads/evidence/${request.file.filename}`,
        fileName: request.file.originalname,
        fileType: mapMimeToEvidenceType(request.file.mimetype),
        fileSize: request.file.size,
        mimeType: request.file.mimetype,
        isPublicSafe: request.body.isPublicSafe === 'true' || request.body.isPublicSafe === true,
      },
    ]
  } else if (request.body.fileUrl) {
    // Direct URL attachment via JSON payload
    evidenceItems = [
      {
        fileUrl: request.body.fileUrl,
        fileName: request.body.fileName || 'Attached Evidence',
        fileType: request.body.fileType || 'IMAGE',
        fileSize: request.body.fileSize || 0,
        mimeType: request.body.mimeType,
        isPublicSafe: Boolean(request.body.isPublicSafe),
      },
    ]
  } else {
    throw new ApiError(400, 'No file or fileUrl provided in request')
  }

  const created = await addReportEvidence({
    reportId,
    userAuth: request.auth,
    evidenceItems,
  })

  response.status(201).json({
    message: 'Evidence attached successfully',
    evidence: created,
  })
})

const removeEvidence = asyncHandler(async (request, response) => {
  const result = await deleteReportEvidence({
    reportId: request.params.id,
    evidenceId: request.params.evidenceId,
    userAuth: request.auth,
  })

  response.status(200).json(result)
})

export {
  create,
  listMyReports,
  getById,
  update,
  remove,
  uploadEvidence,
  removeEvidence,
}
