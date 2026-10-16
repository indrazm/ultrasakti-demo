FROM node:26.9.0-bookworm-slim AS app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.4.2
WORKDIR /app
ENV HUSKY=0
COPY source/ ./
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm build

FROM app AS api
ENV NODE_ENV=production
USER node
WORKDIR /app/apps/api
CMD ["node_modules/.bin/tsx", "src/index.ts"]

FROM nginx:stable-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=app /app/apps/platform/dist /usr/share/nginx/html
