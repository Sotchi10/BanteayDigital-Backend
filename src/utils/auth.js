import jwt from 'jsonwebtoken'
import env from '../config/env.js'

const tokenCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production' || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

// Cookie deletion must use the same scope attributes as the cookie that was
// issued. Do not include maxAge/expires when clearing it.
const tokenClearCookieOptions = {
  httpOnly: tokenCookieOptions.httpOnly,
  secure: tokenCookieOptions.secure,
  sameSite: tokenCookieOptions.sameSite,
  path: tokenCookieOptions.path,
}

const signToken = (userId, tokenVersion, role = 'USER') =>
  jwt.sign({ sub: userId, tokenVersion, role }, env.jwtSecret, {
    algorithm: 'HS256',
    audience: env.jwtAudience,
    expiresIn: env.jwtExpiresIn,
    issuer: env.jwtIssuer,
  })

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  username: user.username,
  phoneNumber: user.phone_num,
  age: user.age,
  avatarUrl: user.avatarUrl,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export { publicUser, signToken, tokenClearCookieOptions, tokenCookieOptions }
