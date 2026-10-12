# StayInn

StayInn is a React/Vite frontend and an Express/Prisma backend backed by PostgreSQL.

## Prerequisites

- Node.js compatible with the installed Vite and backend dependencies.
- PostgreSQL running locally for development and tests.
- Separate empty databases for development (`stayinn_dev`) and tests (`stayinn_test`).

## Local setup

From the repository root, copy the example environment files:

```powershell
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` for your local PostgreSQL role and database. Keep `DATABASE_URL` pointed at the development database and `TEST_DATABASE_URL` pointed at the separate local test database. The test setup rejects URLs unless they use a PostgreSQL scheme, a loopback hostname, and exactly the `stayinn_test` database name.

The JWT values in the backend example are placeholders. Replace them with distinct, random values used only for local development; never reuse them in production.

## Backend

Install dependencies and apply the existing migrations to the development database:

```powershell
Set-Location backend
npm ci
npx prisma migrate deploy
```

Start the development server:

```powershell
npm run dev
```

The seed file is `prisma/seed.ts`; it is not configured as an npm or Prisma seed command. If sample data is needed, run it explicitly from `backend` with `NODE_ENV=development` and `DATABASE_URL` pointing only to the local development database:

```powershell
npx tsx prisma/seed.ts
```

The seed script refuses to run unless `NODE_ENV` is exactly `development`.

## Tests

Tests create and delete records. Use only the dedicated, disposable local `stayinn_test` database; never point it at development or production data. From `backend`, apply the existing migrations using the test Prisma configuration, then run Vitest:

```powershell
npx prisma migrate deploy --config prisma.test.config.ts
npm test
```

The test setup validates `TEST_DATABASE_URL` before assigning it as `DATABASE_URL` for test modules.

## Frontend

In a separate terminal, from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

`frontend\.env` supplies `VITE_API_URL`. The value is public frontend configuration, not a place for secrets. The Vite config validates it at startup and build time; production builds reject local and private API hosts and require HTTPS.

## Production configuration

Provide backend settings through the deployment environment or a secrets manager, not a committed `.env` file:

- `NODE_ENV=production`
- `DATABASE_URL` for the production PostgreSQL database
- distinct, strong `JWT_ACCESS_TOKEN_SECRET` and `JWT_REFRESH_TOKEN_SECRET` values
- `FRONTEND_URL` set to the deployed frontend origin
- `PORT` if required by the hosting platform

Generate separate cryptographically random JWT secrets (for example, run `openssl rand -hex 32` twice) and set each result as its corresponding secret in the deployment provider. Production startup requires both secrets to be at least 32 characters, rejects known placeholders, and rejects identical values. The 32-character minimum is a conservative length floor; generating 32 random bytes provides 256 bits of entropy. Do not paste secret values into source control, logs, or frontend `VITE_` settings.

Set `VITE_API_URL` to the deployed backend API base URL before building the frontend. Use the public HTTPS API URL; production frontend builds reject plain HTTP, localhost, loopback, private, and local-only hosts. Local development can continue using the documented HTTP URL. Do not place backend secrets in any `VITE_` variable.

The browser frontend and backend may be hosted on different sites. Production auth cookies therefore use `HttpOnly`, `Secure`, `SameSite=None`, and `Path=/`; the server also requires the configured `FRONTEND_URL` as the exact `Origin` on state-changing requests. Missing origins are allowed only in development and automated tests; malformed, `null`, and untrusted origins on state-changing requests are rejected in every environment. Safe `GET`/`HEAD` requests and CORS preflight requests are not blocked by the Origin middleware. CORS remains restricted to the configured frontend origin. Browser third-party-cookie restrictions may still prevent cross-site cookie authentication in some environments.

The backend production build generates the Prisma client and compiles runtime sources into `backend/dist`; `npm start` runs `dist/server.js`.

## Health checks

`GET /api/health` is a lightweight liveness check and returns success when the process can respond. `GET /api/health/ready` checks PostgreSQL using the shared Prisma client and returns unavailable if the database cannot be reached. Both endpoints are unauthenticated, do not require an `Origin` header, and return only generic status information. Use liveness to assess process responsiveness and readiness to assess database-dependent service availability; configure a hosting health check only after selecting a provider and its requirements.
