import jwt from 'jsonwebtoken'
import env from '../config/env.js'

const tokenCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

const signToken = (userId, tokenVersion) => jwt.sign({ sub: userId, tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phoneNumber: user.phone_num,
  age: user.age,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export { publicUser, signToken, tokenCookieOptions }
