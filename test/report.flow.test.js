import assert from 'node:assert/strict'
import test from 'node:test'
import { createReportFromScan, publishReport, reviewReport, setReportRepositoryForTests } from '../src/services/report.service.js'

test('a user report is created only from the user\'s own scan', async (t) => {
  const created = []
  let scanQuery
  setReportRepositoryForTests({
    $transaction: async (work) => {
      const transaction = {
        scan: { findFirst: async (query) => { scanQuery = query; return { id: 'scan-1', inputType: 'TEXT', rawInput: 'Suspicious message', assessment: 'SUSPICIOUS' } } },
        scamReport: { create: async ({ data }) => { created.push(data); return { id: 'report-1', ...data, status: 'PENDING' } } },
      }
      return work(transaction)
    },
  })
  t.after(() => setReportRepositoryForTests())

  const report = await createReportFromScan({ scanId: 'scan-1', userId: 'user-1', title: 'Suspicious message' })
  assert.equal(report.status, 'PENDING')
  assert.deepEqual(scanQuery.where, { id: 'scan-1', userId: 'user-1' })
  assert.deepEqual(created[0], { userId: 'user-1', scanId: 'scan-1', title: 'Suspicious message', content: 'Suspicious message' })
})

test('only an approved, unpublished report can create a sanitized community post', async (t) => {
  const created = []
  setReportRepositoryForTests({
    scamReport: { findUnique: async () => ({ id: 'report-1', status: 'APPROVED', communityPost: null }) },
    communityPost: { create: async ({ data }) => { created.push(data); return { id: 'post-1', ...data } } },
  })
  t.after(() => setReportRepositoryForTests())

  const post = await publishReport({
    id: 'report-1', adminId: 'admin-1', title: 'Fake banking message',
    summary: 'A fraudulent account-verification message is circulating.',
    content: 'Do not open links in unexpected messages. Contact the bank directly.',
  })
  assert.equal(post.id, 'post-1')
  assert.equal(created[0].content, 'Do not open links in unexpected messages. Contact the bank directly.')
})

test('a moderation transition fails cleanly if another administrator reviewed it first', async (t) => {
  setReportRepositoryForTests({
    scamReport: {
      findUnique: async () => ({ id: 'report-1', status: 'PENDING' }),
      updateMany: async () => ({ count: 0 }),
    },
  })
  t.after(() => setReportRepositoryForTests())

  await assert.rejects(
    reviewReport({ id: 'report-1', adminId: 'admin-1', status: 'APPROVED' }),
    (error) => error.statusCode === 409,
  )
})

test('a duplicate community-post insert is reported as a conflict', async (t) => {
  setReportRepositoryForTests({
    scamReport: { findUnique: async () => ({ id: 'report-1', status: 'APPROVED', communityPost: null }) },
    communityPost: { create: async () => { const error = new Error('duplicate'); error.code = 'P2002'; throw error } },
  })
  t.after(() => setReportRepositoryForTests())

  await assert.rejects(
    publishReport({ id: 'report-1', adminId: 'admin-1', title: 'Public warning', summary: 'A sanitized public safety summary.', content: 'Use official channels to verify suspicious messages.' }),
    (error) => error.statusCode === 409,
  )
})
