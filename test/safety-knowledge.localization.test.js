import assert from 'node:assert/strict'
import test from 'node:test'
import localizeSafetyKnowledgeTopic from '../src/utils/safety-knowledge-localization.js'

const topic = {
  id: 'topic-1', slug: 'phishing-links',
  title: 'Phishing links', titleKm: 'តំណភ្ជាប់បន្លំ',
  category: 'Phishing', categoryKm: 'ការបន្លំ',
  shortDescription: 'English summary', shortDescriptionKm: 'សេចក្តីសង្ខេប',
  content: 'English guidance', contentKm: 'ការណែនាំជាភាសាខ្មែរ',
  warningSigns: ['Unexpected link'], warningSignsKm: ['តំណដែលមិនបានរំពឹងទុក'],
  preventionTips: ['Verify the sender'], preventionTipsKm: ['ផ្ទៀងផ្ទាត់អ្នកផ្ញើ'],
  indicators: ['fake login'], indicatorsKm: ['ការចូលគណនីក្លែងក្លាយ'],
}

test('safety knowledge localization exposes only the selected language', () => {
  const khmer = localizeSafetyKnowledgeTopic(topic, 'km')
  assert.equal(khmer.title, topic.titleKm)
  assert.equal(khmer.category, topic.categoryKm)
  assert.deepEqual(khmer.warningSigns, topic.warningSignsKm)
  assert.equal('titleKm' in khmer, false)

  const english = localizeSafetyKnowledgeTopic(topic, 'en')
  assert.equal(english.title, topic.title)
  assert.deepEqual(english.preventionTips, topic.preventionTips)
  assert.equal('contentKm' in english, false)
})
