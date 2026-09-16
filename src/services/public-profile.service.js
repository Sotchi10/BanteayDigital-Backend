import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const publicProfileSelect = {
  username: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
  reports: {
    where: {
      status: 'APPROVED',
      communityPost: { is: { isPublished: true } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      scan: { select: { assessment: true } },
      communityPost: {
        select: { id: true, title: true, summary: true, publishedAt: true },
      },
    },
  },
}

const getPublicProfile = async ({ username }) => {
  const profile = await prisma.user.findUnique({
    where: { username },
    select: publicProfileSelect,
  })

  if (!profile) throw new ApiError(404, 'User profile not found')
  return profile
}

export { getPublicProfile }
