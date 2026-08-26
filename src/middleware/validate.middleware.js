import ApiError from '../utils/api-error.js'

const applyParsedValue = (request, source, data) => {
  const target = request[source]

  if (source === 'query') {
    try {
      Object.defineProperty(request, source, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: data,
      })
      return
    } catch {
    }
  }

  if (target && typeof target === 'object') {
    for (const key of Object.keys(target)) {
      delete target[key]
    }
    Object.assign(target, data)
    return
  }

  request[source] = data
}

const validate = (schema, source = 'body') => (request, _response, next) => {
  if (schema && typeof schema === 'object' && ('body' in schema || 'query' in schema || 'params' in schema)) {
    if (schema.params) {
      const parsed = schema.params.safeParse(request.params)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid route parameters', parsed.error.flatten().fieldErrors))
      }
      applyParsedValue(request, 'params', parsed.data)
    }
    if (schema.query) {
      const parsed = schema.query.safeParse(request.query)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid query parameters', parsed.error.flatten().fieldErrors))
      }
      applyParsedValue(request, 'query', parsed.data)
    }
    if (schema.body) {
      const parsed = schema.body.safeParse(request.body)
      if (!parsed.success) {
        return next(new ApiError(400, 'Invalid request data', parsed.error.flatten().fieldErrors))
      }
      applyParsedValue(request, 'body', parsed.data)
    }
    return next()
  }

  const target = request[source] || {}
  const parsed = schema.safeParse(target)

  if (!parsed.success) {
    return next(new ApiError(400, `Invalid request ${source}`, parsed.error.flatten().fieldErrors))
  }

  applyParsedValue(request, source, parsed.data)
  return next()
}

export default validate
