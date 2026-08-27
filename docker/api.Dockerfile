FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

FROM base AS pruner
RUN npm install --global turbo@2.10.11
COPY . .
RUN turbo prune api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build
# Include prisma CLI so migrate deploy works at container start.
# pnpm 10+ requires --legacy unless inject-workspace-packages is enabled.
# Skip Prisma's install-time generate: deploy copies the schema after
# postinstall, which otherwise emits a client with no enums/models.
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm --filter api deploy --legacy /out
RUN cd /out && npx prisma generate --schema=prisma/schema.prisma

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=installer --chown=nestjs:nodejs /out .
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads
USER nestjs
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
