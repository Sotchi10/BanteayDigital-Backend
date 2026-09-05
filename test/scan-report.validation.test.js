import assert from 'node:assert/strict'
import test from 'node:test'
import { scanIdParamSchema } from '../src/validators/scan.validator.js'
import { publishReportSchema, reportFromScanSchema } from '../src/validators/report.validator.js'

test('a report request can only reference a non-empty scan ID and has an optional title', () => {
  assert.equal(scanIdParamSchema.safeParse({ id: 'scan-123' }).success, true)
  assert.equal(scanIdParamSchema.safeParse({ id: '  ' }).success, false)
  assert.equal(reportFromScanSchema.safeParse({ title: 'Suspicious bank message' }).success, true)
  assert.equal(reportFromScanSchema.safeParse({ title: 'no' }).success, false)
})

test('publishing requires moderator-sanitized public content', () => {
  assert.equal(publishReportSchema.safeParse({}).success, false)
  assert.equal(publishReportSchema.safeParse({
    title: 'Fake bank verification message',
    summary: 'A fraudulent message asks recipients to verify a bank account.',
    content: 'Do not open the link. Contact the bank using its official contact details.',
  }).success, true)
})
