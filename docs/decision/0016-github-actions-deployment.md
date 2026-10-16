# 0016: GitHub Actions CI and Deployment

**Status:** Accepted
**Date:** 2026-10-16
**Supersedes:** None

## Context

Merged changes must pass lint, tests, and build before deployment to the existing Docker application on `app`. The repository is public, and the application is served privately through Tailscale.

## Decision

Use GitHub-hosted runners for `.github/workflows/ci-cd.yml`. Pull requests run CI only. Main pushes and manual main runs deploy after CI passes. CI uses an isolated PostgreSQL service so the memory integration test runs rather than being skipped.

The production job uses a dedicated SSH key over the server's existing SSH endpoint, with a pinned host key. The production environment restricts deployments to `main`. Its server account accepts only `deploy <sha>` and can invoke only the installed deployment helper through sudo. The helper independently verifies the requested SHA is the current public repository's main tip.

## Consequences

- Production environment values remain on the server. GitHub stores only the deployment SSH key and known-hosts entry; host and username are environment variables.
- The server builds commit-tagged images from a fresh source archive, backs up PostgreSQL, applies migrations, and checks container and HTTPS health before recording the release.
- A failed activation restores the prior images. Database migrations are not automatically reversed; schema changes must support the old application or have a separately reviewed recovery plan.
- Deployments are serialized in GitHub and with a server lock. Older queued commits are rejected if main has advanced.
- `deploy/` versions the server deployment configuration. Changes to these privileged helpers or infrastructure files require an explicit operator installation; an application deployment does not replace them.
- Public SSH must remain reachable by the hosted runner. Web access remains tailnet-only. No self-hosted Actions runner is installed on the application server.
