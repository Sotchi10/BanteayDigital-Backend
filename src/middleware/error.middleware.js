const notFoundHandler = (request, _response, next) => {
  const error = new Error(`Route ${request.method} ${request.originalUrl} was not found`)
  error.statusCode = 404
  next(error)
}

const errorHandler = (error, _request, response, _next) => {
  const statusCode = error.statusCode || error.status || 500
  const body = {
    message: statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed',
  }

  if (error.details && statusCode < 500) {
    body.details = error.details
  }

  response.status(statusCode).json(body)
}

export { errorHandler, notFoundHandler }
