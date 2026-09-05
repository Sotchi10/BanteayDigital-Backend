# BanteayDigital backend handoff

## Current scope

This Express + Prisma/MySQL service owns user accounts, private scans, user-requested
moderator reports, and sanitized community posts. The current workflow is:

`Private Scan -> User requests report -> Moderator review -> Sanitized CommunityPost`

Scans require authentication and belong to their creator. A report is created only when
that user explicitly submits a scan for moderation. Approving a report does not publish
anything: an administrator must provide separate, sanitized public content to publish a
community post.

The scanner is deterministic and rule-based. It is intentionally not an AI, RAG,
embedding, or Qdrant integration.

## Run locally

1. Copy `.env.example` to `.env` and set a working MySQL `DATABASE_URL` and a strong
   `JWT_SECRET`.
2. Run `npm.cmd run prisma:generate` if the generated Prisma client is stale.
3. Apply the checked-in migrations to the target database.
4. Run `npm.cmd run dev` or `npm.cmd start`.

`npm.cmd test` runs unit and route tests without requiring a database. To also run
the live MySQL connectivity check against `DATABASE_URL`, use
`$env:RUN_DATABASE_TESTS='true'; npm.cmd test` in PowerShell.

## API surface

- `POST /api/v1/auth/register`, `POST /login`; `GET /me`; `POST /logout`
- Authenticated `POST /api/v1/scans`, `GET /api/v1/scans/:id`, and
  `POST /api/v1/scans/:id/report`
- Authenticated `/api/v1/reports` (the caller's reports)
- Admin `/api/v1/admin/reports`, approval/rejection, and explicit sanitized publishing
- Public `/api/v1/community/posts`

OpenAPI documentation is available at `/api-doc` and `/api-docs`; the source is
`swagger.yaml`.

## Scam-case sample data and the future AI service

`data/scam_datas.csv` contains 10 synthetic example cases. They map directly to the
canonical `ScamCase` Prisma model: the stable CSV `id` is the primary key, pipe-delimited
`indicators` are imported as a JSON array, and the remaining columns map to their
camel-cased model fields. Apply migrations, then run `npm run prisma:seed:scam-cases`
to import or update the catalogue idempotently.

`ScamCase` is deliberately independent of user reports. The scanner reads this
single curated catalogue directly, and a future AI service can use the same
backend-owned retrieval contract without maintaining a competing case store.

The future embedding worker should build documents directly from a `ScamCase`'s title,
type, description, sample text, indicators, and risk level. It should store vectors in
Qdrant under stable case/chunk IDs, keeping MySQL as the source of truth.

## Report flow

The scan is the assessment record. When a user requests a report, the backend creates
a private `ScamReport` containing a snapshot of that scan's original input. A report
can only be created once per owned scan. Administrators can approve or reject it, then
publish a separately supplied public title, summary, and content. Private evidence is
never automatically published.

## Deliberate boundaries and next work

- No AI-service callback/job contract exists yet. Qdrant retrieval and grounded AI
  should extend `Scan` results; they must not automatically create reports or posts.
- There is no bootstrap/seed path for the first administrator.
- The checked-in migration history includes destructive legacy-flow migrations;
  validate it against a fresh database before any production deployment.
- The old, unmounted comments/evidence upload modules were removed during handoff;
  reintroduce them only with matching models, controllers, routes, documentation, and
  tests.
