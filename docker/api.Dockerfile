FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

FROM base AS pruner
RUN npm install --global turbo@2.10.12
COPY . .
RUN turbo prune api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --from=pruner /app/out/full/ .
# Prisma 7 prisma.config.ts requires DATABASE_URL even for `generate`.
# This value is installer-only (runner starts FROM base) and is never used
# to connect; production DATABASE_URL is injected at container start.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN pnpm --filter api prisma:generate
# @workspace/types exports dist/ only; .dockerignore excludes **/dist, so
# compile the workspace package before Nest typechecks those imports.
RUN pnpm --filter @workspace/types build
RUN pnpm --filter api build
# Include prisma CLI so migrate deploy works at container start.
# pnpm 10+ requires --legacy unless inject-workspace-packages is enabled.
# Skip Prisma's install-time generate: deploy copies the schema after
# postinstall, which otherwise emits a client with no enums/models.
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm --filter api deploy --legacy /out
# pnpm deploy follows npm-packlist/.gitignore and can omit dist/. Copy
# build artifacts and Prisma files explicitly so migrate works at runtime.
RUN rm -rf /out/dist /out/prisma \
  && cp -a apps/api/dist /out/dist \
  && cp -a apps/api/prisma /out/prisma \
  && cp -a apps/api/prisma.config.ts /out/prisma.config.ts \
  && test -f /out/dist/main.js \
  && test -d /out/prisma/migrations \
  && test -e /out/node_modules/.bin/prisma
RUN cd /out && ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG API_BUILD_ID=unknown
ENV API_BUILD_ID=$API_BUILD_ID
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=installer --chown=nestjs:nodejs /out .
COPY docker/api-entrypoint.sh /app/api-entrypoint.sh
RUN sed -i 's/\r$//' /app/api-entrypoint.sh \
  && chmod 755 /app/api-entrypoint.sh \
  && chown nestjs:nodejs /app/api-entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown nestjs:nodejs /app/uploads
USER nestjs
EXPOSE 4000
# Same DATABASE_URL for migrate, seed, and the API process.
CMD ["/app/api-entrypoint.sh"]
