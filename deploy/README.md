# CI and production deployment

`.github/workflows/ci-cd.yml` runs lint, tests, and build on pull requests and pushes to `main`. The test job creates an isolated PostgreSQL database, generates Prisma Client, and applies migrations so the memory integration test runs. Successful main runs deploy the same commit; pull requests never deploy. A manual workflow run on main also runs CI before deployment.

The `production` GitHub environment allows only the `main` branch and contains:

| Kind     | Name                 | Purpose                                                              |
| -------- | -------------------- | -------------------------------------------------------------------- |
| Variable | `DEPLOY_HOST`        | Existing public SSH endpoint of the app server                       |
| Variable | `DEPLOY_USER`        | Dedicated `ultrasakti-deploy` server account                         |
| Secret   | `DEPLOY_SSH_KEY`     | Dedicated private key, restricted to the deployment command          |
| Secret   | `DEPLOY_KNOWN_HOSTS` | SSH host key verified through the existing trusted server connection |

Application credentials stay in `/opt/app/source/.env` on the server. This is the original root environment file; it is not copied into release archives, images, or GitHub. The application remains available at `https://app.tail9a7b40.ts.net` through Tailscale Serve.

## Server layout and operation

- `/opt/app/deploy/`: installed Docker configuration, release pointer, and deployment lock.
- `/opt/app/repository.git`: public repository fetched by the deployment helper.
- `/opt/app/releases/<sha>.<suffix>/`: source snapshot, build context, candidate release settings, and `previous.env` for rollback.
- `/opt/app/backups/`: protected PostgreSQL backups taken before migrations.
- `/usr/local/sbin/ultrasakti-deploy`: root-owned installed copy of `deploy.sh`.
- `/usr/local/bin/ultrasakti-deploy-command`: root-owned installed copy of `ssh-command.sh`.

The dedicated account has no general sudo access. Its authorized key uses `restrict` and the forced SSH command. The helper accepts only a full SHA matching the repository's current main tip, builds commit-tagged images, backs up the database, runs migrations, and replaces only the API and web containers. PostgreSQL, Redis, Tailscale, and monitoring keep running.

Inspect the active deployment:

```sh
ssh indrazm@app
cd /opt/app
sudo docker compose --env-file source/.env --env-file deploy/release.env -f deploy/compose.yml ps
sudo cat deploy/current-sha
curl --fail https://app.tail9a7b40.ts.net/api/health
```

An authorized operator can deploy main manually with `sudo /usr/local/sbin/ultrasakti-deploy <full-main-sha>`. Repeating a healthy current release is a no-op. The helper does not itself run CI; the workflow supplies that gate, and a manual operator must verify checks first.

## Deployment configuration updates

These files version the existing server configuration; application deployments do not install privileged helper changes from the repository. An operator must review and explicitly copy updated `Dockerfile`, `nginx.conf`, `compose.yml`, and `context.dockerignore` into `/opt/app/deploy`, then install the two scripts at the paths above as root-owned mode 755 files. Validate Bash syntax and Compose configuration before installing changes. Keep the existing `.env`, `release.env`, database volumes, monitoring configuration, and restricted sudo rule intact.

## Recovery

If activation or health checks fail, the helper starts the previous images again and restores `release.env`. Database migrations are not automatically reversed. Review schema compatibility before deployment; a backup restore is a separate operator decision because it can discard writes made after the backup.

For a manual image rollback, use the failing release's `previous.env` as the second `--env-file`, run `up -d --no-deps --wait api web`, and copy that file back to `/opt/app/deploy/release.env` after verifying health. The release environment file is the authoritative image pointer. Do not use `down -v` or reset PostgreSQL.

Source snapshots, old images, and database backups are retained for recovery. Their cleanup and off-host backup are operator responsibilities. Build output and deployment errors appear in the GitHub Actions job; application logs and host metrics remain available in Grafana.
