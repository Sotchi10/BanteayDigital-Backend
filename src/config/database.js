import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/index.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before initializing the MySQL connection.')
}

const url = new URL(databaseUrl)

if (url.protocol !== 'mysql:') {
  throw new Error('DATABASE_URL must use the mysql:// scheme.')
}

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, '')),
})
const prisma = new PrismaClient({ adapter })

export default prisma
