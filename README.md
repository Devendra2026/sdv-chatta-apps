# Nagar Panchayat Chhata Platform

Municipal survey, property-data, reporting, RBAC, and payment platform for **Nagar Panchayat Chhata, Mathura**.

## Stack

- `apps/portal` — Next.js citizen/admin portal
- `apps/api` — NestJS HTTP API (Prisma, Better Auth, BullMQ, local file storage, Atom NDPS)
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

| Service  | Host port |
| -------- | --------- |
| Postgres | `5433`    |
| Redis    | `6380`    |

Default admin (seed): `sikarwar2010@gmail.com` / `tarun@0446`

## Production (Dokploy)

Dokploy owns Traefik, TLS, and the Environment tab. Use `docker-compose.prod.yml` (no Caddy, no host ports).

1. Create a **Compose** service. Compose path: `docker-compose.prod.yml`.
2. Advanced → enable **Isolated Deployments**.
3. Environment → paste `.env.production.example`, then set real hosts and secrets. Dokploy writes this as `.env`.
4. Domains (HTTPS / Let's Encrypt):

| Service  | Port   | Host                               |
| -------- | ------ | ---------------------------------- |
| `web`    | `3001` | citizen site (`PUBLIC_WEB_URL`)    |
| `portal` | `3000` | admin portal (`PUBLIC_PORTAL_URL`) |

5. Google OAuth redirect: `{PUBLIC_PORTAL_URL}/api/auth/callback/google`.
6. Do not map domains to Postgres or Redis.

`DATABASE_URL` / `REDIS_URL` are set in Compose from `POSTGRES_*` and `REDIS_PASSWORD`. Do not point them at `localhost`. Survey imports and attachments are stored on the `chhata_uploads` volume (`STORAGE_DIR=/app/uploads`).

## Fixtures

- Survey Excel: `fixtures/survey/` (copied from source; originals never modified)
- Payment docs: `docs/payments/`
