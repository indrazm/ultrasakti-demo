FROM oven/bun:1-slim
WORKDIR /app

# Install deps dulu (cache-friendly layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source + build React UI
COPY . ./
RUN bun run build:ui

ENV PORT=3000 \
    DATABASE_PATH=/data/warehouse.db

EXPOSE 3000
VOLUME ["/data"]

# seed.ts idempotent: skip bila DB sudah ada isinya
CMD ["sh", "-c", "bun run src/db/seed.ts && bun run src/index.ts"]
