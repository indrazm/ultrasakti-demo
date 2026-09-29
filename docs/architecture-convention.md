# Architecture Convention

## Workspace shape

```text
apps/
├── api/       # Hono HTTP API
├── admin/     # React admin application
└── platform/  # React platform application
packages/
├── db/        # Prisma 7 database package
├── runtime/   # shared runtime package placeholder
└── ui/        # shared shadcn/ui components
```

The repository is a pnpm monorepo. Applications own their entry points and feature modules. Packages contain code with a clear shared boundary. The workspace package scope is `@ultrasakti`.

## Frontend convention

`apps/admin` and `apps/platform` use React, Vite, Tailwind CSS, TanStack Router with file-based routes, and TanStack Query. Pages stay directly in `src/routes/`; reusable feature code lives in `src/modules/<module-name>/`. Shared UI components live in `packages/ui`.

## Backend convention

`apps/api` uses Hono with Zod validation through `@hono/zod-validator`. Each feature lives in `src/modules/<module-name>/` and separates `routes.ts`, `schema.ts`, and `services.ts`. `src/index.ts` registers module routers.

## Data and local services

`packages/db` owns the Prisma 7 schema and client configuration. PostgreSQL and Redis are available for local development through the root `docker-compose.dev.yml`.

## Import convention

Do not add barrel files in applications. Import app code from its defining file. Shared packages expose only intentional package exports.
