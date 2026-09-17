import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const sslAccept = url.searchParams.get('sslaccept')
const sslCertPath = url.searchParams.get('sslcert')
if (process.env.NODE_ENV === 'production' && sslAccept !== 'strict') {
  throw new Error('Production DATABASE_URL must include sslaccept=strict')
}

const ssl = sslAccept === 'strict' || sslCertPath
  ? {
      rejectUnauthorized: true,
      ...(sslCertPath ? { ca: readFileSync(resolve(sslCertPath), 'utf8') } : {}),
    }
  : undefined

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  ...(ssl ? { ssl } : {}),
})
const prisma = new PrismaClient({ adapter })

export default prisma
