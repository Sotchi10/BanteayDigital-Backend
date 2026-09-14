import { createHmac } from 'node:crypto'
import env from '../config/env.js'
import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const GUEST_SCAN_LIMIT = 1
const AUTHENTICATED_SCAN_LIMIT = 3
const AUTHENTICATED_IMAGE_UPLOAD_LIMIT = 1
const AUTHENTICATED_REPORT_LIMIT = 4

let quotaRepository = prisma

const quotaDateFor = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.dailyQuotaTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

const guestIdentifierForIp = (ip) => createHmac('sha256', env.guestQuotaHashSecret)
  .update(ip || 'unknown')
  .digest('hex')

const quotaExceeded = (message) => new ApiError(429, message)

const consumeGuestScanQuota = async ({ ip, quotaDate = quotaDateFor() }) => {
  const guestIdentifier = guestIdentifierForIp(ip)
  return quotaRepository.$transaction(async (tx) => {
    await tx.guestDailyUsage.upsert({
      where: { guestIdentifier_quotaDate: { guestIdentifier, quotaDate } },
      create: { guestIdentifier, quotaDate },
      update: {},
    })
    const result = await tx.guestDailyUsage.updateMany({
      where: { guestIdentifier, quotaDate, scanCount: { lt: GUEST_SCAN_LIMIT } },
      data: { scanCount: { increment: 1 } },
    })
    if (result.count !== 1) {
      throw quotaExceeded('Your daily guest scan limit has been reached. Sign in to receive a higher daily allowance.')
    }
  })
}

const consumeAuthenticatedQuota = async ({ userId, resources, quotaDate = quotaDateFor() }) => {
  return quotaRepository.$transaction(async (tx) => {
    await tx.userDailyUsage.upsert({
      where: { userId_quotaDate: { userId, quotaDate } },
      create: { userId, quotaDate },
      update: {},
    })

    for (const { field, limit, message } of resources) {
      const result = await tx.userDailyUsage.updateMany({
        where: { userId, quotaDate, [field]: { lt: limit } },
        data: { [field]: { increment: 1 } },
      })
      if (result.count !== 1) throw quotaExceeded(message)
    }
  })
}

const consumeScanQuota = ({ userId, ip, isImage }) => {
  if (!userId) return consumeGuestScanQuota({ ip })
  return consumeAuthenticatedQuota({
    userId,
    resources: [
      { field: 'scanCount', limit: AUTHENTICATED_SCAN_LIMIT, message: 'Your daily scan limit has been reached. Try again tomorrow.' },
      ...(isImage ? [{ field: 'imageUploadCount', limit: AUTHENTICATED_IMAGE_UPLOAD_LIMIT, message: 'Your daily image upload limit has been reached. Try again tomorrow.' }] : []),
    ],
  })
}

const consumeReportQuota = ({ userId }) => consumeAuthenticatedQuota({
  userId,
  resources: [{ field: 'reportCount', limit: AUTHENTICATED_REPORT_LIMIT, message: 'Your daily report limit has been reached. Try again tomorrow.' }],
})

const setQuotaRepositoryForTests = (repository) => { quotaRepository = repository || prisma }

export {
  AUTHENTICATED_IMAGE_UPLOAD_LIMIT,
  AUTHENTICATED_REPORT_LIMIT,
  AUTHENTICATED_SCAN_LIMIT,
  GUEST_SCAN_LIMIT,
  consumeReportQuota,
  consumeScanQuota,
  guestIdentifierForIp,
  quotaDateFor,
  setQuotaRepositoryForTests,
}
