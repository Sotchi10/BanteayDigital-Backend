import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

/**
 * List published community posts with search, filtering, pagination, and interaction flags.
 */
const listPosts = async ({ query, currentUserId }) => {
  const {
    category,
    severity,
    postType,
    search,
    page = 1,
    limit = 20,
    sortBy = 'latest',
    order = 'desc',
  } = query

  const skip = (page - 1) * limit

  const where = {
    status: 'PUBLISHED',
    ...(category && { category }),
    ...(severity && { severity }),
    ...(postType && { postType }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { summary: { contains: search } },
        { content: { contains: search } },
      ],
    }),
  }

  // Determine sorting logic
  let orderBy = [{ isPinned: 'desc' }, { publishedAt: order }]
  if (sortBy === 'popular') {
    orderBy = [{ isPinned: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }]
  } else if (sortBy === 'critical') {
    orderBy = [{ isPinned: 'desc' }, { severity: 'asc' }, { publishedAt: 'desc' }]
  }

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
        },
        report: {
          select: {
            id: true,
            category: true,
            scammerContact: true,
            financialLossAmount: true,
            currency: true,
            incidentDate: true,
            extractedIndicators: {
              select: {
                id: true,
                type: true,
                value: true,
                riskScore: true,
                isBlacklisted: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
          },
        },
      },
    }),
    prisma.communityPost.count({ where }),
  ])

  // If user is authenticated, check their likes and bookmarks
  let userLikesSet = new Set()
  let userBookmarksSet = new Set()

  if (currentUserId && posts.length > 0) {
    const postIds = posts.map((p) => p.id)
    const [likes, bookmarks] = await Promise.all([
      prisma.postLike.findMany({
        where: {
          userId: currentUserId,
          postId: { in: postIds },
        },
        select: { postId: true },
      }),
      prisma.postBookmark.findMany({
        where: {
          userId: currentUserId,
          postId: { in: postIds },
        },
        select: { postId: true },
      }),
    ])

    userLikesSet = new Set(likes.map((l) => l.postId))
    userBookmarksSet = new Set(bookmarks.map((b) => b.postId))
  }

  const formattedPosts = posts.map((post) => ({
    id: post.id,
    reportId: post.reportId,
    title: post.title,
    summary: post.summary,
    content: post.content,
    category: post.category,
    severity: post.severity,
    postType: post.postType,
    status: post.status,
    isPinned: post.isPinned,
    viewCount: post.viewCount,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isLikedByMe: userLikesSet.has(post.id),
    isBookmarkedByMe: userBookmarksSet.has(post.id),
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    author: post.author,
    media: post.media,
    report: post.report,
  }))

  return {
    posts: formattedPosts,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Get single post details and atomically increment view count.
 */
const getPostById = async ({ id, currentUserId, userRole }) => {
  const isAdmin = userRole === 'ADMIN'

  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
        },
      },
      media: {
        orderBy: { order: 'asc' },
      },
      report: {
        select: {
          id: true,
          category: true,
          scammerContact: true,
          financialLossAmount: true,
          currency: true,
          incidentDate: true,
          extractedIndicators: {
            select: {
              id: true,
              type: true,
              value: true,
              riskScore: true,
              isBlacklisted: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
  })

  if (!post) {
    throw new ApiError(404, 'Community post not found')
  }

  if (post.status !== 'PUBLISHED' && !isAdmin) {
    throw new ApiError(404, 'Community post not found')
  }

  // Increment viewCount asynchronously
  prisma.communityPost
    .update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      // ignore viewCount increment errors
    })

  let isLikedByMe = false
  let isBookmarkedByMe = false

  if (currentUserId) {
    const [like, bookmark] = await Promise.all([
      prisma.postLike.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId: currentUserId,
          },
        },
      }),
      prisma.postBookmark.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId: currentUserId,
          },
        },
      }),
    ])

    isLikedByMe = Boolean(like)
    isBookmarkedByMe = Boolean(bookmark)
  }

  return {
    id: post.id,
    reportId: post.reportId,
    title: post.title,
    summary: post.summary,
    content: post.content,
    category: post.category,
    severity: post.severity,
    postType: post.postType,
    status: post.status,
    isPinned: post.isPinned,
    viewCount: post.viewCount + 1,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    shareCount: post._count.shares,
    isLikedByMe,
    isBookmarkedByMe,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    author: post.author,
    media: post.media,
    report: post.report,
  }
}

/**
 * Toggle post like for an authenticated user.
 */
const togglePostLike = async ({ postId, userId }) => {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  })

  if (!post || post.status !== 'PUBLISHED') {
    throw new ApiError(404, 'Post not found')
  }

  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  })

  let isLiked = false
  if (existingLike) {
    await prisma.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    })
    isLiked = false
  } else {
    await prisma.postLike.create({
      data: {
        postId,
        userId,
      },
    })
    isLiked = true
  }

  const likeCount = await prisma.postLike.count({ where: { postId } })

  return {
    isLiked,
    likeCount,
  }
}

/**
 * Get list of users who liked the post (for Likes Modal).
 */
const getPostLikes = async ({ postId, query }) => {
  const { page = 1, limit = 50 } = query
  const skip = (page - 1) * limit

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true },
  })

  if (!post) {
    throw new ApiError(404, 'Post not found')
  }

  const [likes, total] = await Promise.all([
    prisma.postLike.findMany({
      where: { postId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    }),
    prisma.postLike.count({ where: { postId } }),
  ])

  const formattedLikes = likes.map((l) => ({
    id: l.id,
    user: l.user,
    createdAt: l.createdAt,
  }))

  return {
    likes: formattedLikes,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Toggle post bookmark for an authenticated user.
 */
const togglePostBookmark = async ({ postId, userId }) => {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  })

  if (!post || post.status !== 'PUBLISHED') {
    throw new ApiError(404, 'Post not found')
  }

  const existingBookmark = await prisma.postBookmark.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  })

  let isBookmarked = false
  if (existingBookmark) {
    await prisma.postBookmark.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    })
    isBookmarked = false
  } else {
    await prisma.postBookmark.create({
      data: {
        postId,
        userId,
      },
    })
    isBookmarked = true
  }

  return {
    isBookmarked,
  }
}

/**
 * List 1-level threaded comments for a community post.
 */
const listPostComments = async ({ postId, query }) => {
  const { page = 1, limit = 50 } = query
  const skip = (page - 1) * limit

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true },
  })

  if (!post) {
    throw new ApiError(404, 'Post not found')
  }

  const [topLevelComments, total] = await Promise.all([
    prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    }),
    prisma.comment.count({
      where: {
        postId,
        parentId: null,
      },
    }),
  ])

  return {
    comments: topLevelComments,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Create a new comment or 1-level reply to an existing comment.
 */
const createPostComment = async ({ postId, userId, data }) => {
  const { content, parentId } = data

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  })

  if (!post || post.status !== 'PUBLISHED') {
    throw new ApiError(404, 'Post not found')
  }

  let finalParentId = null
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, parentId: true },
    })

    if (!parentComment || parentComment.postId !== postId) {
      throw new ApiError(400, 'Parent comment not found on this post')
    }

    // Enforce strict 1-level nesting:
    // If the referenced comment is already a reply, point to its root parent comment.
    finalParentId = parentComment.parentId || parentComment.id
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId,
      parentId: finalParentId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  })

  return comment
}

/**
 * Edit an existing comment.
 */
const updateComment = async ({ commentId, userId, userRole, data }) => {
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  })

  if (!existingComment) {
    throw new ApiError(404, 'Comment not found')
  }

  if (existingComment.userId !== userId && userRole !== 'ADMIN') {
    throw new ApiError(403, 'You do not have permission to edit this comment')
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: data.content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  })

  return updatedComment
}

/**
 * Delete a comment (and its child replies).
 */
const deleteComment = async ({ commentId, userId, userRole }) => {
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  })

  if (!existingComment) {
    throw new ApiError(404, 'Comment not found')
  }

  if (existingComment.userId !== userId && userRole !== 'ADMIN') {
    throw new ApiError(403, 'You do not have permission to delete this comment')
  }

  await prisma.comment.delete({
    where: { id: commentId },
  })

  return { message: 'Comment deleted successfully' }
}

/**
 * Track an external social share (Telegram, Facebook, Messenger, Copy Link).
 */
const trackPostShare = async ({ postId, userId, data }) => {
  const { channel = 'OTHER' } = data

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  })

  if (!post || post.status !== 'PUBLISHED') {
    throw new ApiError(404, 'Post not found')
  }

  await prisma.postShare.create({
    data: {
      postId,
      userId: userId || null,
      channel,
    },
  })

  const shareCount = await prisma.postShare.count({
    where: { postId },
  })

  return {
    shareCount,
    channel,
  }
}

/**
 * Admin: Review a scam report and optionally publish as a community post.
 */
const adminReviewReportAndPublish = async ({ reportId, adminId, data }) => {
  const {
    status,
    reviewNote,
    publishToCommunity = true,
    postTitle,
    postSummary,
    postContent,
    severity = 'HIGH',
    category,
    isPinned = false,
    publicEvidenceIds = [],
  } = data

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      evidence: true,
      communityPost: true,
    },
  })

  if (!report) {
    throw new ApiError(404, 'Report not found')
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update report status
    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status,
        category: category || report.category,
      },
    })

    // 2. Add audit log
    await tx.reportReviewLog.create({
      data: {
        reportId,
        adminId,
        previousStatus: report.status,
        newStatus: status,
        reviewNote: reviewNote || null,
      },
    })

    // 3. Mark selected evidence as safe for public display
    if (publicEvidenceIds.length > 0) {
      await tx.reportEvidence.updateMany({
        where: {
          reportId,
          id: { in: publicEvidenceIds },
        },
        data: { isPublicSafe: true },
      })
    }

    let communityPost = null

    // 4. If approved and publishToCommunity is requested, create/update community post
    if (status === 'APPROVED' && publishToCommunity) {
      const finalTitle = (postTitle || report.title).trim()
      const finalContent = (postContent || report.description).trim()
      const finalSummary = (postSummary || finalContent.slice(0, 200)).trim()
      const finalCategory = category || report.category

      if (report.communityPost) {
        // Update existing community post
        communityPost = await tx.communityPost.update({
          where: { id: report.communityPost.id },
          data: {
            title: finalTitle,
            summary: finalSummary,
            content: finalContent,
            category: finalCategory,
            severity,
            isPinned,
            status: 'PUBLISHED',
          },
          include: { media: true },
        })
      } else {
        // Create new community post
        communityPost = await tx.communityPost.create({
          data: {
            reportId: report.id,
            authorId: adminId,
            title: finalTitle,
            summary: finalSummary,
            content: finalContent,
            category: finalCategory,
            severity,
            postType: 'COMMUNITY_REPORT',
            status: 'PUBLISHED',
            isPinned,
          },
        })

        // Copy public safe evidence to PostMedia
        const safeEvidence = await tx.reportEvidence.findMany({
          where: {
            reportId,
            isPublicSafe: true,
          },
        })

        if (safeEvidence.length > 0) {
          await tx.postMedia.createMany({
            data: safeEvidence.map((ev, idx) => ({
              postId: communityPost.id,
              mediaUrl: ev.fileUrl,
              mediaType: ev.fileType,
              caption: ev.fileName,
              order: idx,
            })),
          })
        }

        communityPost = await tx.communityPost.findUnique({
          where: { id: communityPost.id },
          include: { media: true },
        })
      }
    }

    return {
      report: updatedReport,
      communityPost,
    }
  })

  return result
}

/**
 * Admin: Directly create an official community post.
 */
const adminCreatePost = async ({ adminId, data }) => {
  const {
    title,
    summary,
    content,
    category = 'OTHER',
    severity = 'HIGH',
    postType = 'COMMUNITY_REPORT',
    isPinned = false,
    reportId,
    media = [],
  } = data

  const post = await prisma.communityPost.create({
    data: {
      authorId: adminId,
      reportId: reportId || null,
      title,
      summary,
      content,
      category,
      severity,
      postType,
      status: 'PUBLISHED',
      isPinned,
      media: media.length > 0
        ? {
            create: media.map((m, idx) => ({
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType || 'IMAGE',
              caption: m.caption,
              order: m.order ?? idx,
            })),
          }
        : undefined,
    },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      media: true,
    },
  })

  return post
}

/**
 * Admin: Update an existing community post.
 */
const adminUpdatePost = async ({ postId, data }) => {
  const existingPost = await prisma.communityPost.findUnique({
    where: { id: postId },
  })

  if (!existingPost) {
    throw new ApiError(404, 'Community post not found')
  }

  const { media, ...fields } = data

  const updatedPost = await prisma.$transaction(async (tx) => {
    if (media) {
      await tx.postMedia.deleteMany({ where: { postId } })
      if (media.length > 0) {
        await tx.postMedia.createMany({
          data: media.map((m, idx) => ({
            postId,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType || 'IMAGE',
            caption: m.caption,
            order: m.order ?? idx,
          })),
        })
      }
    }

    return tx.communityPost.update({
      where: { id: postId },
      data: fields,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        media: true,
      },
    })
  })

  return updatedPost
}

/**
 * Admin: Delete/Archive a community post.
 */
const adminDeletePost = async ({ postId }) => {
  const existingPost = await prisma.communityPost.findUnique({
    where: { id: postId },
  })

  if (!existingPost) {
    throw new ApiError(404, 'Community post not found')
  }

  await prisma.communityPost.delete({
    where: { id: postId },
  })

  return { message: 'Community post deleted successfully' }
}

export {
  listPosts,
  getPostById,
  togglePostLike,
  getPostLikes,
  togglePostBookmark,
  listPostComments,
  createPostComment,
  updateComment,
  deleteComment,
  trackPostShare,
  adminReviewReportAndPublish,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
}
