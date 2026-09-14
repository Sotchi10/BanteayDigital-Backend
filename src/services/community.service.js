import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'
import { getPublicScanImageUrl } from './scan-image-storage.service.js'

let communityRepository = prisma
let imageUrlResolver = getPublicScanImageUrl

const publicPostWhere = { report: { is: { status: 'APPROVED' } } }
const publicAuthorSelect = { id: true, name: true, username: true, avatarUrl: true }

const postInclude = (userId) => ({
  author: { select: publicAuthorSelect },
  // A post only exposes the original screenshot after its report has been
  // approved. Do not return the report itself (which may contain private data).
  report: {
    select: {
      scan: { select: { imageStoragePath: true } },
      // CommunityPost.author is the moderator who published the post. The
      // report user is the member who originally submitted it.
      user: { select: publicAuthorSelect },
    },
  },
  _count: {
    select: {
      likes: true,
      shares: true,
      comments: { where: { status: 'ACTIVE' } },
    },
  },
  ...(userId ? { likes: { where: { userId }, select: { id: true }, take: 1 } } : {}),
})

const serializePost = async (post) => {
  const { _count, likes, report, author: moderator, ...publicPost } = post
  const imageUrl = await imageUrlResolver(report?.scan?.imageStoragePath)
  const author = report?.user?.username
    ? report.user
    : moderator?.username
      ? moderator
      : { id: null, username: 'BanteayDigital', name: 'BanteayDigital Safety Team', avatarUrl: null }
  return {
    ...publicPost,
    author,
    ...(imageUrl ? { imageUrl } : {}),
    interaction: {
      likeCount: _count?.likes || 0,
      shareCount: _count?.shares || 0,
      commentCount: _count?.comments || 0,
      likedByMe: Boolean(likes?.length),
    },
  }
}

const serializeComment = (comment) => {
  const { _count, replies, ...record } = comment
  const visible = record.status === 'ACTIVE'
  return {
    ...record,
    content: visible ? record.content : null,
    author: visible ? record.author : null,
    ...(replies ? { replies: replies.map(serializeComment) } : {}),
    ...(typeof _count?.replies === 'number' ? { replyCount: _count.replies } : {}),
  }
}

const ensurePublicPost = async (id) => {
  const post = await communityRepository.communityPost.findFirst({
    where: { id, ...publicPostWhere },
    select: { id: true },
  })
  if (!post) throw new ApiError(404, 'Community post not found')
  return post
}

const listPosts = async ({ query, userId }) => {
  const { page, limit } = query
  const [posts, total] = await Promise.all([
    communityRepository.communityPost.findMany({
      where: publicPostWhere,
      include: postInclude(userId),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    }),
    communityRepository.communityPost.count({ where: publicPostWhere }),
  ])
  return {
    posts: await Promise.all(posts.map(serializePost)),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

const getPostById = async ({ id, userId }) => {
  const post = await communityRepository.communityPost.findFirst({
    where: { id, ...publicPostWhere },
    include: postInclude(userId),
  })
  if (!post) throw new ApiError(404, 'Community post not found')
  return await serializePost(post)
}

const likePost = async ({ postId, userId }) => {
  await ensurePublicPost(postId)
  await communityRepository.postLike.upsert({
    where: { postId_userId: { postId, userId } },
    update: {},
    create: { postId, userId },
  })
  const likeCount = await communityRepository.postLike.count({ where: { postId } })
  return { liked: true, likeCount }
}

const unlikePost = async ({ postId, userId }) => {
  await ensurePublicPost(postId)
  await communityRepository.postLike.deleteMany({ where: { postId, userId } })
  const likeCount = await communityRepository.postLike.count({ where: { postId } })
  return { liked: false, likeCount }
}

const recordPostShare = async ({ postId, userId, channel }) => {
  await ensurePublicPost(postId)
  await communityRepository.postShare.create({
    data: { postId, userId: userId || null, channel },
  })
  const shareCount = await communityRepository.postShare.count({ where: { postId } })
  return { shared: true, shareCount }
}

const validateCommentCursor = async ({ cursor, postId, parentId }) => {
  if (!cursor) return
  const found = await communityRepository.comment.findFirst({
    where: { id: cursor, postId, parentId: parentId || null },
    select: { id: true },
  })
  if (!found) throw new ApiError(400, 'Invalid comment cursor')
}

const listComments = async ({ postId, query }) => {
  await ensurePublicPost(postId)
  const { limit, cursor, parentId } = query

  if (parentId) {
    const parent = await communityRepository.comment.findFirst({
      where: { id: parentId, postId, parentId: null },
      select: { id: true },
    })
    if (!parent) throw new ApiError(404, 'Parent comment not found')
  }

  await validateCommentCursor({ cursor, postId, parentId })
  const comments = await communityRepository.comment.findMany({
    where: { postId, parentId: parentId || null },
    include: parentId
      ? { author: { select: publicAuthorSelect } }
      : {
          author: { select: publicAuthorSelect },
          replies: {
            where: { status: 'ACTIVE' },
            include: { author: { select: publicAuthorSelect } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 3,
          },
          _count: { select: { replies: { where: { status: 'ACTIVE' } } } },
        },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = comments.length > limit
  const page = comments.slice(0, limit)
  return {
    comments: page.map(serializeComment),
    meta: { limit, hasMore, nextCursor: hasMore ? page.at(-1)?.id || null : null },
  }
}

const createComment = async ({ postId, authorId, content, parentId }) => {
  await ensurePublicPost(postId)

  if (parentId) {
    const parent = await communityRepository.comment.findFirst({
      where: { id: parentId, postId, parentId: null, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!parent) throw new ApiError(400, 'Replies can only target an active top-level comment')
  }

  const recentCommentCount = await communityRepository.comment.count({
    where: { authorId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  })
  if (recentCommentCount >= 5) throw new ApiError(429, 'Please wait before posting more comments')

  const comment = await communityRepository.comment.create({
    data: { postId, authorId, content, parentId: parentId || null },
    include: { author: { select: publicAuthorSelect } },
  })
  return serializeComment(comment)
}

const updateComment = async ({ id, authorId, content }) => {
  const existing = await communityRepository.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, status: true },
  })
  if (!existing) throw new ApiError(404, 'Comment not found')
  if (existing.authorId !== authorId) throw new ApiError(403, 'You can only edit your own comments')
  if (existing.status !== 'ACTIVE') throw new ApiError(409, 'This comment can no longer be edited')

  const updated = await communityRepository.comment.update({
    where: { id },
    data: { content },
    include: { author: { select: publicAuthorSelect } },
  })
  return serializeComment(updated)
}

const deleteComment = async ({ id, authorId }) => {
  const existing = await communityRepository.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, status: true },
  })
  if (!existing) throw new ApiError(404, 'Comment not found')
  if (existing.authorId !== authorId) throw new ApiError(403, 'You can only delete your own comments')
  if (existing.status === 'DELETED') return { id, status: 'DELETED' }

  await communityRepository.comment.update({ where: { id }, data: { status: 'DELETED' } })
  return { id, status: 'DELETED' }
}

const reportComment = async ({ id, reporterId, reason, details }) => {
  const comment = await communityRepository.comment.findFirst({
    where: { id, status: 'ACTIVE' },
    select: { id: true, authorId: true },
  })
  if (!comment) throw new ApiError(404, 'Comment not found')
  if (comment.authorId === reporterId) throw new ApiError(400, 'You cannot report your own comment')

  try {
    return await communityRepository.commentReport.create({
      data: { commentId: id, reporterId, reason, details: details || null },
      select: { id: true, reason: true, createdAt: true },
    })
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'You have already reported this comment')
    throw error
  }
}

const moderateComment = async ({ id, status }) => {
  const existing = await communityRepository.comment.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!existing) throw new ApiError(404, 'Comment not found')
  if (existing.status === 'DELETED') throw new ApiError(409, 'A deleted comment cannot be moderated')

  await communityRepository.comment.update({ where: { id }, data: { status } })
  return { id, status }
}

const setCommunityRepositoryForTests = (repository) => {
  communityRepository = repository || prisma
}

const setCommunityImageUrlResolverForTests = (resolver) => {
  imageUrlResolver = resolver || getPublicScanImageUrl
}

export {
  createComment,
  deleteComment,
  getPostById,
  likePost,
  listComments,
  listPosts,
  moderateComment,
  recordPostShare,
  reportComment,
  setCommunityImageUrlResolverForTests,
  setCommunityRepositoryForTests,
  unlikePost,
  updateComment,
}
