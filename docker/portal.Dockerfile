FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

FROM base AS pruner
RUN npm install --global turbo@2.10.11
COPY . .
RUN turbo prune portal --docker

FROM base AS installer
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_APP_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV API_INTERNAL_URL=http://api:4000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/portal/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/portal/public ./apps/portal/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/portal/server.js"]
