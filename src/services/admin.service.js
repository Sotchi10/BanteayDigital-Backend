import prisma from '../config/database.js'

let adminRepository = prisma

const DAY_MS = 24 * 60 * 60 * 1000

const startOfUtcDay = (value = new Date()) => new Date(Date.UTC(
  value.getUTCFullYear(),
  value.getUTCMonth(),
  value.getUTCDate(),
))

const titleCase = (value) => value.charAt(0) + value.slice(1).toLowerCase()

const buildDailySeries = (scans, days, formatter) => {
  const today = startOfUtcDay()
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - index - 1) * DAY_MS)
    const next = new Date(date.getTime() + DAY_MS)
    return {
      label: formatter(date),
      value: scans.filter(({ createdAt }) => createdAt >= date && createdAt < next).length,
    }
  })
}

const buildMonthlySeries = (scans, months = 12) => {
  const now = new Date()
  return Array.from({ length: months }, (_, index) => {
    const offset = months - index - 1
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    return {
      label: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date),
      value: scans.filter(({ createdAt }) => createdAt >= date && createdAt < next).length,
    }
  })
}

const getDashboard = async () => {
  const now = new Date()
  const activityStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1))
  const [totalScans, totalReports, pendingReports, approvedReports, recentScans, statusGroups] = await Promise.all([
    adminRepository.scan.count(),
    adminRepository.scamReport.count(),
    adminRepository.scamReport.count({ where: { status: 'PENDING' } }),
    adminRepository.scamReport.count({ where: { status: 'APPROVED' } }),
    adminRepository.scan.findMany({ where: { createdAt: { gte: activityStart } }, select: { createdAt: true } }),
    adminRepository.scamReport.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const statusCounts = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all]))
  const distribution = [
    ['PENDING', '#f59e0b'],
    ['APPROVED', '#10b981'],
    ['REJECTED', '#ef4444'],
  ]
  const reportDistributionData = distribution.map(([status, color]) => {
    const count = statusCounts[status] || 0
    const percentage = totalReports ? Math.round((count / totalReports) * 100) : 0
    return { id: status.toLowerCase(), name: titleCase(status), count, percent: `${percentage}%`, color }
  })

  return {
    stats: { totalScans, totalReports, pendingReports, approvedReports },
    scanActivityData: {
      week: buildDailySeries(recentScans, 7, (date) => new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(date)),
      month: buildDailySeries(recentScans, 30, (date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`),
      year: buildMonthlySeries(recentScans),
    },
    reportDistributionData,
  }
}

const listUsers = async ({ query }) => {
  const { page, limit, search, status } = query
  const where = {
    role: 'USER',
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone_num: { contains: search } },
      ],
    }),
  }

  const [users, total, totalUsers, submittedReports, publishedReports] = await Promise.all([
    adminRepository.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone_num: true, avatarUrl: true,
        status: true, createdAt: true,
        _count: {
          select: {
            reports: true,
          },
        },
        reports: {
          where: { communityPost: { is: { isPublished: true } } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    adminRepository.user.count({ where }),
    adminRepository.user.count({ where: { role: 'USER' } }),
    adminRepository.user.count({ where: { role: 'USER', reports: { some: {} } } }),
    adminRepository.user.count({ where: { role: 'USER', reports: { some: { communityPost: { is: { isPublished: true } } } } } }),
  ])

  return {
    users: users.map(({ phone_num: phoneNumber, _count, reports, ...user }) => ({
      ...user,
      phoneNumber,
      reportCount: _count.reports,
      publishedReportCount: reports.length,
    })),
    stats: { totalUsers, submittedReports, publishedReports },
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

const listAuditLogs = async ({ query }) => {
  const { page, limit } = query
  const fetchLimit = page * limit
  const [reviews, publications] = await Promise.all([
    adminRepository.scamReport.findMany({
      where: { reviewedAt: { not: null }, reviewedById: { not: null } },
      select: {
        id: true, status: true, reviewNote: true, reviewedAt: true,
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { reviewedAt: 'desc' },
      take: fetchLimit,
    }),
    adminRepository.communityPost.findMany({
      select: {
        id: true, reportId: true, title: true, publishedAt: true,
        author: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: fetchLimit,
    }),
  ])

  const events = [
    ...reviews.map((report) => ({
      id: `review:${report.id}`,
      action: report.status === 'APPROVED' ? 'Approved' : 'Rejected',
      reference: report.id,
      description: report.reviewNote || `${titleCase(report.status)} a submitted scam report`,
      occurredAt: report.reviewedAt,
      admin: report.reviewedBy,
    })),
    ...publications.map((post) => ({
      id: `publish:${post.id}`,
      action: 'Published',
      reference: post.reportId,
      description: `Published “${post.title}” to the community feed`,
      occurredAt: post.publishedAt,
      admin: post.author,
    })),
  ].sort((left, right) => right.occurredAt - left.occurredAt)

  const start = (page - 1) * limit
  return {
    logs: events.slice(start, start + limit),
    meta: { page, limit, hasMore: events.length > start + limit },
  }
}

const setAdminRepositoryForTests = (repository) => {
  adminRepository = repository || prisma
}

export { getDashboard, listAuditLogs, listUsers, setAdminRepositoryForTests }
