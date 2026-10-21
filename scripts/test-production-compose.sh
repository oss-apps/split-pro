#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/test-production-compose.sh [--e2e] [--image IMAGE] [--timeout SECONDS]

Build both repository images and smoke-test the production Compose stack.
  --e2e              Also run the existing Chromium E2E suite (requires pnpm and Chromium).
  --image IMAGE      Pull and test this image instead of building the checkout.
  --timeout SECONDS  Maximum wait for healthy services per startup (default: 180).

Requires Docker with Compose 2.24.4+ and curl. Uses disposable volumes and loopback ports.
Diagnostics are saved under test-results/production-compose/<unique-project>/.
EOF
}

image=''
e2e=0
timeout=180
while (( $# )); do
  case "$1" in
    --e2e) e2e=1; shift ;;
    --image|--timeout)
      if (( $# < 2 )) || [[ -z "$2" || "$2" == --* ]]; then
        usage >&2
        exit 2
      fi
      if [[ "$1" == --image ]]; then image="$2"; else timeout="$2"; fi
      shift 2
      ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done
if [[ ! "$timeout" =~ ^[1-9][0-9]*$ ]]; then
  printf '%s\n' '--timeout must be a positive integer' >&2
  exit 2
fi

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
for tool in docker curl; do
  command -v "$tool" >/dev/null || { printf 'Missing required command: %s\n' "$tool" >&2; exit 1; }
done
if (( e2e )); then
  command -v pnpm >/dev/null || { printf '%s\n' '--e2e requires pnpm and installed dependencies' >&2; exit 1; }
fi
docker info >/dev/null
docker compose version

temp="$(mktemp -d)"
project="splitpro-smoke-$(date +%s)-$$-$RANDOM"
artifacts="$root/test-results/production-compose/$project"
mkdir -p "$artifacts"
built_image=0
db_image="splitpro-smoke-db:$project"
http_port=0
base_url='http://127.0.0.1:3000'

# Preserve Docker connection settings, but never inherit application/Compose settings
# or the checkout's .env into the deployment under test.
docker_environment=("PATH=$PATH")
for name in HOME DOCKER_HOST DOCKER_CONTEXT DOCKER_CONFIG DOCKER_TLS_VERIFY DOCKER_CERT_PATH XDG_RUNTIME_DIR SSH_AUTH_SOCK; do
  if [[ -v "$name" ]]; then docker_environment+=("$name=${!name}"); fi
done
compose_base() {
  env -i "${docker_environment[@]}" \
    SMOKE_IMAGE="$image" SMOKE_DB_IMAGE="$db_image" \
    SMOKE_HTTP_PORT="$http_port" SMOKE_BASE_URL="$base_url" \
    docker compose --project-name "$project" --project-directory "$temp" \
    --env-file "$temp/.env" \
    -f "$root/docker/prod/compose.yml" "$@"
}
compose() {
  compose_base -f "$root/docker/test/production.override.yml" "$@"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  set +e
  compose ps --all >"$artifacts/services.txt" 2>&1
  compose logs --no-color --timestamps >"$artifacts/compose.log" 2>&1
  local id
  while IFS= read -r id; do
    [[ -n "$id" ]] && docker inspect --format '{{json .State}}' "$id"
  done < <(compose ps --all --quiet) >"$artifacts/container-states.jsonl" 2>&1
  if (( status )); then
    cat "$artifacts/services.txt" "$artifacts/compose.log" "$artifacts/container-states.jsonl" >&2
  fi
  if ! compose down --volumes --remove-orphans >"$artifacts/cleanup.log" 2>&1; then
    cat "$artifacts/cleanup.log" >&2
    status=1
  fi
  if (( built_image )); then docker image rm "$image" >/dev/null 2>&1; fi
  docker image rm "$db_image" >/dev/null 2>&1
  rm -rf -- "$temp"
  printf 'Compose diagnostics: %s\n' "$artifacts"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cat >"$temp/.env" <<'EOF'
POSTGRES_USER=splitpro
POSTGRES_PASSWORD=compose-test-password
POSTGRES_DB=splitpro_compose_test
POSTGRES_PORT=5432
DATABASE_URL=postgresql://splitpro:compose-test-password@postgres:5432/splitpro_compose_test?connect_timeout=5&socket_timeout=5
PORT=3000
NEXTAUTH_SECRET=production-compose-disposable-test-secret
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000
GOOGLE_CLIENT_ID=compose-test-client
GOOGLE_CLIENT_SECRET=compose-test-secret
ENABLE_SENDING_INVITES=0
DISABLE_EMAIL_SIGNUP=0
INVITE_ONLY=0
EOF

# Match the deployed DB version, rather than the Dockerfile's older default arguments.
production_db_image="$(compose_base config --images postgres)"
if [[ ! "$production_db_image" =~ :([0-9]+)\.([0-9]+)-([a-zA-Z0-9-]+)$ ]]; then
  printf 'Cannot derive PostgreSQL build arguments from %s\n' "$production_db_image" >&2
  exit 1
fi
db_major="${BASH_REMATCH[1]}"
db_minor="${BASH_REMATCH[2]}"
db_base="${BASH_REMATCH[3]}"
# A placeholder app tag permits configuration validation before either build starts.
if [[ -z "$image" ]]; then image="splitpro-smoke:$project"; built_image=1; fi
compose config --quiet
docker build --progress=plain --file "$root/docker/postgres/Dockerfile" \
  --build-arg "POSTGRES_MAJOR=$db_major" --build-arg "POSTGRES_MINOR=$db_minor" \
  --build-arg "POSTGRES_BASE=$db_base" --tag "$db_image" "$root/docker/postgres" \
  2>&1 | tee "$artifacts/database-build.log"

if (( built_image )); then
  docker build --progress=plain --build-arg APP_VERSION=compose-test \
    --build-arg "GIT_SHA=$(git -C "$root" rev-parse HEAD)" --tag "$image" "$root" \
    2>&1 | tee "$artifacts/build.log"
else
  docker pull "$image" 2>&1 | tee "$artifacts/pull.log"
fi

sql() {
  compose exec -T postgres psql -X --username splitpro --dbname splitpro_compose_test \
    --no-align --tuples-only --set ON_ERROR_STOP=1 --command "$1"
}
assert_equal() {
  if [[ "$1" != "$2" ]]; then
    printf 'Assertion failed: %s\nExpected: %s\nActual: %s\n' "$3" "$2" "$1" >&2
    exit 1
  fi
}
check_http() {
  local endpoint
  for endpoint in healthz readyz; do
    assert_equal "$(curl --fail --silent --show-error --max-time 15 "$base_url/api/$endpoint")" \
      '{"status":"ok"}' "/api/$endpoint"
  done
  curl --fail --silent --show-error --location --max-redirs 5 --max-time 30 \
    "$base_url/auth/signin" >"$artifacts/signin.html"
  # Check a real referenced asset, rather than merely accepting an HTML 200 response.
  # JavaScript template literals below must be passed to Node without shell expansion.
  # shellcheck disable=SC2016
  compose exec -T splitpro node -e '
    const html = require("node:fs").readFileSync(0, "utf8");
    const asset = html.match(/(?:src|href)="([^"\s]*\/_next\/static\/[^"\s]+)"/);
    if (!asset) throw new Error("Sign-in HTML contains no Next.js static asset");
    fetch(new URL(asset[1].replaceAll("&amp;", "&"), "http://127.0.0.1:3000"))
      .then(async response => {
        if (!response.ok || !(await response.arrayBuffer()).byteLength) {
          throw new Error(`Static asset failed: ${response.status}`);
        }
      }).catch(error => { console.error(error); process.exitCode = 1; });
  ' <"$artifacts/signin.html"
}
check_migrations() {
  local bundled applied
  bundled="$(compose exec -T splitpro node -e '
    const fs = require("node:fs");
    console.log(fs.readdirSync("prisma/migrations", { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => entry.name).sort().join("\n"));
  ')"
  [[ -n "$bundled" ]] || { printf '%s\n' 'No bundled migrations found' >&2; exit 1; }
  applied="$(sql 'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name COLLATE "C"')"
  assert_equal "$applied" "$bundled" 'All bundled migrations applied exactly once'
  assert_equal "$(sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL')" 0 'No failed migrations'
  assert_equal "$(sql "SELECT count(*) FROM pg_extension WHERE extname = 'pg_cron'")" 1 'pg_cron installed'
  assert_equal "$(sql 'SHOW cron.database_name')" splitpro_compose_test 'pg_cron database'
  schema_version="$(sql "SELECT value FROM \"AppMetadata\" WHERE key = 'schema_version'")"
  [[ -n "$schema_version" ]] || { printf '%s\n' 'Missing application schema version' >&2; exit 1; }
}

printf '%s\n' 'Starting fresh production stack...'
compose up --wait --wait-timeout "$timeout"
binding="$(compose port splitpro 3000)"
http_port="${binding##*:}"
base_url="http://127.0.0.1:$http_port"
check_http
check_migrations
initial_version="$schema_version"
sql "CREATE TABLE compose_smoke_sentinel (value text NOT NULL); INSERT INTO compose_smoke_sentinel VALUES ('$project');" >/dev/null
compose exec -T splitpro node -e \
  'require("node:fs").writeFileSync("/app/uploads/compose-smoke-sentinel", process.argv[1])' "$project"

printf '%s\n' 'Recreating containers with their persistent volumes...'
# Pin the assigned HTTP port and set the exact public auth URL for the E2E run.
compose down
compose up --wait --wait-timeout "$timeout"
check_http
check_migrations
assert_equal "$schema_version" "$initial_version" 'Application migration version persists'
assert_equal "$(sql 'SELECT value FROM compose_smoke_sentinel')" "$project" 'Database volume persists'
assert_equal "$(compose exec -T splitpro node -e \
  'process.stdout.write(require("node:fs").readFileSync("/app/uploads/compose-smoke-sentinel", "utf8"))')" \
  "$project" 'Uploads volume persists'

if (( e2e )); then
  binding="$(compose port postgres 5432)"
  database_url="postgresql://splitpro:compose-test-password@127.0.0.1:${binding##*:}/splitpro_compose_test"
  printf 'Running Chromium E2E against %s...\n' "$base_url"
  (
    cd "$root"
    E2E_EXTERNAL_SERVER=1 E2E_BASE_URL="$base_url" E2E_DATABASE_URL="$database_url" \
      pnpm test:e2e --project=chromium
  ) 2>&1 | tee "$artifacts/e2e.log"
fi
printf '%s\n' 'Production Compose checks passed.'
