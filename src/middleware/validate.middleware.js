import ApiError from '../utils/api-error.js'

/**
 * Validate request body, query, or params with a Zod schema.
 *
 * Supports:
 * - validate(schema) -> validates request.body (default)
 * - validate(schema, 'query') -> validates request.query
 * - validate(schema, 'params') -> validates request.params
 * - validate({ body?: schema, query?: schema, params?: schema })
 */
const validate = (schema, source = 'body') => (request, _response, next) => {
  if (schema && typeof schema === 'object' && ('body' in schema || 'query' in schema || 'params' in schema)) {
    if (schema.params) {
      const parsed = schema.params.safeParse(request.params)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid route parameters', parsed.error.flatten().fieldErrors))
      }
      request.params = parsed.data
    }
    if (schema.query) {
      const parsed = schema.query.safeParse(request.query)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid query parameters', parsed.error.flatten().fieldErrors))
      }
      request.query = parsed.data
    }
    if (schema.body) {
      const parsed = schema.body.safeParse(request.body)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid request data', parsed.error.flatten().fieldErrors))
      }
      request.body = parsed.data
    }
    return next()
  }

  const target = request[source] || {}
  const parsed = schema.safeParse(target)

  if (!parsed.success) {
    return next(new ApiError(400, `Invalid request ${source}`, parsed.error.flatten().fieldErrors))
  }

  request[source] = parsed.data
  return next()
}

export default validate
