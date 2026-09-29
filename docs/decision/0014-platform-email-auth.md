# 0014: Platform Email Authentication

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

The platform needs persistent email and password accounts. The API already uses the shared Prisma database package, while the admin application has no authentication requirement in this change.

## Decision

Use Better Auth with its Prisma adapter in `apps/api`, backed by the shared `@ultrasakti/db` client. Enable email and password credentials only. The platform uses Better Auth's React client for sign-up, sign-in, session state, and sign-out. Restrict credentialed cross-origin requests to `PLATFORM_ORIGIN`. Keep the auth secret and base URL in the root environment.

## Consequences

- The first Prisma migration records the original `User` schema; the second adds account, session, and verification tables and Better Auth fields. Existing databases with the original schema can baseline the first migration and apply the second without deleting users.
- `User.name` remains nullable to preserve original rows, while new email sign-ups provide a name.
- The API requires `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `PLATFORM_ORIGIN` at runtime.
- The platform requires `VITE_API_URL` at build time.
- Local browser end-to-end testing requires a migrated PostgreSQL service.
- The default session cookie flow assumes the platform and API share a site, such as subdomains of one registrable domain, with `BETTER_AUTH_URL` set to HTTPS in production. Unrelated domains need a same-site reverse proxy or a separately designed cross-site cookie setup. Cross-subdomain cookies do not make unrelated domains same-site.
