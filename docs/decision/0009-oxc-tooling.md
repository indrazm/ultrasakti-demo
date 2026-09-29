# 0009: Oxlint and Oxfmt

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The workspace needs a fast linter and formatter with root-level configuration.

## Decision

Use Oxlint and Oxfmt from the repository root. Keep their configuration in `.oxlintrc.json` and `.oxfmtrc.json`.

## Consequences

- Run `pnpm lint` or `pnpm lint:fix` for linting.
- Run `pnpm format` or `pnpm format:check` for formatting.
- Formatter-specific exclusions belong in Oxfmt configuration. Do not add Prettier configuration or ignore files unless Prettier is adopted.
