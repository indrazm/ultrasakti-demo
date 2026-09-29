# 0014: Platform Email Authentication

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The platform needs persistent email and password accounts. The API already uses the shared Prisma database package, while the admin application has no authentication requirement in this change.

## Decision

Use Better Auth with its Prisma adapter in `apps/api`, backed by the shared `@ultrasakti/db` client. Enable email and password credentials only. The platform uses Better Auth's React client for sign-up, sign-in, session state, and sign-out. Restrict credentialed cross-origin requests to `PLATFORM_ORIGIN`. Keep the auth secret and base URL in the root environment.

## Consequences

- The Prisma migration adds account, session, and verification tables and Better Auth fields to `User`.
- The API requires `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `PLATFORM_ORIGIN` at runtime.
- The platform requires `VITE_API_URL` at build time.
- Local browser end-to-end testing requires a migrated PostgreSQL service.
