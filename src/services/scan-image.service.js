import { randomUUID } from 'node:crypto'
import ApiError from '../utils/api-error.js'
import { extractImageText } from './ai-service.client.js'
import { createScan } from './scan.service.js'
import { removeScanImage, uploadScanImage } from './scan-image-storage.service.js'

let ocrExtractor = extractImageText
let imageUploader = uploadScanImage
let imageRemover = removeScanImage

const storageFilename = (filename) => filename
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(-160) || 'scan-image'

const createImageScan = async ({ userId, image }) => {
  if (!image) throw new ApiError(400, 'An image file is required')

  const scanId = randomUUID()
  const path = `scans/${userId}/${scanId}/${storageFilename(image.originalname)}`
  let storagePath
  try {
    storagePath = await imageUploader({ path, image })
    const extraction = await ocrExtractor(image)
    const text = extraction.text?.trim() || ''
    if (!text) {
      throw new ApiError(422, 'No readable text was found in the image', { code: 'NO_READABLE_TEXT' })
    }

    // OCR turns the image into text; all detection, retrieval, and explanation
    // remains on the established text-analysis path. Store IMAGE so the scan's
    // provenance remains accurate without sending an unsupported type to AI APIs.
    return await createScan({
      id: scanId, userId, type: 'TEXT', inputType: 'IMAGE', value: text,
      imageMetadata: { imageStoragePath: storagePath, imageMimeType: image.mimetype, imageSize: image.size },
    })
  } catch (error) {
    await imageRemover(storagePath)
    throw error
  }
}

const setOcrExtractorForTests = (extractor) => {
  ocrExtractor = extractor || extractImageText
}

const setImageStorageForTests = ({ uploader, remover } = {}) => {
  imageUploader = uploader || uploadScanImage
  imageRemover = remover || removeScanImage
}

export { createImageScan, setImageStorageForTests, setOcrExtractorForTests }
