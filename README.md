# GharSewa

GharSewa is a production-oriented monorepo starter for a hyper-local household service marketplace in Nepal. It includes a Vite React/TypeScript client, an Express/TypeScript REST API, and a PostgreSQL schema.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (or Docker)

## Run locally

```bash
cp apps/server/.env.example apps/server/.env
npm install
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:4000`. On Windows PowerShell, copy the server env file with `Copy-Item apps/server/.env.example apps/server/.env`. If a PostgreSQL password contains special URL characters such as `#`, encode them in `DATABASE_URL` (for example, `#` becomes `%23`).

## Structure

```text
apps/
  client/       React + Vite + Tailwind UI
  server/
    src/
      config/          PostgreSQL connection pool
      controllers/     Request/business logic
      middleware/      JWT authentication middleware
      routes/          Express route modules
      types/           Shared TypeScript types
      index.ts         Express server entry point
```

## API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/services`
- `POST /api/services` (admin role required) with `{ "name_en": "Plumbing", "name_np": "plumbing" }`
- `GET /api/providers?latitude=26.66&longitude=87.27&radiusKm=5&category=plumbing`
- `POST /api/estimate` with `{ "prompt": "Fix leaking pipe" }`
- `POST /api/bookings`
- `GET /api/bookings/:id/messages`
- `POST /api/bookings/:id/messages`
- `GET /api/admin/metrics`
- `PATCH /api/admin/providers/:id/verify`

Authentication is intentionally represented by `x-user-id` for this starter. Replace that middleware with JWT/session authentication before production deployment. The API validates request bodies, uses parameterized SQL, and centralizes errors.
