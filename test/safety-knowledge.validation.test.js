import assert from 'node:assert/strict'
import test from 'node:test'
import { createSafetyKnowledgeSchema, listSafetyKnowledgeQuerySchema, safetyKnowledgeLanguageQuerySchema, updateSafetyKnowledgeSchema } from '../src/validators/safety-knowledge.validator.js'

const topic = {
  title: 'Avoid phishing links', slug: 'avoid-phishing-links', category: 'Phishing',
  titleKm: 'ជៀសវាងតំណភ្ជាប់បន្លំ', categoryKm: 'ការបន្លំតាមតំណ',
  shortDescription: 'Learn how to identify links used in phishing attempts.',
  shortDescriptionKm: 'ស្វែងយល់ពីរបៀបសម្គាល់តំណភ្ជាប់ដែលប្រើក្នុងការបន្លំ។',
  content: 'Open banking and account websites from bookmarks or official search results instead of unexpected messages.',
  contentKm: 'បើកគេហទំព័រធនាគារ និងគណនីពីចំណាំ ឬលទ្ធផលស្វែងរកផ្លូវការ ជំនួសឱ្យសារដែលមិនបានរំពឹងទុក។',
  warningSigns: ['Unexpected login request'], preventionTips: ['Use official websites'], indicators: ['fake link'],
  warningSignsKm: ['សំណើចូលគណនីដែលមិនបានរំពឹងទុក'], preventionTipsKm: ['ប្រើគេហទំព័រផ្លូវការ'], indicatorsKm: ['តំណក្លែងក្លាយ'],
}

test('safety knowledge requires scan-recommendation indicators and safe content fields', () => {
  assert.equal(createSafetyKnowledgeSchema.safeParse(topic).success, true)
  assert.equal(createSafetyKnowledgeSchema.safeParse({ ...topic, slug: 'Bad Slug' }).success, false)
  assert.equal(createSafetyKnowledgeSchema.safeParse({ ...topic, indicators: [] }).success, false)
  assert.equal(createSafetyKnowledgeSchema.safeParse({ ...topic, titleKm: '' }).success, false)
})

test('partial safety knowledge updates do not inject publication or relationship values', () => {
  assert.deepEqual(updateSafetyKnowledgeSchema.parse({ title: 'Updated title' }), { title: 'Updated title' })
})

test('public safety knowledge accepts only supported interface languages', () => {
  assert.equal(listSafetyKnowledgeQuerySchema.parse({ lang: 'km' }).lang, 'km')
  assert.equal(safetyKnowledgeLanguageQuerySchema.parse({}).lang, 'en')
  assert.equal(safetyKnowledgeLanguageQuerySchema.safeParse({ lang: 'fr' }).success, false)
})
