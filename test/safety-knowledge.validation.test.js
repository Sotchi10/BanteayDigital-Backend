import assert from 'node:assert/strict'
import test from 'node:test'
import { createSafetyKnowledgeSchema, updateSafetyKnowledgeSchema } from '../src/validators/safety-knowledge.validator.js'

const topic = {
  title: 'Avoid phishing links', slug: 'avoid-phishing-links', category: 'Phishing',
  shortDescription: 'Learn how to identify links used in phishing attempts.',
  content: 'Open banking and account websites from bookmarks or official search results instead of unexpected messages.',
  warningSigns: ['Unexpected login request'], preventionTips: ['Use official websites'], indicators: ['fake link'],
}

test('safety knowledge requires scan-recommendation indicators and safe content fields', () => {
  assert.equal(createSafetyKnowledgeSchema.safeParse(topic).success, true)
  assert.equal(createSafetyKnowledgeSchema.safeParse({ ...topic, slug: 'Bad Slug' }).success, false)
  assert.equal(createSafetyKnowledgeSchema.safeParse({ ...topic, indicators: [] }).success, false)
})

test('partial safety knowledge updates do not inject publication or relationship values', () => {
  assert.deepEqual(updateSafetyKnowledgeSchema.parse({ title: 'Updated title' }), { title: 'Updated title' })
})
