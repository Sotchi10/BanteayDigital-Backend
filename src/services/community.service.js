import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const postInclude = { author: { select: { id: true, name: true, avatarUrl: true } } }
const publicPostWhere = { report: { is: { status: 'APPROVED' } } }

const listPosts = async ({ query }) => {
  const { page, limit } = query
  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({ where: publicPostWhere, include: postInclude, skip: (page - 1) * limit, take: limit, orderBy: { publishedAt: 'desc' } }),
    prisma.communityPost.count({ where: publicPostWhere }),
  ])
  return { posts, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

const getPostById = async (id) => {
  const post = await prisma.communityPost.findFirst({ where: { id, ...publicPostWhere }, include: postInclude })
  if (!post) throw new ApiError(404, 'Community post not found')
  return post
}

export { getPostById, listPosts }
