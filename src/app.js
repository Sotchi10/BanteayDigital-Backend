import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import env from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import reportRoutes from './routes/report.routes.js'
import communityRoutes from './routes/community.routes.js'
import commentRoutes from './routes/comment.routes.js'
import adminRoutes from './routes/admin.routes.js'
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
    <style>
      .swagger-auth-helper {
        background: #0f172a;
        color: #f8fafc;
        padding: 12px 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #38bdf8;
        font-size: 13px;
        position: sticky;
        top: 0;
        z-index: 1000;
      }
      .swagger-auth-helper .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 12px;
      }
      .badge-authenticated { background: #065f46; color: #6ee7b7; }
      .badge-guest { background: #334155; color: #cbd5e1; }
      .swagger-auth-helper button {
        background: #2563eb;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.15s ease;
      }
      .swagger-auth-helper button:hover { background: #1d4ed8; }
      .swagger-auth-helper button.btn-clear { background: #dc2626; margin-left: 6px; }
      .swagger-auth-helper button.btn-clear:hover { background: #b91c1c; }
    </style>
  </head>
  <body>
    <div class="swagger-auth-helper">
      <div>
        <strong style="color: #38bdf8; margin-right: 8px;">🛡️ BanteayDigital API</strong>
        <span id="authStatusBadge" class="status-badge badge-guest">⚪ Not Authenticated</span>
        <span id="authUserInfo" style="margin-left: 10px; color: #94a3b8;"></span>
      </div>
      <div>
        <button id="btnQuickMe" onclick="checkAuthStatus()">🔄 Sync Auth Status</button>
        <button id="btnClearAuth" class="btn-clear" onclick="clearAuth()">🚪 Log Out</button>
      </div>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      function updateAuthUI(token, user) {
        const badge = document.getElementById('authStatusBadge')
        const info = document.getElementById('authUserInfo')
        if (token || user) {
          badge.className = 'status-badge badge-authenticated'
          badge.textContent = '🟢 Authenticated'
          info.textContent = user ? (user.name || user.email || user.phoneNumber) + ' (' + (user.role || 'USER') + ')' : 'JWT Active'
        } else {
          badge.className = 'status-badge badge-guest'
          badge.textContent = '⚪ Not Authenticated'
          info.textContent = 'Use /api/v1/auth/login or /register below'
        }
      }

      function checkAuthStatus() {
        fetch('/api/v1/auth/me', { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.user) {
              updateAuthUI(true, data.user)
            } else {
              const savedToken = sessionStorage.getItem('bd_swagger_token')
              updateAuthUI(Boolean(savedToken), null)
            }
          })
          .catch(() => updateAuthUI(false, null))
      }

      function clearAuth() {
        sessionStorage.removeItem('bd_swagger_token')
        fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
          .finally(() => {
            if (window.ui) {
              window.ui.authActions.logout(['bearerAuth', 'cookieAuth'])
            }
            updateAuthUI(false, null)
          })
      }

      window.ui = SwaggerUIBundle({
        url: '/swagger.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        withCredentials: true,
        requestInterceptor: (req) => {
          req.credentials = 'include'
          const token = sessionStorage.getItem('bd_swagger_token')
          if (token && !req.headers['Authorization']) {
            req.headers['Authorization'] = 'Bearer ' + token
          }
          return req
        },
        responseInterceptor: (res) => {
          try {
            if (res.status === 200 || res.status === 201) {
              let body = res.body
              if (typeof body === 'string') {
                try { body = JSON.parse(body) } catch(e) {}
              }
              if (body && (body.user || body.token)) {
                if (body.token) {
                  const token = body.token
                  sessionStorage.setItem('bd_swagger_token', token)
                  window.ui.preauthorizeApiKey('bearerAuth', token)
                  window.ui.preauthorizeApiKey('cookieAuth', token)
                }
                updateAuthUI(true, body.user)
              }
            }
          } catch(e) {
            console.error('Swagger auth interceptor error:', e)
          }
          return res
        },
        onComplete: () => {
          const savedToken = sessionStorage.getItem('bd_swagger_token')
          if (savedToken) {
            window.ui.preauthorizeApiKey('bearerAuth', savedToken)
          }
          checkAuthStatus()
        }
      })
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
  app.use('/api/v1/posts', communityRoutes)
  app.use('/api/v1/comments', commentRoutes)
  app.use('/api/v1/admin', adminRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export { createApp }
