import assert from 'node:assert/strict'
import test from 'node:test'
import env from '../src/config/env.js'
import { enforceScanQuota } from '../src/middleware/daily-quota.middleware.js'

test('scan quota enforcement is disabled by default', async (t) => {
  const originalEnableScanQuota = env.enableScanQuota
  const originalDevBypassRateLimits = env.devBypassRateLimits
  env.enableScanQuota = false
  env.devBypassRateLimits = false
  t.after(() => {
    env.enableScanQuota = originalEnableScanQuota
    env.devBypassRateLimits = originalDevBypassRateLimits
  })

  let nextCalls = 0
  await enforceScanQuota({}, {}, () => { nextCalls += 1 })

  assert.equal(nextCalls, 1)
})
