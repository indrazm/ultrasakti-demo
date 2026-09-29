# 0008: Shared Root `.env`

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

Apps and local tooling need the same development environment values without maintaining separate environment files per app.

## Decision

Keep one active `.env` at the repository root. App and database scripts load it with `dotenv-cli`; `.env.example` documents the expected local variables.

## Consequences

- App scripts use `dotenv -e ../../.env --` from their workspace directories.
- Prisma scripts use the same relative path from `packages/db`.
- The real `.env` is ignored by Git. Add new shared local variables at the root and document them in `.env.example`.
