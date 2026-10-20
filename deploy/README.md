# CI and production deployment

Ultra Sakti runs in PM2 on `ubuntu-wsl`. One Hono process serves the API and built platform. `compose.yml` runs only PostgreSQL and Redis, using the existing `ultrasakti_postgres_data` and `ultrasakti_redis_data` volumes and loopback ports 5432/6379. Lens is a separate Docker deployment.

The app is served at `https://ubuntu-wsl.tail9a7b40.ts.net` through Tailscale Serve. The host root environment is `~/work/ultrasakti/source/.env` (mode 600). Set `PORT=8082`, `DATABASE_URL` and `REDIS_URL` to the loopback database endpoints, and `VITE_API_URL`, `BETTER_AUTH_URL` and `PLATFORM_ORIGIN` to the app HTTPS origin. Keep the existing database password and auth/provider credentials. `ANVIA_LENS_BASE_URL` is `https://ubuntu-wsl.tail9a7b40.ts.net:8443`; Lens keys stay in the same protected environment.

## Host setup

Use Node 26, pnpm 12.4.2 and PM2 7.0.4. Install pnpm with the host's Node package manager, then install PM2 with `PNPM_HOME="$HOME/.local/share/pnpm" pnpm add -g pm2@7.0.4`. Include that directory and the Node binary directory in the user's PATH. Do not run the application or helper as root.

The host layout is:

- `~/work/ultrasakti/deploy/`: reviewed, installed `compose.yml`, `deploy.sh`, `ssh-command.sh`, deployment lock and `current-sha`.
- `source/.env`: persistent root environment, linked from each release.
- `repository.git`: public repository cache.
- `releases/<sha>.<suffix>/`: immutable source and build output, plus `previous-release` after activation.
- `current`: symlink to the active release.
- `backups/`: protected PostgreSQL dumps retained before migrations.

An operator must install changes to the scripts and Compose file explicitly. Validate Bash syntax and `docker compose --env-file source/.env -f deploy/compose.yml config --quiet` first. Preserve the project name, volumes and root environment. After preparing the first release with `pnpm install --frozen-lockfile` and a linked root `.env`, build with `pnpm exec dotenv -e .env -- pnpm build`, run migrations, create `current`, and start its `deploy/ecosystem.config.cjs` with PM2. Then run `deploy/install-pm2-service.sh` as the app user. The installer saves PM2 state, restarts its daemon under user systemd and enables resurrection. Lingering must be enabled for that user (`loginctl show-user "$USER" -p Linger`). WSL itself must remain running.

Configure Serve with `tailscale serve --bg http://127.0.0.1:8082`. Its existing HTTPS port 8443 route for Lens remains configured. The app listens on loopback in production. PM2 reads the root environment through Node's `--env-file` argument, and flushes HTTP requests, telemetry and Prisma on shutdown.

## GitHub Actions

Pull requests run lint, database-backed tests, build and the production runtime smoke check. Main pushes and manual main runs deploy after CI. The `production` environment allows only `main` and contains:

| Kind     | Name                 | Purpose                                              |
| -------- | -------------------- | ---------------------------------------------------- |
| Variable | `DEPLOY_HOST`        | `ubuntu-wsl.tail9a7b40.ts.net`                       |
| Variable | `DEPLOY_USER`        | `indrazm`                                            |
| Secret   | `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client for Auth Keys write, `tag:ci` |
| Secret   | `TS_OAUTH_SECRET`    | OAuth client secret                                  |
| Secret   | `DEPLOY_SSH_KEY`     | Dedicated key restricted to the deployment command   |
| Secret   | `DEPLOY_KNOWN_HOSTS` | Host key verified over the trusted SSH connection    |

The ephemeral runner joins as `tag:ci`. Tailnet policy must permit that tag to reach SSH and HTTPS on the host; the current tailnet uses its existing allow-all policy. Its SSH authorized key uses `restrict,command="/home/indrazm/work/ultrasakti/deploy/ssh-command.sh"`. The wrapper permits only `deploy <40-character-sha>`; the helper independently rejects anything except the current main tip. It does not run CI itself, so manual operators must verify checks first. No sudo rule is needed. The account's Docker membership grants privileged host access; the forced key is a command restriction, not an OS sandbox.

## Operations and recovery

```sh
ssh ubuntu-wsl
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
cd ~/work/ultrasakti
pm2 status
pm2 logs ultrasakti --lines 50
systemctl --user status pm2-ultrasakti
cat deploy/current-sha
docker compose --project-name ultrasakti --env-file source/.env -f deploy/compose.yml ps
curl --fail https://ubuntu-wsl.tail9a7b40.ts.net/api/health
```

Deploy main manually with `~/work/ultrasakti/deploy/deploy.sh <full-main-sha>`. Repeating a healthy current release is a no-op. Builds and migrations happen before PM2 restarts. Activation failures restore the previous release and saved PM2 state. Database migrations are never reversed automatically; schema changes must support the prior app or include a reviewed recovery plan.

For a manual rollback, read `previous-release` in the failed release, atomically repoint `current` to it, run `pm2 startOrRestart <previous-release>/deploy/ecosystem.config.cjs --update-env`, verify health, run `pm2 save`, and restore `deploy/current-sha` to the previous SHA. A database restore is a separate operator decision because it can discard later writes. Never use `down -v` or reset PostgreSQL.

PM2 logs are under `~/.pm2/logs`; monitor their size and rotate them as part of host maintenance. Source releases, Docker images from the migration and protected backups are retained for recovery. Their cleanup and off-host backups remain operator responsibilities.

Production smoke captures: [desktop chat](../docs/screenshots/pm2-production-chat.png) and [mobile chat](../docs/screenshots/pm2-production-mobile.png). These use a synthetic deployment test account.
