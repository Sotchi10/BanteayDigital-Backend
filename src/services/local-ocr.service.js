import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import ApiError from '../utils/api-error.js'

const OCR_TIMEOUT_MS = 30000
const MAX_OCR_OUTPUT_BYTES = 1024 * 1024

const tesseractCommand = () => {
  const configured = process.env.TESSERACT_CMD?.trim()
  if (configured) return configured

  const windowsCandidates = [
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
    'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
  ]
  return windowsCandidates.find((candidate) => existsSync(candidate)) || 'tesseract'
}

const extractImageTextLocally = (image) => new Promise((resolve, reject) => {
  const processHandle = spawn(tesseractCommand(), ['stdin', 'stdout', '-l', 'eng'], {
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
  })
  const output = []
  let outputBytes = 0
  let settled = false

  const finishWithError = () => {
    if (settled) return
    settled = true
    reject(new ApiError(503, 'OCR service is unavailable'))
  }

  const timeout = setTimeout(() => {
    processHandle.kill()
    finishWithError()
  }, OCR_TIMEOUT_MS)

  processHandle.on('error', () => {
    clearTimeout(timeout)
    finishWithError()
  })
  processHandle.stdout.on('data', (chunk) => {
    outputBytes += chunk.length
    if (outputBytes > MAX_OCR_OUTPUT_BYTES) {
      processHandle.kill()
      clearTimeout(timeout)
      finishWithError()
      return
    }
    output.push(chunk)
  })
  processHandle.on('close', (code) => {
    clearTimeout(timeout)
    if (settled) return
    if (code !== 0) {
      finishWithError()
      return
    }
    settled = true
    const text = Buffer.concat(output).toString('utf8').trim()
    resolve({ text, languages: 'eng', character_count: text.length, source: 'LOCAL_TESSERACT' })
  })

  processHandle.stdin.on('error', finishWithError)
  processHandle.stdin.end(image.buffer)
})

export { extractImageTextLocally }
