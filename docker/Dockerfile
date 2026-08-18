FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# env.ts validates at import time, so both variables must exist while compiling — but
# nothing connects to the database and every page renders per request, so the real
# values never belong here: they would be readable in the image history forever.
ARG DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ARG SITE_URL=http://localhost:3000
ENV DATABASE_URL=$DATABASE_URL SITE_URL=$SITE_URL
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Migrations travel with the image so a deploy can apply them without the repo.
COPY --from=build --chown=nextjs:nodejs /app/db ./db
# Next writes optimized images under .next/cache at runtime.
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next
USER nextjs
ENV HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
