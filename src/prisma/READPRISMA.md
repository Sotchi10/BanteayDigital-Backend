# Prisma and MySQL Setup

This backend uses Prisma with MySQL. The Prisma schema is located at `src/prisma/schema.prisma`.

## 1. Start MySQL

Start a MySQL server and create a database named `banteay_digital` (or choose another database name).

Make sure the database user has permission to create and modify tables in that database.

## 2. Configure environment variables

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3307/banteay_digital"
```

If the username or password contains reserved URL characters, percent-encode them. Common examples:

| Character | Encoded value |
| --- | --- |
| `@` | `%40` |
| `!` | `%21` |
| `?` | `%3F` |
| `#` | `%23` |
| `%` | `%25` |

For example, a password containing `@` must use `%40` in `DATABASE_URL`.

## 3. Create the first migration

From the `backend` directory, generate and apply the initial migration:

```powershell
npx prisma migrate dev -- init
```

This reads `src/prisma/schema.prisma`, creates a timestamped migration in `src/prisma/migrations`, and applies it to the configured database.

Generate Prisma Client separately if needed:

```powershell
npx prisma migrate
```

## 4. Verify the database connection

Run the integration test:

```powershell
npm test
```

The test in `test/database.connection.test.js` opens a real Prisma/MySQL connection and verifies:

- MySQL accepts the connection.
- The active database is the one named in `DATABASE_URL`.
- MySQL returns a server version.

The test passes only when the MySQL server is running, the credentials are valid, the URL is correctly encoded, and the database is accessible.

## Future schema changes

1. Update `src/prisma/schema.prisma`.
2. Create and apply a named migration:

   ```powershell
   npx prisma migrate dev--name describe_your_change
   ```

3. Run the connection test again:

   ```powershell
   npm test
   ```

For quick local prototyping only, you can synchronize the schema without creating a migration file:

```powershell
npx prisma db push
```

Use migrations for shared, staging, and production databases so every schema change is tracked in source control.

## Connection status

**Current status: successful.** The database connection test was run successfully on 2026-08-19.

Expected successful output:

```text
# pass 1
# fail 0
```

Run the test again at any time to confirm the current connection status:

```powershell
npm test
```
