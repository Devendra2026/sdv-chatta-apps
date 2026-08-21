# API (`apps/api`)

NestJS backend for the sdv-chhata-apps monorepo.

## Scripts

| Command                       | Description              |
| ----------------------------- | ------------------------ |
| `pnpm --filter api dev`       | Watch mode (port `4000`) |
| `pnpm --filter api build`     | Compile to `dist/`       |
| `pnpm --filter api start`     | Run compiled `dist/main` |
| `pnpm --filter api lint`      | ESLint                   |
| `pnpm --filter api typecheck` | `tsc --noEmit`           |
| `pnpm --filter api test`      | Unit tests               |
| `pnpm --filter api e2e`       | E2E tests                |

From the repo root: `pnpm dev:api` or `pnpm turbo dev --filter=api`.

## Env

Copy `.env.example` to `.env` and adjust `PORT` if needed.
