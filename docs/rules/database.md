# Database Rules

Database code lives in `packages/db` and uses Prisma 7 with PostgreSQL. Local PostgreSQL and Redis services are defined in the root `docker-compose.dev.yml`.

- Keep the Prisma schema in `packages/db/prisma/schema.prisma`.
- Keep Prisma 7 configuration in `packages/db/prisma.config.ts`.
- Create and review migrations when changing the schema; do not rely on an implicit production schema push.
- Use the shared database package from applications rather than creating independent Prisma clients per app.
- Keep secrets and connection strings in the root `.env`; use `.env.example` to document required variable names without secret values.
- Redis is an application service, not a substitute for persistent relational data.
