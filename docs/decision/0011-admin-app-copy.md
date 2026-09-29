# 0011: Separate Admin App Workspace

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The repository needs an admin frontend alongside the platform frontend.

## Decision

Start `apps/admin` as a copy of `apps/platform`, with its own `@ultrasakti/admin` workspace package name and `pnpm dev:admin` command.

## Consequences

- Admin and platform are independently runnable apps and may evolve separately.
- Both use the shared `@ultrasakti/ui` package and root `.env`.
- Do not assume their route or feature implementations remain identical after the initial copy.
