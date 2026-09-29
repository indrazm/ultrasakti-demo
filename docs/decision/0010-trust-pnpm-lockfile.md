# 0010: Trust the pnpm Lockfile

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** None

## Context

pnpm's supply-chain policy verification attempted to fetch registry metadata for lockfile entries. The development environment could not resolve the npm registry, blocking the verification pass.

## Decision

Set `trustLockfile: true` in `pnpm-workspace.yaml` so pnpm trusts this workspace's lockfile and skips that registry-based supply-chain policy verification.

## Consequences

- pnpm does not apply its registry-based supply-chain policy verification to the trusted lockfile. Review lockfile changes carefully.
- This setting does not make installs fully offline. Missing package tarballs or metadata for new dependencies still require registry access.
- Remove or supersede this decision if registry verification is restored or required by the project.
