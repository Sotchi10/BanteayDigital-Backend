import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import env from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import reportRoutes from './routes/report.routes.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'

const swaggerSpecPath = fileURLToPath(new URL('../swagger.yaml', import.meta.url))
const uploadsPath = path.resolve(process.cwd(), 'uploads')

const swaggerUiPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BanteayDigital API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/swagger.yaml', dom_id: '#swagger-ui' })
    </script>
  </body>
</html>`

function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientOrigins, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  // Serve static uploads
  app.use('/uploads', express.static(uploadsPath))

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.get('/swagger.yaml', (_request, response) => {
    response.type('application/yaml').sendFile(swaggerSpecPath)
  })

  app.get(['/api-doc', '/api-docs'], (_request, response) => {
    response.type('html').send(swaggerUiPage)
  })

  // API Routes
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/reports', reportRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export { createApp }
