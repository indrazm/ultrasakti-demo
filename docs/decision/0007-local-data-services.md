# 0007: Prisma, PostgreSQL, and Redis

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The repository needs a shared database package and local development services for relational persistence and caching.

## Decision

Use Prisma ORM 7 in `packages/db`, with PostgreSQL and Prisma's PostgreSQL driver adapter. Run PostgreSQL 17 and Redis 7 for local development through `docker-compose.dev.yml`.

## Consequences

- The Prisma schema is `packages/db/prisma/schema.prisma`; its datasource URL is configured in `packages/db/prisma.config.ts`.
- Generated Prisma Client code is written under `packages/db/src/generated/prisma/` and ignored by Git.
- Run `pnpm db:up` to start the local services and `pnpm db:down` to stop them.
- Named Docker volumes preserve local database and Redis data when containers stop. `docker compose -f docker-compose.dev.yml down -v` removes that data.
- Prisma commands in `packages/db` load `DATABASE_URL` from the shared root `.env`.
