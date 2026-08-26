import ApiError from '../utils/api-error.js'

/**
 * Middleware factory to enforce Role-Based Access Control (RBAC).
 * Must be preceded by `requireAuth` in the middleware chain.
 *
 * Usage:
 *   router.get('/admin/reports', requireAuth, requireRole('ADMIN', 'MODERATOR'), listReports)
 *   router.delete('/admin/users/:id', requireAuth, requireRole('ADMIN'), deleteUser)
 *
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'MODERATOR'
 */
const requireRole = (...allowedRoles) => {
  const roles = allowedRoles.flat()

  return (request, _response, next) => {
    if (!request.auth || !request.auth.role) {
      return next(new ApiError(401, 'Authentication is required'))
    }

    if (!roles.includes(request.auth.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'))
    }

    return next()
  }
}

export default requireRole
export { requireRole }
