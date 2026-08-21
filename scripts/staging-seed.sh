#!/usr/bin/env bash
#
# Seed the staging demo data. MANUAL ONLY — never call this from a workflow.
#
# The pipeline is forbidden to write application data (see the staging
# infrastructure spec): deploys run migrations and nothing else, so that no
# deploy can clobber a demo someone is mid-way through showing. This script is
# the deliberate exception a human runs once.
#
# ADDITIVE and idempotent: every insert is ON CONFLICT DO NOTHING against fixed
# ids, so a second run changes nothing. It never truncates. Contrast
# scripts/dev-db-reset.sh, which destroys everything.
#
# Usage:
#   STAGING_DATABASE_URL='<neon DIRECT url>' ./scripts/staging-seed.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# No apostrophe in the message: bash parses the word of ${var:?word} with quoting
# rules even inside double quotes, so a lone ' there is a syntax error.
: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to the Neon DIRECT url for boxops_staging}"

# Refuse anything but the staging database. The mirror image of
# assertE2eDatabase(): that guard keeps tests OUT of this database, and this one
# keeps the seed from landing anywhere else — including the dev database, where
# hand-seeded scenarios live.
ACTUAL="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT current_database()')"
if [ "$ACTUAL" != 'boxops_staging' ]; then
  echo "❌ Refusing to seed \"$ACTUAL\" — this script only seeds boxops_staging." >&2
  exit 1
fi

USERS_BEFORE="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT count(*) FROM users')"
echo "🌱 Seeding boxops_staging (currently $USERS_BEFORE users). Nothing is deleted."

psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/staging-seed.sql

USERS_AFTER="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT count(*) FROM users')"
echo "✅ Done. Users: $USERS_BEFORE → $USERS_AFTER"
echo "   Log in at https://app.boxops.dev — all demo passwords are password123"
echo "     owner@demo.boxops.dev · coach@demo.boxops.dev · athlete1…6@demo.boxops.dev"
