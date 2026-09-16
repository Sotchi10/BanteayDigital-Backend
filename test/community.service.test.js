import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createComment,
  deleteComment,
  likePost,
  listSavedPosts,
  listPosts,
  recordPostShare,
  savePost,
  setCommunityImageUrlResolverForTests,
  setCommunityRepositoryForTests,
  unlikePost,
  unsavePost,
  updateComment,
} from '../src/services/community.service.js'

const publicPost = { id: 'post-1' }

test('post list exposes counts and the current user like state', async (t) => {
  let listQuery
  setCommunityImageUrlResolverForTests((path) => path ? `https://cdn.example/${path}` : null)
  setCommunityRepositoryForTests({
    communityPost: {
      findMany: async (query) => { listQuery = query; return [{
        id: 'post-1', title: 'Warning', author: { id: 'admin-1', name: 'Admin', avatarUrl: null },
        report: { scan: { imageStoragePath: 'scans/user-1/scan.png' }, user: { id: 'reporter-1', username: 'user-a', name: 'User A', avatarUrl: null } },
        _count: { likes: 3, shares: 4, comments: 2 }, likes: [{ id: 'like-1' }], saves: [{ id: 'save-1' }],
      }] },
      count: async () => 1,
    },
  })
  t.after(() => {
    setCommunityImageUrlResolverForTests()
    setCommunityRepositoryForTests()
  })

  const result = await listPosts({ query: { page: 1, limit: 20 }, userId: 'user-1' })
  assert.deepEqual(result.posts[0].interaction, { likeCount: 3, shareCount: 4, commentCount: 2, likedByMe: true, savedByMe: true })
  assert.equal(result.posts[0].imageUrl, 'https://cdn.example/scans/user-1/scan.png')
  assert.deepEqual(result.posts[0].author, {
    id: 'reporter-1', username: 'user-a', name: 'User A', avatarUrl: null,
  })
  assert.equal('likes' in result.posts[0], false)
  assert.equal('report' in result.posts[0], false)
  assert.equal(listQuery.where.isPublished, true)
  assert.equal(listQuery.include.report.select.user.select.username, true)
  assert.equal(listQuery.include.saves.where.userId, 'user-1')
})

test('post ownership uses the reporter display name when no username is set', async (t) => {
  setCommunityImageUrlResolverForTests(() => null)
  setCommunityRepositoryForTests({
    communityPost: {
      findMany: async () => [{
        id: 'post-1', title: 'Warning', author: { id: 'admin-1', username: 'moderator', name: 'Moderator', avatarUrl: null },
        report: { scan: null, user: { id: 'reporter-1', username: null, name: 'User A', avatarUrl: 'https://cdn.example/user-a.png' } },
        _count: { likes: 0, shares: 0, comments: 0 }, likes: [],
      }],
      count: async () => 1,
    },
  })
  t.after(() => {
    setCommunityImageUrlResolverForTests()
    setCommunityRepositoryForTests()
  })

  const result = await listPosts({ query: { page: 1, limit: 20 } })
  assert.deepEqual(result.posts[0].author, {
    id: 'reporter-1', username: null, name: 'User A', avatarUrl: 'https://cdn.example/user-a.png',
  })
})

test('a share records its channel and returns the current count', async (t) => {
  let created
  setCommunityRepositoryForTests({
    communityPost: { findFirst: async () => publicPost },
    postShare: {
      create: async ({ data }) => { created = data; return { id: 'share-1', ...data } },
      count: async () => 7,
    },
  })
  t.after(() => setCommunityRepositoryForTests())

  const result = await recordPostShare({ postId: 'post-1', userId: undefined, channel: 'TELEGRAM' })
  assert.deepEqual(created, { postId: 'post-1', userId: null, channel: 'TELEGRAM' })
  assert.deepEqual(result, { shared: true, shareCount: 7 })
})

test('like and unlike are idempotent operations backed by the unique user-post pair', async (t) => {
  const operations = []
  setCommunityRepositoryForTests({
    communityPost: { findFirst: async () => publicPost },
    postLike: {
      upsert: async (query) => { operations.push(query); return { id: 'like-1' } },
      deleteMany: async (query) => { operations.push(query); return { count: 1 } },
      count: async () => 4,
    },
  })
  t.after(() => setCommunityRepositoryForTests())

  assert.deepEqual(await likePost({ postId: 'post-1', userId: 'user-1' }), { liked: true, likeCount: 4 })
  assert.deepEqual(operations[0].where, { postId_userId: { postId: 'post-1', userId: 'user-1' } })
  assert.deepEqual(await unlikePost({ postId: 'post-1', userId: 'user-1' }), { liked: false, likeCount: 4 })
  assert.deepEqual(operations[1].where, { postId: 'post-1', userId: 'user-1' })
})

test('save and unsave are idempotent operations backed by the unique user-post pair', async (t) => {
  const operations = []
  setCommunityRepositoryForTests({
    communityPost: { findFirst: async () => publicPost },
    postSave: {
      upsert: async (query) => { operations.push(query); return { id: 'save-1' } },
      deleteMany: async (query) => { operations.push(query); return { count: 1 } },
    },
  })
  t.after(() => setCommunityRepositoryForTests())

  assert.deepEqual(await savePost({ postId: 'post-1', userId: 'user-1' }), { saved: true })
  assert.deepEqual(operations[0].where, { postId_userId: { postId: 'post-1', userId: 'user-1' } })
  assert.deepEqual(await unsavePost({ postId: 'post-1', userId: 'user-1' }), { saved: false })
  assert.deepEqual(operations[1].where, { postId: 'post-1', userId: 'user-1' })
})

test('saved posts list hides unpublished posts and uses newest-saved order', async (t) => {
  let listQuery
  let countQuery
  setCommunityImageUrlResolverForTests(() => null)
  setCommunityRepositoryForTests({
    postSave: {
      findMany: async (query) => {
        listQuery = query
        return [{ post: {
          id: 'post-1', title: 'Warning', author: { id: 'admin-1', name: 'Admin', avatarUrl: null },
          report: { scan: null, user: { id: 'reporter-1', username: 'reporter', name: 'Reporter', avatarUrl: null } },
          _count: { likes: 0, shares: 0, comments: 0 }, likes: [], saves: [{ id: 'save-1' }],
        } }]
      },
      count: async ({ where }) => { countQuery = where; return 1 },
    },
  })
  t.after(() => {
    setCommunityImageUrlResolverForTests()
    setCommunityRepositoryForTests()
  })

  const result = await listSavedPosts({ query: { page: 1, limit: 20 }, userId: 'user-1' })
  assert.equal(result.posts[0].interaction.savedByMe, true)
  assert.deepEqual(listQuery.orderBy, { createdAt: 'desc' })
  assert.equal(listQuery.where.post.is.isPublished, true)
  assert.equal(listQuery.where.post.is.report.is.status, 'APPROVED')
  assert.deepEqual(countQuery, listQuery.where)
})

test('a reply must target an active top-level comment on the same post', async (t) => {
  setCommunityRepositoryForTests({
    communityPost: { findFirst: async () => publicPost },
    comment: {
      findFirst: async () => null,
      count: async () => 0,
    },
  })
  t.after(() => setCommunityRepositoryForTests())

  await assert.rejects(
    createComment({ postId: 'post-1', authorId: 'user-1', content: 'reply', parentId: 'comment-1' }),
    (error) => error.statusCode === 400,
  )
})

test('comment authorship is enforced for edits and deletes', async (t) => {
  setCommunityRepositoryForTests({
    comment: {
      findUnique: async () => ({ id: 'comment-1', authorId: 'another-user', status: 'ACTIVE' }),
    },
  })
  t.after(() => setCommunityRepositoryForTests())

  await assert.rejects(
    updateComment({ id: 'comment-1', authorId: 'user-1', content: 'changed' }),
    (error) => error.statusCode === 403,
  )
  await assert.rejects(
    deleteComment({ id: 'comment-1', authorId: 'user-1' }),
    (error) => error.statusCode === 403,
  )
})
