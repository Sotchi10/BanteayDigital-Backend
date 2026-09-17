import { createApp } from './app.js'
import env from './config/env.js'
import prisma from './config/database.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`)
  console.log(`Swagger API running on http://localhost:${env.port}/api-doc`)
})

let shuttingDown = false
const shutdown = async (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received; shutting down gracefully`)
  server.close(async (error) => {
    await prisma.$disconnect().catch(() => undefined)
    process.exit(error ? 1 : 0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
