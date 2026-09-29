# 0001: pnpm Workspace Layout

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The repository contains multiple applications and shared packages that need one package manager and a clear workspace boundary.

## Decision

Use pnpm workspaces. Keep runnable applications in `apps/*` and shared packages in `packages/*`, as declared in the root `pnpm-workspace.yaml`.

## Consequences

- Workspace packages share one root lockfile and can depend on each other with the `workspace:` protocol.
- Root scripts provide common commands; each app and package owns its local scripts.
- New applications go under `apps/`; reusable packages go under `packages/`.
