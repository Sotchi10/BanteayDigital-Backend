import asyncHandler from '../utils/async-handler.js'
import { getPublicProfile } from '../services/public-profile.service.js'

const getByUsername = asyncHandler(async (request, response) => {
  const profile = await getPublicProfile({ username: request.params.username })
  response.json({ profile })
})

export { getByUsername }
