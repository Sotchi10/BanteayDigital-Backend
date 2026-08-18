import express from 'express'
import cors from 'cors'
import env from './config/env.js'

function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientOrigins, credentials: true }))
  app.use(express.json())

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' })
  })

  return app
}

export { createApp }
