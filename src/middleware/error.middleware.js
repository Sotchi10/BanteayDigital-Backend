import ApiError from '../utils/api-error.js'

const notFoundHandler = (request, _response, next) => {
  const error = new Error(`Route ${request.method} ${request.originalUrl} was not found`)
  error.statusCode = 404
  next(error)
}

const errorHandler = (error, request, response, _next) => {
  const statusCode = error.statusCode || error.status || 500

  if (statusCode >= 500) {
    console.error('Unhandled API error', {
      method: request.method,
      path: request.originalUrl,
      message: error.message,
      stack: error.stack,
    })
  }

  const body = {
    message: error instanceof ApiError ? error.message : statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed',
  }

  if (error.details && (error instanceof ApiError || statusCode < 500)) {
    body.details = error.details
  }

  response.status(statusCode).json(body)
}

export { errorHandler, notFoundHandler }
