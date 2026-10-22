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

Administrators can permanently delete a user only after all `PENDING` and `CONFIRMED` reservations are resolved. Completed and cancelled reservations, along with room-status audit history, are retained with the deleted user's reference cleared; refresh tokens are removed and profile pictures are deleted.

## Tests

Tests create and delete records. Use only the dedicated, disposable local `stayinn_test` database; never point it at development or production data. From `backend`, apply the existing migrations using the test Prisma configuration, then run Vitest:

```powershell
npx prisma migrate deploy --config prisma.test.config.ts
npm test
```

The test setup validates `TEST_DATABASE_URL` before assigning it as `DATABASE_URL` for test modules.

## Frontend: local development

From a separate terminal, start the frontend from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The frontend sends API calls to the relative `/api` path, and Vite proxies those requests to `http://127.0.0.1:5000` by default. No LAN address or API base URL is embedded in frontend code. Keep the existing Axios client, credentialed requests, and authentication flow; development cookies remain `HttpOnly`, `SameSite=Lax`, and non-secure for local HTTP.

`API_PROXY_TARGET` in `frontend\.env` can optionally change the local backend origin (for example, if `PORT` is changed). It must be an HTTP(S) origin without a path; Vite forwards `/api` paths unchanged. This is Vite-only development configuration and is not exposed to browser code.

## LAN testing

LAN mode binds Vite and Express to network interfaces so other computers on the same reachable private network can connect. PostgreSQL stays on the development computer and must not be exposed to the LAN. API calls still use the browser's frontend origin and Vite proxies them to Express on the same computer; frontend code and environment files do not need the current LAN IP.

1. Start or restart the backend with a network bind. This temporary setting applies to the current PowerShell session only:

   ```powershell
   Set-Location backend
   $env:HOST = "0.0.0.0"
   npm run dev
   ```

   Alternatively set `HOST=0.0.0.0` in `backend\.env` and use the normal backend start command. Keep the database URL, JWT secrets, `PORT`, and `FRONTEND_URL` unchanged. `LAN_FRONTEND_URL` is not required when browser requests go through the Vite proxy.
2. Start the frontend in LAN mode from another terminal:

   ```powershell
   Set-Location frontend
   npm run dev:lan
   ```

3. On the development computer, run `ipconfig` and find the IPv4 address for its active Wi-Fi or Ethernet adapter. Coworkers on the same reachable network should open `http://<that-ip>:5173` (for example, `http://192.168.1.25:5173`). The numeric address in the browser URL can change when the network assigns a different IP; application configuration cannot reserve it or configure the router's DHCP.

Vite permits IP addresses by default. If your network has a stable hostname and Vite rejects it as an untrusted host, add that exact hostname to `DEV_ALLOWED_HOSTS` in `frontend\.env.lan`, for example `DEV_ALLOWED_HOSTS=stayinn-pc.office.example`, and restart Vite. Do not allow every hostname. The optional `API_PROXY_TARGET` may be set in `frontend\.env.lan` if the backend uses a non-default host or port.

To create that optional mode-specific file, copy the example and edit it:

```powershell
Copy-Item frontend\.env.lan.example frontend\.env.lan
notepad frontend\.env.lan
```

For a stable access address on one network, ask the network administrator about a DHCP reservation or a hostname provided by that network. For access between different networks, use an approved private-network solution such as Tailscale. This setup does not configure router DHCP, expose the application to the public internet, or require port forwarding.

LAN mode uses plain HTTP, which does not encrypt credentials or session traffic. Use it only on a trusted private network with test accounts and non-sensitive data. For Windows Firewall, allow inbound TCP **5173** only on the **Private** profile and only from the local subnet, using an elevated PowerShell window:

```powershell
New-NetFirewallRule -DisplayName "StayInn Vite (Private LAN)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private -RemoteAddress LocalSubnet
```

The backend port **5000** does not need an inbound firewall rule for the proxied workflow; Vite connects to Express on the development computer. Never open PostgreSQL's port or disable the firewall.

Troubleshooting:

- **Page unavailable:** confirm the frontend is running with `npm run dev:lan`, the backend is running with `HOST=0.0.0.0`, both use the expected ports (`5173` and `5000`), and the browser URL uses the active adapter's current IP.
- **API requests fail:** check the Vite terminal for proxy errors, confirm Express is reachable on `http://127.0.0.1:5000/api/health` on the development computer, and ensure `API_PROXY_TARGET` matches the backend's local host and port.
- **Invalid-origin errors:** use the frontend URL served by Vite, check that `DEV_ALLOWED_HOSTS` contains the exact hostname if you are using a network hostname, and restart Vite after changing its environment.
- **Login/session issues:** keep the same frontend origin for login and later requests, allow browser cookies, and check that the browser sends the development cookie. Local/LAN cookies are `HttpOnly`, `SameSite=Lax`, and `Secure=false`; production cookie settings remain `HttpOnly`, `SameSite=None`, and `Secure=true`.
- **Firewall or network issues:** confirm the computer is on a trusted Private network, allow inbound port `5173` from `LocalSubnet`, and confirm the other device can reach the current frontend IP. Do not open backend or database ports to fix a proxy problem.

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

Set `VITE_API_URL` to the deployed backend API base URL before building the frontend, through the deployment environment or a production-specific Vite environment file. Use the public HTTPS API URL; production frontend builds reject plain HTTP, localhost, loopback, private, and local-only hosts. Development ignores `VITE_API_URL` and uses `/api` through Vite's development-only proxy. Do not place backend secrets in any `VITE_` variable.

The browser frontend and backend may be hosted on different sites. Production auth cookies therefore use `HttpOnly`, `Secure`, `SameSite=None`, and `Path=/`; the server also requires the configured `FRONTEND_URL` as the exact `Origin` on state-changing requests. `LAN_FRONTEND_URL` is rejected in production. Missing origins are allowed only in development and automated tests; malformed, `null`, and untrusted origins on state-changing requests are rejected in every environment. Safe `GET`/`HEAD` requests and CORS preflight requests are not blocked by the Origin middleware. CORS remains restricted to the configured frontend origin(s). Browser third-party-cookie restrictions may still prevent cross-site cookie authentication in some environments.

The backend production build generates the Prisma client and compiles runtime sources into `backend/dist`; `npm start` runs `dist/server.js`.

## Health checks

`GET /api/health` is a lightweight liveness check and returns success when the process can respond. `GET /api/health/ready` checks PostgreSQL using the shared Prisma client and returns unavailable if the database cannot be reached. Both endpoints are unauthenticated, do not require an `Origin` header, and return only generic status information. Use liveness to assess process responsiveness and readiness to assess database-dependent service availability; configure a hosting health check only after selecting a provider and its requirements.
