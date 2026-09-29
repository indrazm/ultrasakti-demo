# 0003: Frontend Stack

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The `platform` and `admin` applications need a common frontend foundation with file-based, typed routing and server-state caching.

## Decision

Use React with Vite, Tailwind CSS v4, TanStack Router with file-based routing, and TanStack Query in both `apps/platform` and `apps/admin`.

## Consequences

- TanStack Router generates `src/routeTree.gen.ts` from files in `src/routes/`.
- The generated route tree is not hand-edited.
- Shared server state uses TanStack Query; route and navigation structure uses TanStack Router.
