# Training Ultra Sakti

pnpm monorepo with an API, a React platform app, and shared shadcn/ui components.

Repository architecture decisions and their recording rules are in [docs/decision](./docs/decision/README.md).

## Start the apps

```sh
pnpm install
cp -n .env.example .env
pnpm db:up
pnpm --filter @ultrasakti/db migrate:deploy
pnpm dev
```

The API listens on `http://localhost:3000` and each Vite app prints its local URL. Start them with `pnpm dev:api`, `pnpm dev:platform`, or `pnpm dev:admin`.

Before starting the API, set `BETTER_AUTH_SECRET` in the root `.env` to a random value of at least 32 characters (for example, generate one with `openssl rand -base64 32`). The platform and API URLs and `PLATFORM_ORIGIN` in that file must match the addresses used locally. Apps load the shared root `.env` through their `with-env` scripts.

The copy command preserves an existing `.env`; add the new Better Auth values to it. For an existing database with the original `User` table and no Prisma migration history, mark that original schema as applied before deploying the auth migration:

```sh
pnpm --filter @ultrasakti/db with-env prisma migrate resolve --applied 20260929065608_initial_user
pnpm --filter @ultrasakti/db migrate:deploy
```

Only baseline a database whose `User` table matches the original schema. This path preserves existing users. If the database already has a different schema or migration history, reconcile that history before deploying. Removing the Docker volume with `docker compose -f docker-compose.dev.yml down -v` deletes local database data.

## Workspaces

- `apps/api`: Hono on Node.js with Zod request validation through `@hono/zod-validator`.
- `apps/platform`: React, Vite, Tailwind CSS v4, TanStack Router file-based routes, and TanStack Query.
- `apps/admin`: a copy of the platform app with its own workspace package name.
- `packages/db`: Prisma 7 schema and PostgreSQL client package.
- `packages/ui`: shared shadcn/ui components and theme. Add more official components from this workspace with `pnpm dlx shadcn@latest add <component>`.
- `packages/runtime`: placeholder workspace package for shared runtime code.

The full official shadcn component set is installed in `packages/ui/src/components`.

Run `pnpm lint` for Oxlint and `pnpm format` to format the workspace with Oxfmt. Use `pnpm format:check` to check formatting without writing changes.

Start PostgreSQL and Redis with `pnpm db:up`, and stop them with `pnpm db:down`. Prisma commands run from `packages/db`, for example `pnpm --filter @ultrasakti/db generate` or `pnpm --filter @ultrasakti/db migrate:dev --name init`.
