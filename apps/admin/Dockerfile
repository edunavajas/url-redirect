FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# bun:sqlite es built-in, no necesita dependencias nativas
FROM base AS deps
COPY package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/db/package.json ./packages/db/
RUN bun install --frozen-lockfile

FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/db ./packages/db
COPY apps/admin ./apps/admin

RUN mkdir -p /data

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
RUN chown -R appuser:appgroup /app /data
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["bun", "run", "apps/admin/src/index.ts"]
