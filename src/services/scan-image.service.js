import { randomUUID } from 'node:crypto'
import ApiError from '../utils/api-error.js'
import { extractImageText } from './ai-service.client.js'
import { createScan } from './scan.service.js'
import { removeScanImage, uploadScanImage } from './scan-image-storage.service.js'
import { extractImageTextLocally } from './local-ocr.service.js'
import env from '../config/env.js'

let ocrExtractor = extractImageText
let localOcrExtractor = extractImageTextLocally
let imageUploader = uploadScanImage
let imageRemover = removeScanImage

const imageExtensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

const isSafeStorageSegment = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value)

const createImageScan = async ({ userId, image, language }) => {
  if (!image) throw new ApiError(400, 'An image file is required')
  if (!isSafeStorageSegment(userId) || !imageExtensions[image.mimetype]) {
    throw new ApiError(400, 'Invalid image upload')
  }

  const scanId = randomUUID()
  const path = `scans/${userId}/${scanId}/image.${imageExtensions[image.mimetype]}`
  let storagePath
  try {
    // A report created from this scan must retain its original image. Abort the
    // scan if durable storage is unavailable instead of creating a text-only
    // record that can never show its evidence in the community feed.
    storagePath = await imageUploader({ path, image })

    let extraction
    try {
      extraction = await ocrExtractor(image)
    } catch (error) {
      if (error?.statusCode !== 503 || !env.enableLocalOcr) throw error
      extraction = await localOcrExtractor(image)
    }
    const text = extraction.text?.trim() || ''
    if (!text) {
      throw new ApiError(422, 'No readable text was found in the image', { code: 'NO_READABLE_TEXT' })
    }

    // OCR turns the image into text; all detection, retrieval, and explanation
    // remains on the established text-analysis path. Store IMAGE so the scan's
    // provenance remains accurate without sending an unsupported type to AI APIs.
    return await createScan({
      id: scanId, userId, type: 'TEXT', inputType: 'IMAGE', value: text, language,
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

const setLocalOcrExtractorForTests = (extractor) => {
  localOcrExtractor = extractor || extractImageTextLocally
}

const setImageStorageForTests = ({ uploader, remover } = {}) => {
  imageUploader = uploader || uploadScanImage
  imageRemover = remover || removeScanImage
}

export { createImageScan, setImageStorageForTests, setLocalOcrExtractorForTests, setOcrExtractorForTests }
