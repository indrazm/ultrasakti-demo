#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

if [[ $EUID -eq 0 || $# -ne 1 || ! $1 =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Usage (as the application user): deploy.sh <full-main-commit-sha>' >&2
  exit 1
fi
sha=$1
app_dir=$HOME/work/ultrasakti
deploy_dir=$app_dir/deploy
env_file=$app_dir/source/.env
repository=$app_dir/repository.git
exec 9>"$deploy_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
test -f "$env_file"

if [[ ! -d $repository ]]; then
  git init --bare "$repository"
  git --git-dir="$repository" remote add origin https://github.com/indrazm/ultrasakti-demo.git
fi
git --git-dir="$repository" fetch --depth=1 origin refs/heads/main
if [[ $(git --git-dir="$repository" rev-parse FETCH_HEAD) != "$sha" ]]; then
  echo 'Refusing to deploy a commit other than the current main tip.' >&2
  exit 1
fi
port=$(node --env-file="$env_file" -p 'process.env.PORT || 3000')
[[ $port =~ ^[0-9]+$ ]] || { echo 'Invalid PORT.' >&2; exit 1; }
origin=$(node --env-file="$env_file" -p 'process.env.PLATFORM_ORIGIN')
if [[ -f $deploy_dir/current-sha && $(cat "$deploy_dir/current-sha") == "$sha" ]] && \
  curl --fail --silent --connect-timeout 5 --max-time 15 "http://127.0.0.1:$port/api/health" >/dev/null; then
  echo "$sha is already deployed and healthy."
  exit 0
fi
compose() {
  docker compose --project-name ultrasakti --env-file "$env_file" -f "$deploy_dir/compose.yml" "$@" < /dev/null
}
mkdir -p "$app_dir/releases" "$app_dir/backups"
release_dir=$(mktemp -d "$app_dir/releases/$sha.XXXXXX")
git --git-dir="$repository" archive "$sha" | tar --same-permissions -xf - -C "$release_dir"
ln -s "$env_file" "$release_dir/.env"
cd "$release_dir"
HUSKY=0 pnpm install --frozen-lockfile
pnpm build
compose up -d --wait --wait-timeout 120 postgres redis
backup=$app_dir/backups/$(date -u +%Y%m%dT%H%M%SZ)-$sha.dump
compose exec -T postgres pg_dump -U "$(node --env-file="$env_file" -p 'process.env.POSTGRES_USER')" \
  -d "$(node --env-file="$env_file" -p 'process.env.POSTGRES_DB')" -Fc > "$backup"
test -s "$backup"
echo "Database backup saved: $backup"
pnpm --filter @ultrasakti/db migrate:deploy
previous=$(readlink -f "$app_dir/current")
printf '%s\n' "$previous" > "$release_dir/previous-release"
rollback_needed=false
on_error() {
  local status=$?
  trap - ERR
  if $rollback_needed; then
    echo 'Activation failed; restoring the previous PM2 release.' >&2
    ln -sfn "$previous" "$app_dir/current.next"
    mv -Tf "$app_dir/current.next" "$app_dir/current"
    pm2 startOrRestart "$previous/deploy/ecosystem.config.cjs" --update-env && pm2 save || \
      echo 'Automatic rollback failed; inspect PM2 immediately.' >&2
    echo 'Database migrations are not reversed; the backup is retained.' >&2
  fi
  exit "$status"
}
trap on_error ERR
rollback_needed=true
ln -sfn "$release_dir" "$app_dir/current.next"
mv -Tf "$app_dir/current.next" "$app_dir/current"
pm2 startOrRestart "$release_dir/deploy/ecosystem.config.cjs" --update-env
for url in "http://127.0.0.1:$port/" "http://127.0.0.1:$port/api/health" "$origin/api/health"; do
  curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
    --connect-timeout 5 --max-time 15 --output /dev/null "$url"
done
pm2 save
printf '%s\n' "$sha" > "$deploy_dir/current-sha"
rollback_needed=false
echo "Deployed $sha"
