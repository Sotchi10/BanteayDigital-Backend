import {
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
} from '../services/community.service.js'

const getPosts = async (request, response, next) => {
  try {
    const result = await listPosts({
      query: request.query,
      currentUserId: request.auth?.userId,
    })
    return response.status(200).json({
      success: true,
      data: result.posts,
      meta: result.meta,
    })
  } catch (error) {
    return next(error)
  }
}

const getPost = async (request, response, next) => {
  try {
    const post = await getPostById({
      id: request.params.id,
      currentUserId: request.auth?.userId,
      userRole: request.auth?.role,
    })
    return response.status(200).json({
      success: true,
      data: post,
    })
  } catch (error) {
    return next(error)
  }
}

const likePost = async (request, response, next) => {
  try {
    const result = await togglePostLike({
      postId: request.params.id,
      userId: request.auth.userId,
    })
    return response.status(200).json({
      success: true,
      message: result.isLiked ? 'Post liked' : 'Post unliked',
      data: result,
    })
  } catch (error) {
    return next(error)
  }
}

const getLikes = async (request, response, next) => {
  try {
    const result = await getPostLikes({
      postId: request.params.id,
      query: request.query,
    })
    return response.status(200).json({
      success: true,
      data: result.likes,
      meta: result.meta,
    })
  } catch (error) {
    return next(error)
  }
}

const bookmarkPost = async (request, response, next) => {
  try {
    const result = await togglePostBookmark({
      postId: request.params.id,
      userId: request.auth.userId,
    })
    return response.status(200).json({
      success: true,
      message: result.isBookmarked ? 'Post saved to bookmarks' : 'Post removed from bookmarks',
      data: result,
    })
  } catch (error) {
    return next(error)
  }
}

const getComments = async (request, response, next) => {
  try {
    const result = await listPostComments({
      postId: request.params.id,
      query: request.query,
    })
    return response.status(200).json({
      success: true,
      data: result.comments,
      meta: result.meta,
    })
  } catch (error) {
    return next(error)
  }
}

const addComment = async (request, response, next) => {
  try {
    const comment = await createPostComment({
      postId: request.params.id,
      userId: request.auth.userId,
      data: request.body,
    })
    return response.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: comment,
    })
  } catch (error) {
    return next(error)
  }
}

const editComment = async (request, response, next) => {
  try {
    const comment = await updateComment({
      commentId: request.params.id,
      userId: request.auth.userId,
      userRole: request.auth.role,
      data: request.body,
    })
    return response.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    })
  } catch (error) {
    return next(error)
  }
}

const removeComment = async (request, response, next) => {
  try {
    const result = await deleteComment({
      commentId: request.params.id,
      userId: request.auth.userId,
      userRole: request.auth.role,
    })
    return response.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    return next(error)
  }
}

const sharePost = async (request, response, next) => {
  try {
    const result = await trackPostShare({
      postId: request.params.id,
      userId: request.auth?.userId,
      data: request.body,
    })
    return response.status(200).json({
      success: true,
      message: 'Share tracked successfully',
      data: result,
    })
  } catch (error) {
    return next(error)
  }
}

const reviewReport = async (request, response, next) => {
  try {
    const result = await adminReviewReportAndPublish({
      reportId: request.params.id,
      adminId: request.auth.userId,
      data: request.body,
    })
    return response.status(200).json({
      success: true,
      message: 'Report reviewed successfully',
      data: result,
    })
  } catch (error) {
    return next(error)
  }
}

const createAdminPost = async (request, response, next) => {
  try {
    const post = await adminCreatePost({
      adminId: request.auth.userId,
      data: request.body,
    })
    return response.status(201).json({
      success: true,
      message: 'Community post created successfully',
      data: post,
    })
  } catch (error) {
    return next(error)
  }
}

const updateAdminPost = async (request, response, next) => {
  try {
    const post = await adminUpdatePost({
      postId: request.params.id,
      data: request.body,
    })
    return response.status(200).json({
      success: true,
      message: 'Community post updated successfully',
      data: post,
    })
  } catch (error) {
    return next(error)
  }
}

const deleteAdminPost = async (request, response, next) => {
  try {
    const result = await adminDeletePost({
      postId: request.params.id,
    })
    return response.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    return next(error)
  }
}

export {
  getPosts,
  getPost,
  likePost,
  getLikes,
  bookmarkPost,
  getComments,
  addComment,
  editComment,
  removeComment,
  sharePost,
  reviewReport,
  createAdminPost,
  updateAdminPost,
  deleteAdminPost,
}
