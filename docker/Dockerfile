FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Hoisted layout on purpose: Next's standalone tracing does not follow pnpm's nested
# symlinks for transitive runtime deps like @swc/helpers, and the server crashes with
# MODULE_NOT_FOUND at boot. Only the image uses this layout; local dev stays strict.
RUN pnpm install --frozen-lockfile --config.node-linker=hoisted

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build reads env at import time (src/shared/config/env.ts), so both variables
# must be present even though nothing connects to the database while compiling.
ARG DATABASE_URL
ARG SITE_URL
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
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
