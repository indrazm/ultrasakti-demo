# 0013: Husky Pre-commit Quality Checks

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

Commits should run the workspace's required correctness and quality checks consistently, rather than relying on each contributor to remember them.

## Decision

Use Husky for the Git `pre-commit` hook. The hook runs these root scripts in order:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

Each TypeScript workspace with a `tsconfig.json` exposes a `typecheck` script. The database typecheck generates the Prisma client before invoking TypeScript.

## Consequences

- A commit is rejected when any of the four commands fails.
- Commits take longer because tests and production builds run locally.
- The database typecheck uses the root `.env` through the existing environment-loading script.
