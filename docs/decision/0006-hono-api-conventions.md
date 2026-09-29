# 0006: Hono API Conventions

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The API needs a small, typed Node.js HTTP foundation and a consistent way to validate request data.

## Decision

Use Hono on Node.js with Zod and `@hono/zod-validator`. Organize features under `src/modules/<module-name>/` with `routes.ts`, `schema.ts`, and `services.ts`. Register each module in `src/index.ts`.

## Consequences

- `routes.ts` declares endpoints and applies request validation.
- `schema.ts` owns Zod schemas and inferred types for the module.
- `services.ts` owns module business operations called by routes.
- `src/index.ts` composes the application; it is not a barrel file.
- Do not create barrel files in `apps/api`.
