# 0018: Runtime MCP servers and Docker sandbox

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** [0012](./0012-runtime-package-placeholder.md)

## Context

`packages/runtime` was reserved as a placeholder. The chat agent now needs tools from external MCP servers and a place to run code for analysis, math and charts.

## Decision

`@ultrasakti/runtime` owns agent construction, MCP connections and the sandbox tools.

- **MCP:** `harness.config.ts` at the repository root lists MCP servers (`stdio` or `http`), read by `packages/runtime/src/mcp/`. All enabled servers connect once per process and their tools are prefixed `<name>_`. A server that fails to connect is skipped. Each server lists its `readOnlyTools`; every other tool requires human approval. The API pauses the run, keeps the continuation in memory for 15 minutes tied to the user and session, and resumes it from `POST /api/chat` with an `interaction_response`.
- **Sandbox:** `packages/runtime/src/tools/sandbox/` registers all `@anvia/sandbox` tools on the agent. Each user gets one Docker container from `ghcr.io/astral-sh/uv:python3.13-bookworm-slim` with a stable id. Each conversation works in `/workspace/<session-id>/`. Containers are stopped when idle for 30 minutes and on shutdown, and resumed by id when needed.
- **Artifacts:** the agent saves files in `/workspace/<session-id>/artifacts/<file>` and references them as `/s/<session-id>/artifacts/<file>`. The platform maps that path to `GET /api/sessions/:sessionId/artifacts/:name`, which serves it to the session owner only. Only artifact URLs render as images in assistant messages.
- `@anvia/core` is raised to 1.14.1 in `packages/runtime` and `packages/db`, which `@anvia/sandbox` requires as a peer.

## Consequences

- The API host needs Docker and registry access; the application account already has Docker access (see [0017](./0017-pm2-runtime-deployment.md)). Sandboxes use bridge networking so the agent can install packages after asking the user, so code the agent runs can reach the network. Separation between conversations in one user's container is by instruction and path, not enforced.
- Sandbox resources are limited to 1 GB memory, 1 CPU and 256 processes. Stopped containers are not deleted, so disk use grows with the number of users until an operator cleans them up (`docker ps -a --filter label=app=ultrasakti`).
- Pending approvals live in API memory, so a restart or the 15-minute limit discards them. This relies on the single-process deployment in 0017.
- `harness.config.ts` is committed and must contain no secrets; use `process.env` values from the root `.env`. MCP servers that use `mcp-remote` need `npx` on the host.
