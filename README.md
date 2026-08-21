# Nagar Panchayat Chhata Platform

Municipal survey, property-data, reporting, RBAC, and payment platform for **Nagar Panchayat Chhata, Mathura**.

## Stack

- `apps/portal` — Next.js citizen/admin portal
- `apps/api` — NestJS HTTP API (Prisma, Better Auth, BullMQ, MinIO, Atom NDPS)
- `apps/web` — unused scaffold (do not use for product UI)
- `packages/ui` — shared shadcn/Base UI components
- `packages/types` / `packages/api-client` — shared types and fetch client

## Quick start

```bash
# 1. Infra
docker compose up -d

# 2. Env
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/portal/.env.example apps/portal/.env

# 3. DB
pnpm db:generate
pnpm --filter api prisma:migrate
pnpm db:seed

# 4. Dev
pnpm dev:api
pnpm dev:portal
```

Local Docker ports (avoids clashes with other stacks like `api-survey-local`):

| Service       | Host port |
| ------------- | --------- |
| Postgres      | `5433`    |
| Redis         | `6380`    |
| MinIO API     | `9010`    |
| MinIO console | `9011`    |

Default admin (seed): `sikarwar2010@gmail.com` / `tarun@0446`

## Fixtures

- Survey Excel: `fixtures/survey/` (copied from source; originals never modified)
- Payment docs: `docs/payments/`
