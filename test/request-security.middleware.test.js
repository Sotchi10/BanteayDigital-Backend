import assert from 'node:assert/strict'
import test from 'node:test'
import env from '../src/config/env.js'
import { enforceTrustedBrowserOrigin } from '../src/middleware/request-security.middleware.js'

const request = ({ method = 'POST', origin, fetchSite, cookie = true } = {}) => ({
  method,
  protocol: 'https',
  cookies: cookie ? { [env.authCookieName]: 'session' } : {},
  get: (name) => ({
    host: 'api.example.test',
    origin,
    'sec-fetch-site': fetchSite,
  })[name.toLowerCase()],
})

test('cookie-authenticated unsafe requests reject an untrusted browser origin', () => {
  let result
  enforceTrustedBrowserOrigin(
    request({ origin: 'https://attacker.example', fetchSite: 'cross-site' }),
    {},
    (value) => { result = value },
  )
  assert.equal(result.statusCode, 403)
})

test('bearer-only clients are not subject to browser cookie CSRF checks', () => {
  let result = 'not-called'
  enforceTrustedBrowserOrigin(
    request({ origin: 'https://attacker.example', fetchSite: 'cross-site', cookie: false }),
    {},
    (value) => { result = value },
  )
  assert.equal(result, undefined)
})
