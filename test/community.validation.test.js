import assert from 'node:assert/strict'
import test from 'node:test'
import { listPostsQuerySchema, postIdParamSchema } from '../src/validators/community.validator.js'

test('community post queries parse pagination', () => {
  assert.deepEqual(listPostsQuerySchema.parse({ page: '2', limit: '5' }), { page: 2, limit: 5 })
})

test('community post routes require an ID', () => {
  assert.equal(postIdParamSchema.safeParse({ id: '' }).success, false)
  assert.equal(postIdParamSchema.safeParse({ id: 'post-1' }).success, true)
})
