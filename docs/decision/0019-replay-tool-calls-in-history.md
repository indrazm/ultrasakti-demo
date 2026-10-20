# 0019: Replay tool calls in conversation history

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** None

## Context

[0015](./0015-chat-session-memory.md) keeps tool payloads server-side, so a reloaded conversation showed only text. The live chat now shows each tool call as `toolname - summary`, and a reloaded conversation must look the same.

## Decision

`GET /api/sessions/:sessionId` (`apps/api/src/modules/sessions/services.ts`) returns tool parts with the tool name, state and input arguments, the same data the live stream already sends. Tool results (`output`, `resultContent`), reasoning and system prompts are still not returned. This narrows only the "tool payloads" part of 0015's history rule; its other decisions stand.

## Consequences

- Arguments the agent sent to tools, including sandbox commands and MCP parameters, are visible to the conversation's owner after a reload, as they are during the live stream.
- Results can contain more sensitive data than arguments, so they remain server-side.
