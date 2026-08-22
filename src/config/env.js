import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: jwtSecret || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default env
