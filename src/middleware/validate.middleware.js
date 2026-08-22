import ApiError from '../utils/api-error.js'

const validate = (schema) => (request, _response, next) => {
  const parsed = schema.safeParse(request.body)

  if (!parsed.success) {
    return next(new ApiError(400, 'Invalid request data', parsed.error.flatten().fieldErrors))
  }

  request.body = parsed.data
  return next()
}

export default validate
