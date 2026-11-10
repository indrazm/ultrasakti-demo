FROM oven/bun:1-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . ./
RUN bun run build:ui

ENV PORT=4000 \
    DATABASE_PATH=/data/sales.db

EXPOSE 4000
VOLUME ["/data"]

CMD ["sh", "-c", "bun run src/db/seed.ts && bun run src/index.ts"]
