#!/usr/bin/env bash
set -euo pipefail

root="${SPLITPRO_ROOT:-$(pwd)}"
cd "$root"

if [[ "up" != "${1:-}" && "down" != "${1:-}" ]]; then
  printf 'Usage: bash scripts/dev-db.sh up|down\n' >&2
  exit 1
fi

if [[ "1" != "${SPLITPRO_NATIVE_POSTGRES:-}" ]]; then
  if [[ "up" == "${1:-}" ]]; then
    exec docker compose -f docker/dev/compose.yml --env-file .env up -d
  fi
  exec docker compose -f docker/dev/compose.yml down
fi

# Read .env with Node's parser, without executing it as shell code. Explicit
# environment overrides take precedence, just as they do for Docker Compose.
while IFS= read -r -d '' key && IFS= read -r -d '' value; do
  export "$key=$value"
done < <(node --env-file-if-exists=.env -e '
  const keys = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "POSTGRES_PORT"];
  keys.forEach(key => {
    if (undefined !== process.env[key]) {
      process.stdout.write(key + "\0" + process.env[key] + "\0");
    }
  });
')

user="${POSTGRES_USER:-postgres}"
database="${POSTGRES_DB:-splitpro}"
port="${POSTGRES_PORT:-5432}"
state="$root/.direnv/postgres"
data="$state/data"
mkdir -p "$state"

if [[ "down" == "${1:-}" ]]; then
  if [[ -f "$data/postmaster.pid" ]]; then
    pg_ctl -D "$data" -m fast -w stop
  fi
  exit 0
fi

if [[ ! "$user" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ||
      ! "$database" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ||
      ! "$port" =~ ^[0-9]+$ || "$port" -lt 1 || "$port" -gt 65535 ]]; then
  printf 'Use simple PostgreSQL user/database names and a port between 1 and 65535.\n' >&2
  exit 1
fi

if [[ ! -f "$data/PG_VERSION" ]]; then
  # Only loopback connections are accepted. Password authentication is used for
  # TCP; the project-local Unix socket is trusted for bootstrap administration.
  initdb -D "$data" -U "$user" --encoding=UTF8 --locale=C \
    --auth-local=trust --auth-host=scram-sha-256 \
    --pwfile=<(printf '%s\n' "${POSTGRES_PASSWORD:-strong-password}")
fi

if ! pg_ctl -D "$data" status >/dev/null 2>&1; then
  # pg_ctl passes its options through a shell, so quote the socket path.
  printf -v options '%q ' -p "$port" -k "$state" -h 127.0.0.1
  pg_ctl -D "$data" -l "$state/postgres.log" -w start \
    -o "$options -c shared_preload_libraries=pg_cron -c cron.database_name=$database -c cron.timezone=UTC -c cron.use_background_workers=on"
fi

if [[ "1" != "$(psql -h "$state" -p "$port" -U "$user" -d postgres -At \
  -v db="$database" <<< "SELECT 1 FROM pg_database WHERE datname = :'db';")" ]]; then
  createdb -h "$state" -p "$port" -U "$user" "$database"
fi
psql -h "$state" -p "$port" -U "$user" -d "$database" \
  -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS pg_cron;'
