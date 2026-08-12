#!/bin/bash

# Add a realistic member roster to an existing gym in the local dev database.
#
# ADDITIVE: this never truncates and never modifies a row it did not create, so
# it is safe to run against a dev DB holding hand-seeded scenarios. It is also
# re-runnable — the ids it writes are derived from the gym id, so a second run
# is a no-op. Contrast scripts/dev-db-reset.sh, which TRUNCATEs everything.
#
# Usage:
#   ./scripts/dev-db-populate-members.sh                 # 40 members, gym auto-detected
#   MEMBERS=120 ./scripts/dev-db-populate-members.sh     # bigger roster
#   GYM_ID=<uuid> ./scripts/dev-db-populate-members.sh   # a specific gym
#
# The gym is auto-detected as the one owned by OWNER_EMAIL (default
# owner@example.com), which is the gym the rest of the dev seed builds.

set -e

cd "$(dirname "$0")/.."

export $(grep -v '^#' backend/.env | xargs)

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-crossfit_box_dev}"

MEMBERS="${MEMBERS:-40}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@example.com}"

psql_run() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" "$@"
}

if [ -z "$GYM_ID" ]; then
  GYM_ID=$(psql_run -At -c "
    SELECT s.\"gymId\" FROM gym_staff s
      JOIN users u ON u.id = s.\"userId\"
     WHERE u.email = '$OWNER_EMAIL' AND s.role = 'owner' AND s.status = 'active'
     ORDER BY s.\"assignedAt\" LIMIT 1;")
fi

if [ -z "$GYM_ID" ]; then
  echo "❌ Could not find an active gym owned by $OWNER_EMAIL."
  echo "   Pass one explicitly:  GYM_ID=<uuid> $0"
  exit 1
fi

GYM_NAME=$(psql_run -At -c "SELECT name FROM gyms WHERE id = '$GYM_ID';")

echo "🏋️  Adding $MEMBERS members to \"$GYM_NAME\" ($GYM_ID)"
echo "    database: $DB_NAME on $DB_HOST:$DB_PORT"
echo "    nothing existing is deleted or modified"
echo ""

psql_run -v gym_id="$GYM_ID" -v members="$MEMBERS" -f scripts/sql/populate-members.sql

echo ""
echo "✅ Done. Log in as $OWNER_EMAIL / password123 and open Members."
echo "   Created members are member01@${GYM_ID:0:8}.testbox.local … / password123"
echo "   (the gym is in the address because users.email is globally unique)."
