# Monite Resell Dashboard

A secure subscription key management dashboard built with Next.js 14 (App Router), TypeScript, Material UI, and MongoDB.

## Features

- Reseller authentication against the `resellers` collection (legacy SHA-256 and modern bcrypt support).
- Optional TOTP two-factor authentication challenge.
- CSRF protection via double-submit token, login rate limiting, and JWT-based sessions stored in HttpOnly cookies.
- Material UI interface with responsive layout, accessibility in mind, and light/dark themes persisted in `localStorage`.
- Dashboard with real-time metrics (total, active, pending, expired keys) and recent key activity with filters.
- REST API secured by middleware plus JWT verification, using official MongoDB driver with connection pooling and indexes on key collections.
- Health check endpoint, structured logging without sensitive data, and environment-based configuration.

## Requirements

- Node.js 18.18 or later
- npm 9+ (or pnpm/yarn if you adapt the scripts)
- MongoDB instance with the `resellers` and `keys` collections

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
MONGODB_URI=mongodb://mikeios:<ENCODED_PASSWORD>@<host>:27017/monite?authSource=admin&replicaSet=rs0
MONGODB_DB=monite
JWT_SECRET=<strong-random-secret>
RATE_LIMIT_MAX=5           # optional override (default 5 attempts)
RATE_LIMIT_WINDOW=60000    # optional override in milliseconds
```

> **Note:** URL-encode the password (e.g., using `encodeURIComponent`) before interpolating it into `MONGODB_URI`. Never commit secrets to source control.

## Scripts

```bash
npm run dev     # start development server on http://localhost:3000
npm run build   # create production build
npm run start   # run production build
npm run lint    # run Next.js linting
```

## Database Setup

1. Ensure the MongoDB user `mikeios` has access to the `monite` database.
2. Create indexes (handled automatically on first API call) on the `keys` collection:
   - `expires_at` ascending
   - `disabled` sparse
   - `device` sparse
3. Seed example data (optional): insert reseller documents with `_id`, `password` (SHA-256 hex or bcrypt hash), `name`, `role`, and permissions. Create sample `keys` documents with `expires_at` values in epoch seconds.

## Authentication Flow

1. Clients fetch a CSRF token from `GET /api/auth/csrf` before submitting login or registration forms.
2. `POST /api/auth/login` verifies username/password (legacy SHA-256 and bcrypt) and enforces optional TOTP. A signed JWT (12h expiry) is written to an HttpOnly/Secure cookie on success. Rate limiting restricts repeated attempts.
3. `POST /api/auth/register` validates inputs with Zod, ensures usernames are unique, hashes passwords with bcrypt, and stores reseller accounts with minimum permissions.
4. `POST /api/auth/logout` clears the session cookie.

## API Endpoints

- `GET /api/metrics/keys` – Returns key counts (total, active, pending, expired). Requires authentication.
- `GET /api/keys/recent?limit=10&game_uid=<uid>&device=<device>` – Lists recent keys respecting filters. Requires authentication.
- `GET /api/auth/me` – Returns the authenticated reseller payload.
- `GET /api/healthz` – Health check (MongoDB ping + collection count).

All authenticated endpoints expect the session cookie issued by the login flow.

## UI Overview

- `/login` – Username/password form with TOTP modal. Errors are generic to avoid leaking account existence.
- `/register` – Account creation with real-time validation hints, password policy, and success feedback.
- `/` – Dashboard with KPI cards, theme toggle, logout button, and recent activity table supporting game UID and device filtering. Metrics refresh automatically every 30 seconds or on manual refresh.

## Development Notes

- The project uses Next.js App Router with server components for routing and client components for interactive views.
- Material UI integrates through `@mui/material-nextjs` for optimized SSR and emotion caching.
- Session cookies are protected with `SameSite=Lax`, `HttpOnly`, and `Secure` (in production). Middleware blocks access to protected routes when the JWT is missing or invalid.
- CSRF tokens are double-submit cookies. API handlers validate tokens from the `X-CSRF-Token` header.
- Logging avoids sensitive payloads; only metadata such as username, role, IP, and user-agent are logged on successful login attempts.

## Testing

- Ensure legacy SHA-256 hashes authenticate correctly and prompt for TOTP when configured.
- Validate registration rejects duplicate usernames and mismatched passwords.
- Confirm metrics align with key document states (e.g., by mocking `expires_at` values).
- Verify responsive UI on narrow viewports (≥360px) and correct dark/light theme persistence.
- Run end-to-end flow: register → login → pass TOTP (if enabled) → dashboard metrics display.

## License

This project is provided as-is for the Monite reseller management scenario.
