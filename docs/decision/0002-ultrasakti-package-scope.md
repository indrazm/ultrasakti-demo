# 0002: `@ultrasakti` Package Scope

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

Workspace packages need a consistent organization scope in package names and imports.

## Decision

Use `@ultrasakti` for scoped workspace package names, including apps and packages such as `@ultrasakti/api`, `@ultrasakti/platform`, and `@ultrasakti/ui`.

## Consequences

- New scoped workspace packages use the `@ultrasakti/<name>` convention.
- Imports, workspace filters, component aliases, and package manifests must use the same scope.
