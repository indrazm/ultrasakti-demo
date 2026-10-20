# 0020: Large tool output gate

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** None

## Context

MCP and web tools can return very large results. Returning them to the model fills its context and slows or breaks the run.

## Decision

`packages/runtime/src/tools/sandbox/output-gate.ts` is an `onToolOutput` middleware registered with the sandbox toolset. Any tool result longer than 10,000 characters is written to `/workspace/<session-id>/tool-outputs/<tool>-<id>.json|txt` in the user's sandbox. The model receives the file name, the absolute path and how to read it (`read_file` with a relative path, or commands and pandas via `exec_command`) instead of the result.

The sandbox tools are exempt, since their output is already bounded and their file would loop back into the gate. If the file cannot be written, the original result is returned. The gate applies only when the sandbox is available.

## Consequences

- Tool results over the limit are stored in the sandbox container until it is removed; the model, not the UI, sees the file instructions. The chat still shows `toolname - summary`.
- The 10,000-character threshold is a constant (`LARGE_OUTPUT_LIMIT`), not configuration.
- Results of non-sandbox tools are not returned to the model verbatim above the limit, so tools must be usable through a file read.
