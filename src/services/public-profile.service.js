import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

let publicProfileRepository = prisma

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
        select: {
          id: true,
          title: true,
          summary: true,
          publishedAt: true,
          _count: {
            select: {
              likes: true,
              comments: { where: { status: 'ACTIVE' } },
            },
          },
        },
      },
    },
  },
}

const getPublicProfile = async ({ username }) => {
  const profile = await publicProfileRepository.user.findUnique({
    where: { username },
    select: publicProfileSelect,
  })

  if (!profile) throw new ApiError(404, 'User profile not found')
  return profile
}

const setPublicProfileRepositoryForTests = (repository) => {
  publicProfileRepository = repository || prisma
}

export { getPublicProfile, setPublicProfileRepositoryForTests }
