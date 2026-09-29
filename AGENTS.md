# Agent Working Agreement

This file describes how agents should work in this repository. It is about work process and constraints; code organization and stack conventions live in [`docs/rules/`](docs/rules/README.md), and the current system shape is in [`docs/architecture-convention.md`](docs/architecture-convention.md).

## Before changing files

- Read the relevant rule files and any related records in [`docs/decision/`](docs/decision/README.md) before making a change.
- Inspect the existing implementation and nearby conventions first. Prefer extending what is already there over introducing a second pattern.
- Identify the smallest set of files needed to satisfy the request. Keep unrelated cleanup, renames, formatting, and dependency upgrades out of the change.
- Treat the user's latest instruction as the scope. Preserve existing user changes and do not overwrite work unrelated to the task.
- If requirements are incomplete, make progress on independent parts and ask only for information that blocks a consequential choice.

## Constraints

- Do not invent product behavior, API contracts, environment variables, or architectural decisions. Mark unknowns clearly or ask when they block implementation.
- Do not add dependencies when existing workspace packages or platform APIs are sufficient. When a dependency is needed, add it to the package that uses it and update the pnpm lockfile through pnpm.
- Do not weaken supply-chain, environment, secret-handling, or other security settings to make a command pass. Explain a blocked check and its cause.
- Keep secrets out of source, logs, and committed examples. Use the root `.env` for local values and `.env.example` for safe variable names and placeholders.
- Do not create barrel files in applications. Follow the detailed frontend and backend rules linked above.
- Do not commit, push, publish, deploy, or contact external people or services unless the user explicitly asks for that action.
- Do not add documentation that merely repeats existing rules. Record a durable decision in `docs/decision/` only when a real repository decision is made; follow its numbering, status, and history rules.

## Implementation workflow

1. Read the request and identify its expected result and boundaries.
2. Inspect relevant files, scripts, and local rules before editing.
3. Make the smallest complete change that satisfies the request.
4. Review the diff or changed files for accidental scope expansion, stale references, and consistency with repository rules.
5. Run the narrowest useful verification available, such as the affected package's lint, typecheck, build, or targeted test. Do not run unrelated or expensive checks without a reason.
6. If verification cannot run, report the exact blocker. Do not claim it passed.

## Finishing a task

In the final response, summarize what changed, link the important files, and state what verification ran and its result. Mention material limitations or unresolved decisions plainly. Keep the report concise and do not claim work that was not completed.

## Pull request deliverables

When asked to create a pull request:

- Review the complete proposed diff before opening the PR. Check for correctness, regressions, security issues, missing error handling, and consistency with repository rules. Fix findings and review the updated diff again. Do not open the PR while known blocking findings remain; report any finding that cannot be resolved.
- For UI changes, run the affected app and use a headless browser to capture representative screenshots. Capture a short video as well when the change involves an interaction, animation, or flow that a still image cannot demonstrate. Inspect the captures to confirm they show the implemented result and contain no secrets or unintended personal data.
- Attach the resulting image or video evidence to the PR description so reviewers can see it without accessing local files. Do not treat a local artifact path as an attachment.
- If the app cannot run, browser capture fails, or evidence cannot be attached, explain the blocker and do not claim the PR deliverables are complete.
