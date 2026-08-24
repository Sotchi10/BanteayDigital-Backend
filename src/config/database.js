import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/index.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before initializing the MySQL connection.')
}

// Prisma CLI uses the standard mysql:// URL. Its MariaDB driver adapter
// expects the equivalent mariadb:// scheme at runtime.
const connectionString = databaseUrl.replace(/^mysql:\/\//i, 'mariadb://')
const adapter = new PrismaMariaDb(connectionString)
const prisma = new PrismaClient({ adapter })

export default prisma
