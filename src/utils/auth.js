import jwt from 'jsonwebtoken'
import env from '../config/env.js'

const tokenCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production' || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

const signToken = (userId, tokenVersion, role = 'USER') =>
  jwt.sign({ sub: userId, tokenVersion, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phoneNumber: user.phone_num,
  age: user.age,
  avatarUrl: user.avatarUrl,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export { publicUser, signToken, tokenCookieOptions }
