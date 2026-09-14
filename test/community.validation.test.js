import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCommentSchema,
  listCommentsQuerySchema,
  listPostsQuerySchema,
  postIdParamSchema,
  recordShareSchema,
  reportCommentSchema,
} from '../src/validators/community.validator.js'

test('community post queries parse pagination', () => {
  assert.deepEqual(listPostsQuerySchema.parse({ page: '2', limit: '5' }), { page: 2, limit: 5 })
})

test('community post routes require an ID', () => {
  assert.equal(postIdParamSchema.safeParse({ id: '' }).success, false)
  assert.equal(postIdParamSchema.safeParse({ id: 'post-1' }).success, true)
})

test('comment queries parse cursor pagination', () => {
  assert.deepEqual(listCommentsQuerySchema.parse({ limit: '10', cursor: 'comment-1', parentId: 'parent-1' }), {
    limit: 10,
    cursor: 'comment-1',
    parentId: 'parent-1',
  })
})

test('comments are trimmed and limited to 1000 characters', () => {
  assert.deepEqual(createCommentSchema.parse({ content: '  Useful warning  ' }), { content: 'Useful warning' })
  assert.equal(createCommentSchema.safeParse({ content: '   ' }).success, false)
  assert.equal(createCommentSchema.safeParse({ content: 'x'.repeat(1001) }).success, false)
})

test('comment reports use an allowlisted reason', () => {
  assert.equal(reportCommentSchema.safeParse({ reason: 'DANGEROUS_LINK' }).success, true)
  assert.equal(reportCommentSchema.safeParse({ reason: 'SOMETHING_ELSE' }).success, false)
})

test('share events accept only supported channels', () => {
  assert.equal(recordShareSchema.safeParse({ channel: 'NATIVE' }).success, true)
  assert.equal(recordShareSchema.safeParse({ channel: 'TELEGRAM' }).success, true)
  assert.equal(recordShareSchema.safeParse({ channel: 'COPY_LINK' }).success, true)
  assert.equal(recordShareSchema.safeParse({ channel: 'FACEBOOK' }).success, false)
})
