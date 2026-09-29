# Decision Record Rules

Use these rules for architecture and repository decisions in this directory.

## When to record a decision

Record choices that affect the repository over time, including package boundaries, frameworks, code organization, shared tooling, infrastructure, and security settings. Routine implementation details do not need a record.

## Naming and status

- Name files with the next four-digit number and a short kebab-case title: `0001-short-title.md`.
- Never reuse a number, including when a record is deprecated.
- Use one of these statuses: `Accepted`, `Superseded`, or `Deprecated`.
- `Accepted` means the decision is active.
- `Superseded` means a later decision replaces it. Link to the new record.
- `Deprecated` means the decision is no longer recommended and has no direct replacement. Explain the migration or removal plan when one exists.

## Writing and changing records

- Write records when a decision is accepted, close to the code change that implements it.
- Keep each record focused on one decision. State the context, the decision, and its consequences.
- Include relevant paths and commands so agents can connect the record to the repository.
- Call out security and operational tradeoffs explicitly.
- Treat accepted records as historical records. Do not rewrite their original decision when it changes; create a new record and mark the old one `Superseded`.
- Update the index in `README.md` whenever a record is added or its status changes.

## Template

```markdown
# NNNN: Decision title

**Status:** Accepted
**Date:** YYYY-MM-DD
**Supersedes:** None

## Context

Why this decision is needed.

## Decision

What the repository will do.

## Consequences

Effects, tradeoffs, and follow-up work.
```
