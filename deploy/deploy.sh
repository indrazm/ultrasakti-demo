#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ $EUID -ne 0 || $# -ne 1 || ! $1 =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Usage (as root): ultrasakti-deploy <full-main-commit-sha>' >&2
  exit 1
fi

sha=$1
app_dir=/opt/app
deploy_dir=$app_dir/deploy
env_file=$app_dir/source/.env
current_env=$deploy_dir/release.env
repository=$app_dir/repository.git

exec 9>"$deploy_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
test -f "$env_file"
test -f "$current_env"

if [[ ! -d $repository ]]; then
  git init --bare "$repository"
  git --git-dir="$repository" remote add origin https://github.com/indrazm/ultrasakti-demo.git
fi
git --git-dir="$repository" fetch --depth=1 origin refs/heads/main:refs/heads/main
if [[ $(git --git-dir="$repository" rev-parse refs/heads/main) != "$sha" ]]; then
  echo 'Refusing to deploy a commit other than the current main tip.' >&2
  exit 1
fi

if grep -qx "RELEASE_SHA=$sha" "$current_env" && \
  curl --fail --silent --connect-timeout 5 --max-time 15 \
    http://127.0.0.1:8080/api/health >/dev/null; then
  echo "$sha is already deployed and healthy."
  exit 0
fi

compose() {
  local release_env=$1
  shift
  docker compose --project-name ultrasakti --env-file "$env_file" \
    --env-file "$release_env" -f "$deploy_dir/compose.yml" "$@"
}

mkdir -p "$app_dir/releases" "$app_dir/backups"
release_dir=$(mktemp -d "$app_dir/releases/$sha.XXXXXX")
mkdir "$release_dir/source" "$release_dir/deploy"
# Retain Git's file modes so the non-root API process can read its source.
git --git-dir="$repository" archive "$sha" | tar --same-permissions -xf - -C "$release_dir/source"
cp "$deploy_dir/Dockerfile" "$deploy_dir/nginx.conf" "$release_dir/deploy/"
cp "$deploy_dir/context.dockerignore" "$release_dir/.dockerignore"
candidate_env=$release_dir/release.env
printf 'RELEASE_SHA=%s\nRELEASE_PATH=%s\n' "$sha" "$release_dir" > "$candidate_env"
previous_env=$release_dir/previous.env
cp "$current_env" "$previous_env"

rollback_needed=false
on_error() {
  local status=$?
  trap - ERR
  if $rollback_needed; then
    echo 'Activation failed; restoring the previous application images.' >&2
    compose "$previous_env" up -d --no-deps --wait --wait-timeout 120 api web || \
      echo 'Automatic image rollback failed; inspect the containers immediately.' >&2
    install -m 600 "$previous_env" "$current_env"
    echo 'Database migrations are not reversed automatically; the pre-deployment backup is retained.' >&2
  fi
  exit "$status"
}
trap on_error ERR

compose "$candidate_env" config --quiet
compose "$candidate_env" build api web
backup=$app_dir/backups/$(date -u +%Y%m%dT%H%M%SZ)-$sha.dump
compose "$current_env" exec -T postgres pg_dump -U ultrasakti -d ultrasakti -Fc > "$backup"
test -s "$backup"
echo "Database backup saved: $backup"
compose "$candidate_env" run --rm --no-deps -w /app/packages/db api \
  ./node_modules/.bin/prisma migrate deploy

rollback_needed=true
compose "$candidate_env" up -d --no-deps --wait --wait-timeout 120 api web
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --connect-timeout 5 --max-time 15 --output /dev/null http://127.0.0.1:8080/
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --connect-timeout 5 --max-time 15 http://127.0.0.1:8080/api/health
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --connect-timeout 5 --max-time 15 https://app.tail9a7b40.ts.net/api/health
install -m 600 "$candidate_env" "$current_env.next"
mv "$current_env.next" "$current_env"
printf '%s\n' "$sha" > "$deploy_dir/current-sha"
rollback_needed=false
echo "Deployed $sha"
