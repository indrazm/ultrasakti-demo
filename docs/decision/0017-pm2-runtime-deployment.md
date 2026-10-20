# 0017: PM2 Runtime and Tailnet Deployment

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** [0016](./0016-github-actions-deployment.md)

## Context

Ultra Sakti now runs on `ubuntu-wsl`. The application should run under PM2, with Docker Compose managing only PostgreSQL and Redis. Hosted CI runners need tailnet access to the host.

## Decision

Run one PM2 fork of `apps/api/src/server.ts` using the existing `tsx` dependency. In production, Hono serves the built platform with SPA fallback, reserves API paths, and listens on loopback. Tailscale Serve terminates HTTPS. Development keeps separate Vite and API servers.

Keep the `ultrasakti` Compose project and its existing database volumes. Publish database ports only on loopback for the host application. A user systemd service resurrects the saved PM2 process list; the user requires lingering and WSL must be running.

Hosted Actions runners connect using a Tailscale OAuth client restricted to Auth Keys write and `tag:ci`. The tag inherits the tailnet policy; the existing policy currently allows all tailnet traffic. SSH uses a pinned host key and a dedicated forced-command key. The installed deployment helper runs as the application user and rejects any SHA other than the public repository's current main tip. Pull requests run CI only.

## Consequences

- Releases use frozen pnpm installs, source archives, built frontend assets and a symlink to the protected root environment. PM2 is a pinned host tool rather than an application dependency.
- Runtime credentials stay in the root environment and are loaded by Node, rather than copied into PM2's saved environment or GitHub.
- Deployments back up PostgreSQL before migrations, switch the current release, check HTTP/HTTPS health and save PM2 state. Activation failure restores the previous PM2 release; database migrations are not reversed.
- Infrastructure helpers require a reviewed operator installation. Deployments do not replace them. The deployment account owns the app and belongs to the Docker group, which is a privileged host capability.
- This single-process deployment briefly interrupts requests during restart. PM2 waits for readiness and allows 40 seconds for the app's 30-second telemetry and HTTP shutdown deadline.
- Lens remains a separate Docker deployment on HTTPS port 8443. The host runtime reports to its HTTPS endpoint.
