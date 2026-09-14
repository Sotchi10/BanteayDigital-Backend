import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createReportFromScan,
  deleteManagedReport,
  publishReport,
  reviewReport,
  setReportPublication,
  setReportRepositoryForTests,
  updateManagedReport,
} from '../src/services/report.service.js'

test('a user report is created only from the user\'s own scan', async (t) => {
  const created = []
  const scanUpdates = []
  let scanQuery
  setReportRepositoryForTests({
    $transaction: async (work) => {
      const transaction = {
        scan: {
          findFirst: async (query) => { scanQuery = query; return { id: 'scan-1', inputType: 'TEXT', rawInput: 'Suspicious message', assessment: 'SUSPICIOUS' } },
          update: async (update) => { scanUpdates.push(update) },
        },
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
  assert.deepEqual(scanUpdates[0], { where: { id: 'scan-1' }, data: { reportStatus: 'REPORTED' } })
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

test('editing a published report updates both the report and community post', async (t) => {
  const reportUpdates = []
  const postUpdates = []
  const report = { id: 'report-1', status: 'APPROVED', communityPost: { id: 'post-1' } }
  setReportRepositoryForTests({
    scamReport: {
      findUnique: async () => report,
    },
    $transaction: async (work) => work({
      scamReport: { update: async (query) => reportUpdates.push(query) },
      communityPost: { update: async (query) => postUpdates.push(query) },
    }),
  })
  t.after(() => setReportRepositoryForTests())

  await updateManagedReport({ id: 'report-1', title: 'Updated warning', content: 'Updated public safety content.', summary: 'Updated safety summary.' })
  assert.equal(reportUpdates[0].data.title, 'Updated warning')
  assert.equal(postUpdates[0].where.id, 'post-1')
  assert.equal(postUpdates[0].data.summary, 'Updated safety summary.')
})

test('unpublishing hides the post and clears its likes and comments in one transaction', async (t) => {
  const operations = []
  let lookupCount = 0
  setReportRepositoryForTests({
    scamReport: {
      findUnique: async () => {
        lookupCount += 1
        return {
          id: 'report-1',
          status: 'APPROVED',
          communityPost: { id: 'post-1', isPublished: lookupCount > 1 ? false : true },
        }
      },
    },
    $transaction: async (work) => work({
      communityPost: { update: async (query) => operations.push(['post', query]) },
      postLike: { deleteMany: async (query) => operations.push(['likes', query]) },
      comment: { deleteMany: async (query) => operations.push(['comments', query]) },
    }),
  })
  t.after(() => setReportRepositoryForTests())

  const report = await setReportPublication({ id: 'report-1', isPublished: false })

  assert.equal(report.communityPost.isPublished, false)
  assert.deepEqual(operations, [
    ['post', { where: { id: 'post-1' }, data: { isPublished: false } }],
    ['likes', { where: { postId: 'post-1' } }],
    ['comments', { where: { postId: 'post-1' } }],
  ])
})

test('deleting a managed report resets its linked scan before removing the report', async (t) => {
  const operations = []
  setReportRepositoryForTests({
    scamReport: {
      findUnique: async () => ({ id: 'report-1', status: 'APPROVED', scanId: 'scan-1' }),
    },
    $transaction: async (work) => work({
      scan: { updateMany: async (query) => operations.push(['scan', query]) },
      scamReport: { delete: async (query) => operations.push(['report', query]) },
    }),
  })
  t.after(() => setReportRepositoryForTests())

  assert.deepEqual(await deleteManagedReport({ id: 'report-1' }), { id: 'report-1' })
  assert.deepEqual(operations, [
    ['scan', { where: { id: 'scan-1' }, data: { reportStatus: 'NOT_REPORTED' } }],
    ['report', { where: { id: 'report-1' } }],
  ])
})
