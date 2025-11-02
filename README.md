# Monite Resell Dashboard

A secure subscription key management dashboard built with Next.js 14 (App Router), TypeScript, shadcn/ui, and MongoDB.

## Features

- Secure reseller authentication against the `resellers` collection (legacy SHA-256 hashes and modern bcrypt support) with optional TOTP enforcement, CSRF protection, login rate limiting, and JWT-based HttpOnly cookies.
- Premium shadcn/ui interface with a fixed sidebar, header bar, and responsive two-panel layout featuring dark/light theming via `next-themes`.
- Analytics dashboard with KPI cards (total, active, pending, expired), device/game filters, and recent-activity table that refreshes automatically every 30 seconds.
- Subscriptions workspace with toolbar filters (status, game, created-at range, global key search), server-side pagination/sorting, row-level RBAC actions (disable/enable/reset/remove), and device lifecycle operations.
- Create-subscription modal that validates allowed games, devices, and durations, calculates credit costs in real time, and performs atomic MongoDB debit + key creation transactions.
- REST API hardened with Zod validation, RBAC helpers, audit logging, rate limiting, and CSRF enforcement for all state-changing requests, plus automatic index provisioning for keys, devices, and games collections.
- Observability utilities including structured login/audit logs and `/api/healthz` for deployment readiness checks.

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

All authenticated endpoints expect the session cookie issued by the login flow and the `X-CSRF-Token` header for non-GET requests.

- `GET /api/metrics/keys` – Key counts (total, active, pending, expired) using OWASP-aligned status rules.
- `GET /api/keys/recent` – Latest key events with optional `limit`, `game_uid`, and `device` filters.
- `GET /api/subscriptions` – Server-side filtered subscriptions (`status`, `q`, `game_uid`, `from`, `to`, `page`, `pageSize`, `sort`).
- `POST /api/subscriptions` – Create subscription batches with atomic credit debit and key insertion.
- `POST /api/subscriptions/:id/{disable|enable|reset|delete}` – RBAC-enforced lifecycle actions per subscription.
- `POST /api/devices/:udid/{disable|enable}` – Device state controls guarded by device permissions.
- `GET /api/games` – Returns allowed product catalog for the authenticated reseller.
- `GET /api/auth/me` – Hydrated reseller profile with permissions, allowed games, and credit balance.
- `POST /api/auth/{login|register|logout}` – Authentication flows with CSRF validation and rate limiting.
- `GET /api/healthz` – MongoDB connectivity probe and basic metadata.

## UI Overview

- `/login` – Credential form with progressive TOTP challenge, CSRF token bootstrap, and abuse-safe messaging.
- `/register` – Reseller onboarding with inline validation, password strength hints, and bcrypt storage.
- `/dashboard/analytics` – KPI cards, activity feed, and quick filters for monitoring key status in real time.
- `/dashboard/subscriptions` – Toolbar-driven data table with bulk filters, pagination controls, row actions, device operations, and credit-aware create modal.
- Global header – Search bar (key prefix), theme toggle, user menu, credit summary, and context-aware “Create subscription” action. The layout is fully responsive and accessible (ARIA labelling, focus rings, AA contrast).

## Development Notes

- The project uses Next.js App Router with server components for routing and client components for interactive views.
- The UI layer is composed of shadcn/ui primitives styled with Tailwind CSS and `next-themes` for client-side theme persistence.
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
