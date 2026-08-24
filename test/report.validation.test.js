import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createReportSchema,
  listMyReportsQuerySchema,
  updateReportSchema,
} from '../src/validators/report.validator.js'

test('createReportSchema validates valid report submission', () => {
  const validReport = {
    title: 'Fake ABA Bank Telegram bot asking for OTP',
    description: 'Received a message from a suspicious account pretending to be ABA support.',
    category: 'PHISHING_LINK',
    financialLossAmount: 120.5,
    currency: 'USD',
    scammerContact: '@aba_scam_support',
    incidentDate: '2026-08-20T12:00:00.000Z',
    indicators: [
      { type: 'TELEGRAM_HANDLE', value: '@aba_scam_support', notes: 'Fake bot' },
      { type: 'URL', value: 'https://fake-aba-kh.com' },
    ],
  }

  const result = createReportSchema.safeParse(validReport)
  assert.equal(result.success, true)
})

test('createReportSchema rejects invalid category or short title', () => {
  const invalidCategory = {
    title: 'Test',
    description: 'This is a description that is at least 10 chars.',
    category: 'INVALID_CATEGORY',
  }
  assert.equal(createReportSchema.safeParse(invalidCategory).success, false)

  const shortTitle = {
    title: 'ab',
    description: 'This is a description that is at least 10 chars.',
    category: 'PHISHING_LINK',
  }
  assert.equal(createReportSchema.safeParse(shortTitle).success, false)
})

test('updateReportSchema requires at least one field to update', () => {
  assert.equal(updateReportSchema.safeParse({}).success, false)
  assert.equal(updateReportSchema.safeParse({ title: 'Updated Title' }).success, true)
  assert.equal(updateReportSchema.safeParse({ financialLossAmount: 500 }).success, true)
})

test('listMyReportsQuerySchema parses pagination and filter options', () => {
  const query = {
    status: 'PENDING',
    category: 'INVESTMENT_FRAUD',
    page: '2',
    limit: '15',
    sortBy: 'financialLossAmount',
    order: 'asc',
  }

  const parsed = listMyReportsQuerySchema.safeParse(query)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.page, 2)
  assert.equal(parsed.data.limit, 15)
  assert.equal(parsed.data.status, 'PENDING')
  assert.equal(parsed.data.sortBy, 'financialLossAmount')
  assert.equal(parsed.data.order, 'asc')
})
