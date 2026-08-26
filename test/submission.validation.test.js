import assert from 'node:assert/strict'
import test from 'node:test'
import { createSubmissionSchema, updateSubmissionSchema } from '../src/validators/submission.validator.js'

test('submission validation accepts user content and leaves AI fields server-owned', () => {
  const result = createSubmissionSchema.safeParse({
    title: 'Suspicious Telegram message',
    content: 'A stranger asked for my banking verification code.',
    sourceUrl: 'https://example.com/message',
    riskScore: 100,
  })

  assert.equal(result.success, true)
  assert.deepEqual(result.data, {
    title: 'Suspicious Telegram message',
    content: 'A stranger asked for my banking verification code.',
    sourceUrl: 'https://example.com/message',
  })
})

test('submission updates require at least one editable field', () => {
  assert.equal(updateSubmissionSchema.safeParse({}).success, false)
  assert.equal(updateSubmissionSchema.safeParse({ content: 'Updated suspicious content.' }).success, true)
})
