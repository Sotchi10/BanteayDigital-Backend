import { getUserById, loginUser, registerUser, revokeUserTokens } from '../services/auth.service.js'
import asyncHandler from '../utils/async-handler.js'
import { publicUser, signToken, tokenCookieOptions } from '../utils/auth.js'

const sendAuthenticatedUser = (response, statusCode, user) => {
  const token = signToken(user.id, user.tokenVersion, user.role)
  response.status(statusCode).cookie('token', token, tokenCookieOptions).json({
    user: publicUser(user),
  })
}

const register = asyncHandler(async (request, response) => {
  const user = await registerUser(request.body)
  sendAuthenticatedUser(response, 201, user)
})

const login = asyncHandler(async (request, response) => {
  const user = await loginUser(request.body)
  sendAuthenticatedUser(response, 200, user)
})

const me = asyncHandler(async (request, response) => {
  const user = await getUserById(request.auth.userId)
  response.status(200).json({ user: publicUser(user) })
})

const logout = asyncHandler(async (request, response) => {
  await revokeUserTokens(request.auth.userId)
  response.clearCookie('token', { ...tokenCookieOptions, maxAge: undefined }).status(200).json({ message: 'Logged out successfully' })
})

export { login, logout, me, register }
