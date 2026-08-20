#!/usr/bin/env bash
#
# Fails when the entities and the migrations disagree.
#
# Builds a throwaway database from migrations alone, then asks TypeORM what
# synchronize WOULD do to it. Anything at all means an entity changed without a
# migration, and a deployed environment would be missing that change.
#
# A throwaway database rather than dev or e2e: dev is synchronize-built, so it
# already matches the entities and would report clean no matter how stale the
# migrations were. That would be a gate that always passes.
#
# Requires DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD for a server where the role
# can CREATE DATABASE. Never touches an existing database.
set -euo pipefail

DRIFT_DB="${DRIFT_DB:-crossfit_box_drift_check}"
export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGUSER="${DB_USERNAME:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

cleanup() {
  psql -d postgres -c "DROP DATABASE IF EXISTS \"$DRIFT_DB\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
psql -d postgres -c "CREATE DATABASE \"$DRIFT_DB\"" >/dev/null

DB_NAME="$DRIFT_DB" NODE_ENV=production npm run migration:run >/dev/null

OUTPUT="$(DB_NAME="$DRIFT_DB" NODE_ENV=production npm run schema:log 2>&1)"

if echo "$OUTPUT" | grep -q "there are no queries to be executed"; then
  echo "✓ Schema is in sync: migrations build exactly what the entities describe."
  exit 0
fi

echo "✗ Schema drift detected. An entity changed without a migration."
echo
echo "$OUTPUT"
echo
echo "Fix: cd backend && npm run migration:generate -- src/migrations/<DescriptiveName>"
echo "Then READ the generated SQL before committing it — generation is where a"
echo "construct silently goes missing."
exit 1
