# 0004: Frontend Module Conventions

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

Frontend features need a predictable place for pages and reusable feature code across `apps/platform` and `apps/admin`.

## Decision

Write pages directly under `src/routes/`. Put reusable feature code under `src/modules/<module-name>/`, using `components/`, `hooks/`, `api/`, and `types.ts` as described in [the frontend rules](../rules/frontend.md).

Do not create barrel files in apps. Import from the defining file or package export.

## Consequences

- Routes own page composition; module components and hooks are reusable feature pieces.
- `api/` is for reusable fetching and feature operations, not general utilities.
- App-specific features remain in their app. Cross-app UI primitives belong in `packages/ui`.
