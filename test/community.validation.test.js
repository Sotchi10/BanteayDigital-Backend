import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listPostsQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  trackShareSchema,
  adminReviewReportSchema,
  adminCreatePostSchema,
  adminUpdatePostSchema,
} from '../src/validators/community.validator.js'

test('listPostsQuerySchema parses filters, pagination, and sorting', () => {
  const query = {
    category: 'LOAN_SCAM',
    severity: 'CRITICAL',
    page: '3',
    limit: '25',
    sortBy: 'popular',
  }

  const result = listPostsQuerySchema.safeParse(query)
  assert.equal(result.success, true)
  assert.equal(result.data.category, 'LOAN_SCAM')
  assert.equal(result.data.severity, 'CRITICAL')
  assert.equal(result.data.page, 3)
  assert.equal(result.data.limit, 25)
  assert.equal(result.data.sortBy, 'popular')
})

test('createCommentSchema validates content and optional 1-level parentId', () => {
  // Valid top-level comment
  const topLevel = { content: 'Please be careful everyone, this is very common now!' }
  assert.equal(createCommentSchema.safeParse(topLevel).success, true)

  // Valid reply comment with parentId
  const replyComment = {
    content: '@john_doe I almost fell for this too!',
    parentId: 'parent-comment-123',
  }
  const replyResult = createCommentSchema.safeParse(replyComment)
  assert.equal(replyResult.success, true)
  assert.equal(replyResult.data.parentId, 'parent-comment-123')

  // Empty comment should fail
  assert.equal(createCommentSchema.safeParse({ content: '' }).success, false)
})

test('trackShareSchema accepts Cambodia platforms', () => {
  assert.equal(trackShareSchema.safeParse({ channel: 'TELEGRAM' }).success, true)
  assert.equal(trackShareSchema.safeParse({ channel: 'FACEBOOK' }).success, true)
  assert.equal(trackShareSchema.safeParse({ channel: 'MESSENGER' }).success, true)
  assert.equal(trackShareSchema.safeParse({ channel: 'COPY_LINK' }).success, true)
  assert.equal(trackShareSchema.safeParse({ channel: 'INVALID_CHANNEL' }).success, false)
})

test('adminReviewReportSchema validates approval and custom caption overrides', () => {
  const approvalPayload = {
    status: 'APPROVED',
    reviewNote: 'Verified with bank evidence.',
    publishToCommunity: true,
    postTitle: 'URGENT: Beware of fake ABA loan bots on Telegram',
    postSummary: 'Scammers are offering instant $5000 loans with 0% interest to steal OTP.',
    postContent: 'Full verified breakdown of the loan scam...',
    severity: 'CRITICAL',
    category: 'LOAN_SCAM',
    isPinned: true,
    publicEvidenceIds: ['evidence-1', 'evidence-2'],
  }

  const result = adminReviewReportSchema.safeParse(approvalPayload)
  assert.equal(result.success, true)
  assert.equal(result.data.status, 'APPROVED')
  assert.equal(result.data.severity, 'CRITICAL')
  assert.equal(result.data.publicEvidenceIds.length, 2)
})

test('adminCreatePostSchema requires title, summary, and content', () => {
  const validPost = {
    title: 'New Telegram Catfishing Ring Reported',
    summary: 'A new catfishing ring has been detected targeting students in Phnom Penh.',
    content: 'Detailed explanation of the tactics and Telegram handles used...',
    category: 'ROMANCE_SCAM',
    severity: 'HIGH',
  }

  assert.equal(adminCreatePostSchema.safeParse(validPost).success, true)

  const missingTitle = {
    summary: 'Summary only',
    content: 'Content only...',
  }
  assert.equal(adminCreatePostSchema.safeParse(missingTitle).success, false)
})
