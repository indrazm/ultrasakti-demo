# 0015: Persistent Chat Sessions

**Status:** Accepted
**Date:** 2026-10-16
**Supersedes:** None

## Context

The platform chat needs multiple conversations that survive navigation and page reloads, with agent context restored from PostgreSQL.

## Decision

Use the Anvia Prisma memory tables as the conversation store. `packages/db` owns the shared memory adapter. The API passes it through `createAgent(options.memory)` using the `turn` save policy; the runtime remains independent of the database package.

The authenticated `/api/sessions` module creates server-generated session IDs, lists the signed-in user's conversations, and loads their visible history. `/api/chat` authorizes the same ownership before running the agent with a session scope and one new user prompt. The browser does not supply the user ID or authoritative conversation history.

## Consequences

- Completed turns persist with their provider-neutral messages. Failed-run diagnostics remain in the adapter's error table and are not exposed by the sessions API.
- The history endpoint exposes user and assistant text; internal reasoning and tool payloads stay server-side.
- Titles come from the first user message. New drafts become stored sessions when first sent; session listing is paginated.
- The platform disables conversation switching during streaming or history loading, and scopes its query cache by authenticated user.
