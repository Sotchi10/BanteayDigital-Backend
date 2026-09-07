# Backend Configuration Guide

The backend is an Express application in `backend/`. It uses Prisma with a MySQL database for authentication, scans, reports, and community posts. Qdrant is currently a separately managed RAG container; the backend does not yet query it.

## Current structure

| Path | Responsibility |
| --- | --- |
| `src/server.js` | Starts the API server. |
| `src/app.js` | Registers middleware, API routes, Swagger, and error handlers. |
| `src/config/env.js` | Loads and validates runtime settings. |
| `src/config/database.js` | Creates the Prisma database client. |
| `src/prisma/schema.prisma` | Defines the MySQL schema. |
| `src/prisma/migrations/` | Versioned database migrations. |
| `.env.example` | Safe environment-variable template. |

## Backend environment

Create `backend/.env` from `backend/.env.example`:

```env
NODE_ENV=development
PORT=3000
CLIENT_ORIGINS=http://localhost:5173

# Use a long random value. It is required when NODE_ENV=production.
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

# Encode reserved characters in the username or password; @ becomes %40.
DATABASE_URL="mysql://banteay_user:password@localhost:3306/banteay_digital"

# AI service health endpoint; required for /api/health/ai-service.
AI_SERVICE_URL=http://localhost:8000
```

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Set to `production` when deployed. |
| `PORT` | No | `3000` | Backend listening port. |
| `CLIENT_ORIGINS` | No | `http://localhost:5173` | Comma-separated frontend origins allowed by CORS. |
| `JWT_SECRET` | Yes in production | Development-only fallback | Must be unique, random, and kept secret. |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime accepted by `jsonwebtoken`. |
| `DATABASE_URL` | Yes | None | Prisma/MySQL connection URL. |
| `AI_SERVICE_URL` | No | None | AI service base URL, used by the AI health bridge. |

`VITE_BACKEND_URL` belongs in the frontend environment, not the backend configuration.

## MySQL and Prisma

Create a MySQL database and application user, then set `DATABASE_URL` to match it:

```sql
CREATE DATABASE banteay_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'banteay_user'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON banteay_digital.* TO 'banteay_user'@'%';
FLUSH PRIVILEGES;
```

Run from `backend/`:

```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed:scam-cases
npm run dev
```

Use `npm run prisma:push` only for throwaway local schema experiments. Use migrations for shared or production databases. The current Prisma runtime uses `@prisma/adapter-mariadb` as its TCP driver; despite the package name, it supports MySQL and is required by the existing client setup. Keep the configured URL in `mysql://` format.

## API and verification

With the backend running:

```text
Health:  http://localhost:3000/api/health
Swagger: http://localhost:3000/api-doc
```

The frontend should use `http://localhost:3000` as its API base URL and must be included in `CLIENT_ORIGINS` when cookies are used.

When the AI service is running, verify the backend-to-AI connection with `GET http://localhost:3000/api/health/ai-service`.

## Qdrant / RAG container

Qdrant is the only service you currently run in Docker. No Compose file is required. If you need to create (or recreate) it, use a named volume so vectors survive container replacement. Choose a pinned Qdrant image version for a production deployment.

```powershell
# Run once: create persistent storage for Qdrant data.
docker volume create qdrant_storage

# Create and start the Qdrant container.
docker run -d --name banteay-qdrant --restart unless-stopped -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest
```

Do not run the create command again if your existing Qdrant container is already working; Docker will reject a duplicate container name. Inspect and verify the existing container instead:

```powershell
docker ps
Invoke-RestMethod http://localhost:6333/healthz
```

Common lifecycle commands:

```powershell
docker stop banteay-qdrant
docker start banteay-qdrant
docker logs banteay-qdrant
```

For a future AI service, use `QDRANT_URL=http://localhost:6333` when it runs on the host. If that AI service runs in Docker on the same network as Qdrant, use `http://<qdrant-container-name>:6333` instead. Keep Qdrant storage persistent and do not expose port `6333` publicly.

The present backend scanner uses deterministic checks and MySQL `ScamCase` records. Adding `QDRANT_URL`, model keys, or LLM settings to `backend/.env` will have no effect until the AI/RAG integration is implemented.

## Production essentials

- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and explicit HTTPS `CLIENT_ORIGINS`.
- Store the database URL and secrets outside source control.
- Back up MySQL and the Qdrant storage volume before migrations or upgrades.
- Run migrations once per release and keep MySQL/Qdrant private to the application network.
