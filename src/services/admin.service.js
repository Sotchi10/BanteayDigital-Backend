import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'
import { listAdminReports } from './report.service.js'
import { listSubmissions } from './submission.service.js'

const adminUserSelect = {
  id: true,
  email: true,
  phone_num: true,
  name: true,
  age: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

const publicAdminUser = (user) => ({
  ...user,
  phoneNumber: user.phone_num,
  phone_num: undefined,
})

const getUserActivity = async ({ userId, query }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: adminUserSelect,
  })

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const [submissions, reports] = await Promise.all([
    listSubmissions({ userId, query }),
    listAdminReports({ query: { ...query, userId } }),
  ])

  return {
    user: publicAdminUser(user),
    submissions,
    reports,
  }
}

export { getUserActivity }
