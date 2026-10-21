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

The backend reads `backend\.env`. `HOST` defaults to `127.0.0.1` in development and `0.0.0.0` in production. `PORT` defaults to `5000`. PostgreSQL remains configured by `DATABASE_URL` and is accessed only by the backend.

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

## Frontend: local development

The local frontend is served only on this computer at `http://localhost:5173`. In a separate terminal, from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

`frontend\.env` supplies `VITE_API_URL`, normally `http://localhost:5000/api`. This is public frontend configuration, not a place for secrets.

## LAN testing

LAN mode binds the Vite development server and backend to network interfaces so other computers on the same reachable office network can connect. PostgreSQL stays on the development computer and must not be exposed to the LAN.

1. Find this computer's office-network IPv4 address with `ipconfig`. Use the IPv4 address for the active office network adapter, not a VPN, virtual adapter, or loopback address.
2. Create the LAN frontend environment file and edit it:

   ```powershell
   Copy-Item frontend\.env.lan.example frontend\.env.lan
   notepad frontend\.env.lan
   ```

   Replace `YOUR-LAN-IP` in `VITE_API_URL=http://YOUR-LAN-IP:5000/api` with the IPv4 address from step 1. The `.env.lan` file is local-only and ignored by Git. Vite's `lan` mode explicitly loads it; the LAN startup fails if it still points at localhost.
3. Edit the existing `backend\.env` without replacing its database URL or JWT secrets. Set the following values, using the same IPv4 address:

   ```dotenv
   HOST=0.0.0.0
   LAN_FRONTEND_URL=http://YOUR-LAN-IP:5173
   ```

   Keep `FRONTEND_URL=http://localhost:5173` so local development remains allowed too. `LAN_FRONTEND_URL` is an additional exact origin, not a wildcard. Do not add it to production configuration.
4. In one terminal, start or restart the backend:

   ```powershell
   Set-Location backend
   npm run dev
   ```
5. In another terminal, start the LAN frontend:

   ```powershell
   Set-Location frontend
   npm run dev:lan
   ```
6. Coworkers on the same reachable office network should open `http://YOUR-LAN-IP:5173`, replacing the placeholder with the same IPv4 address.

After changing the computer's LAN IP, update both `frontend\.env.lan` and `LAN_FRONTEND_URL` in `backend\.env`, then restart the frontend and backend. Restart the backend after changing `HOST` or `LAN_FRONTEND_URL`; restart Vite after changing `frontend\.env.lan`. In development, backend CORS and state-changing request checks always allow the localhost and loopback frontend URLs, plus the configured LAN frontend origin. LAN access therefore does not depend on the current Wi-Fi network for local development. Production continues to allow only its configured frontend origin. Cookie-based authentication continues to use credentialed requests and development `HttpOnly`, `SameSite=Lax` cookies; no production cookie settings are relaxed.

LAN mode uses plain HTTP, which does not encrypt credentials or session traffic. Use it only on a trusted office network with test accounts and non-sensitive data. Before testing, confirm coworkers are on the same reachable network and the IPv4 address is correct. Windows Firewall may need inbound TCP access to ports **5173** (frontend) and **5000** (backend); if rules are required, limit them to the trusted **Private** network profile and office network. Do not disable the firewall or open PostgreSQL's port.

Troubleshooting:

- **Connection refused / page unavailable:** verify both servers are running, Vite reports port `5173`, the backend reports port `5000`, the IP is current, and `HOST=0.0.0.0` is set before restarting the backend.
- **CORS or invalid-origin errors:** make sure `LAN_FRONTEND_URL` exactly matches `http://YOUR-LAN-IP:5173` and `VITE_API_URL` uses `http://YOUR-LAN-IP:5000/api`, then restart both servers. Do not add a trailing path or use a wildcard origin.
- **Login/session issues:** use the frontend URL with the same LAN IP configured in both files, ensure the browser allows cookies, and verify requests use the API URL with `http://` and port `5000`. The LAN HTTP setup is for trusted-network testing only.

## Profile pictures

Profile pictures are stored on the backend filesystem under `backend\uploads\profile-images` by default, with a generated filename recorded on the corresponding user. Upload and retrieval routes use the authenticated user's session. The backend verifies the declared image MIME type against the file signature and accepts JPEG, PNG, and WebP up to 5 MB.

Apply the included database migration after updating the code:

```powershell
Set-Location backend
npx prisma migrate deploy
```

`PROFILE_IMAGE_UPLOAD_DIR` can point to a different directory; relative paths resolve from the backend working directory. Ensure the backend service account can read and write that directory, keep it on persistent storage, and include it in backups. For a deployed or office server, mount a persistent volume and set this variable to its absolute path. Do not place uploads in a temporary directory or expose the directory with a general-purpose static file server. `PROFILE_IMAGE_MAX_SIZE_MB` sets the backend limit (1–20 MB, default 5); set `VITE_PROFILE_IMAGE_MAX_SIZE_MB` in the frontend environment to the same value so client validation agrees. These settings are not secrets.

## Production configuration

Provide backend settings through the deployment environment or a secrets manager, not a committed `.env` file:

- `NODE_ENV=production`
- `DATABASE_URL` for the production PostgreSQL database
- distinct, strong `JWT_ACCESS_TOKEN_SECRET` and `JWT_REFRESH_TOKEN_SECRET` values
- `FRONTEND_URL` set to the deployed frontend origin
- `PORT` if required by the hosting platform
- `HOST` if required by the hosting platform (defaults to `0.0.0.0` in production)
- `PROFILE_IMAGE_UPLOAD_DIR` set to persistent writable storage
- `PROFILE_IMAGE_MAX_SIZE_MB` and matching frontend `VITE_PROFILE_IMAGE_MAX_SIZE_MB`

Generate separate cryptographically random JWT secrets (for example, run `openssl rand -hex 32` twice) and set each result as its corresponding secret in the deployment provider. Production startup requires both secrets to be at least 32 characters, rejects known placeholders, and rejects identical values. The 32-character minimum is a conservative length floor; generating 32 random bytes provides 256 bits of entropy. Do not paste secret values into source control, logs, or frontend `VITE_` settings.

Set `VITE_API_URL` to the deployed backend API base URL before building the frontend, through the deployment environment or a production-specific Vite environment file. Use the public HTTPS API URL; production frontend builds reject plain HTTP, localhost, loopback, private, and local-only hosts. Local and LAN development use their separate documented HTTP URLs. Do not place backend secrets in any `VITE_` variable.

The browser frontend and backend may be hosted on different sites. Production auth cookies therefore use `HttpOnly`, `Secure`, `SameSite=None`, and `Path=/`; the server also requires the configured `FRONTEND_URL` as the exact `Origin` on state-changing requests. `LAN_FRONTEND_URL` is rejected in production. Missing origins are allowed only in development and automated tests; malformed, `null`, and untrusted origins on state-changing requests are rejected in every environment. Safe `GET`/`HEAD` requests and CORS preflight requests are not blocked by the Origin middleware. CORS remains restricted to the configured frontend origin(s). Browser third-party-cookie restrictions may still prevent cross-site cookie authentication in some environments.

The backend production build generates the Prisma client and compiles runtime sources into `backend/dist`; `npm start` runs `dist/server.js`.

## Health checks

`GET /api/health` is a lightweight liveness check and returns success when the process can respond. `GET /api/health/ready` checks PostgreSQL using the shared Prisma client and returns unavailable if the database cannot be reached. Both endpoints are unauthenticated, do not require an `Origin` header, and return only generic status information. Use liveness to assess process responsiveness and readiness to assess database-dependent service availability; configure a hosting health check only after selecting a provider and its requirements.
