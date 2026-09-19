import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPublicProfile,
  setPublicProfileRepositoryForTests,
} from '../src/services/public-profile.service.js'

test('a public profile includes visible like and comment totals for each published post', async (t) => {
  let query
  const profile = {
    username: 'reporter',
    reports: [{
      communityPost: {
        id: 'post-1',
        title: 'Scam warning',
        _count: { likes: 7, comments: 3 },
      },
    }],
  }
  setPublicProfileRepositoryForTests({
    user: {
      findUnique: async (nextQuery) => {
        query = nextQuery
        return profile
      },
    },
  })
  t.after(() => setPublicProfileRepositoryForTests())

  assert.equal(await getPublicProfile({ username: 'reporter' }), profile)
  assert.equal(query.where.username, 'reporter')
  const countSelect = query.select.reports.select.communityPost.select._count.select
  assert.equal(countSelect.likes, true)
  assert.deepEqual(countSelect.comments, { where: { status: 'ACTIVE' } })
})
