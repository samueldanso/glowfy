FROM oven/bun:1 AS base
WORKDIR /app

# Install production dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Release stage
FROM base AS release
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Seed the database at build time (static data from Open Beauty Facts)
RUN bun run src/data/seed-db.ts

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
