import assert from 'node:assert/strict'
import test from 'node:test'
import {
  consumeReportQuota,
  consumeScanQuota,
  guestIdentifierForIp,
  quotaDateFor,
  setQuotaRepositoryForTests,
} from '../src/services/daily-quota.service.js'

const createQuotaRepository = () => {
  const guestRows = new Map()
  const userRows = new Map()
  const keyFor = (first, quotaDate) => `${first}:${quotaDate}`
  const makeTable = (rows, identifier) => ({
    upsert: async ({ where, create }) => {
      const compound = where[identifier]
      const key = keyFor(compound[Object.keys(compound)[0]], compound.quotaDate)
      if (!rows.has(key)) rows.set(key, { ...create })
    },
    updateMany: async ({ where, data }) => {
      const key = keyFor(where[Object.keys(where)[0]], where.quotaDate)
      const row = rows.get(key)
      const field = Object.keys(data)[0]
      if (row && row[field] === undefined) row[field] = 0
      if (!row || row[field] >= where[field].lt) return { count: 0 }
      row[field] += data[field].increment
      return { count: 1 }
    },
  })
  const guestDailyUsage = makeTable(guestRows, 'guestIdentifier_quotaDate')
  const userDailyUsage = makeTable(userRows, 'userId_quotaDate')
  return {
    guestRows,
    userRows,
    $transaction: async (callback) => callback({ guestDailyUsage, userDailyUsage }),
  }
}

test('guest quota identifiers are salted hashes and a guest receives one scan per day', async (t) => {
  const repository = createQuotaRepository()
  setQuotaRepositoryForTests(repository)
  t.after(() => setQuotaRepositoryForTests())

  const identifier = guestIdentifierForIp('203.0.113.7')
  assert.match(identifier, /^[a-f0-9]{64}$/)
  assert.notEqual(identifier, '203.0.113.7')

  await consumeScanQuota({ ip: '203.0.113.7' })
  await assert.rejects(
    consumeScanQuota({ ip: '203.0.113.7' }),
    { statusCode: 429, message: /Sign in to receive a higher daily allowance/ },
  )
  assert.equal([...repository.guestRows.keys()].some((key) => key.includes('203.0.113.7')), false)
})

test('authenticated scan and report quotas are tracked independently', async (t) => {
  const repository = createQuotaRepository()
  setQuotaRepositoryForTests(repository)
  t.after(() => setQuotaRepositoryForTests())

  await consumeScanQuota({ userId: 'user-1' })
  await consumeScanQuota({ userId: 'user-1' })
  await consumeScanQuota({ userId: 'user-1' })
  await assert.rejects(consumeScanQuota({ userId: 'user-1' }), { statusCode: 429 })
  await consumeReportQuota({ userId: 'user-1' })
  assert.equal(repository.userRows.size, 1)
})

test('quota dates use the configured timezone', () => {
  assert.equal(quotaDateFor(new Date('2026-09-14T18:00:00.000Z')), '2026-09-15')
})
