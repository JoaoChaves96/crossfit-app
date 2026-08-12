#!/bin/bash

# Local development database reset and seed script
#
# ⚠️  THIS TRUNCATES EVERY TABLE. Any hand-seeded scenario in the dev DB is
# destroyed, and every existing gym id changes, which invalidates the gym
# context in any client that is already logged in.
#
# To ADD data without destroying anything, use scripts/dev-db-populate-members.sh
# instead — it is additive and re-runnable.
#
# Seeds one gym (owner/coach/athlete, 2 class types, 2 spaces, 15 classes) and
# then runs scripts/sql/populate-members.sql to give it a roster that exercises
# every membership state. Set MEMBERS=0 to skip the roster.

set -e

cd "$(dirname "$0")/.."

# Load environment from backend/.env
export $(grep -v '^#' backend/.env | xargs)

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-crossfit_box_dev}"

SEED_GYM_ID="550e8400-e29b-41d4-a716-446655440010"
MEMBERS="${MEMBERS:-40}"

if [ "$FORCE" != "1" ]; then
  EXISTING=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" \
    -d "$DB_NAME" -At -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo 0)
  echo "⚠️  This will TRUNCATE every table in $DB_NAME (currently $EXISTING users)."
  echo "   Anything hand-seeded is lost, and all gym ids change."
  echo "   To add data without destroying any, run: ./scripts/dev-db-populate-members.sh"
  echo ""
  read -r -p "   Type 'reset' to continue: " CONFIRM
  if [ "$CONFIRM" != "reset" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "🗄️  Resetting database: $DB_NAME on $DB_HOST:$DB_PORT"

# Create temp SQL file with all seed commands
SEED_SQL=$(mktemp)

cat > "$SEED_SQL" << 'EOF'
-- Clear all data in correct FK order (reverse of creation)
TRUNCATE TABLE results CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE programming CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE athlete_membership_plans CASCADE;
TRUNCATE TABLE gym_memberships CASCADE;
TRUNCATE TABLE classes CASCADE;
TRUNCATE TABLE spaces CASCADE;
TRUNCATE TABLE membership_plans CASCADE;
TRUNCATE TABLE class_types CASCADE;
TRUNCATE TABLE gym_staff CASCADE;
TRUNCATE TABLE gyms CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert Users with bcrypt-hashed passwords (plaintext: "password123")
INSERT INTO users (id, email, "passwordHash", "socialLoginId", name, status, "createdAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'athlete@example.com', '$2b$10$2XwoJPhlfulcQ0fJsZ8lgOUhPtLiTRdIVgnZxCvJXc9/e9G3PBEoC', NULL, 'Test Athlete', 'active', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'coach@example.com', '$2b$10$2XwoJPhlfulcQ0fJsZ8lgOUhPtLiTRdIVgnZxCvJXc9/e9G3PBEoC', NULL, 'Test Coach', 'active', NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'owner@example.com', '$2b$10$2XwoJPhlfulcQ0fJsZ8lgOUhPtLiTRdIVgnZxCvJXc9/e9G3PBEoC', NULL, 'Gym Owner', 'active', NOW());

-- Insert Gym
INSERT INTO gyms (id, name, description, location, "logoUrl", "ownerUserId", status, "createdAt", "lastModifiedAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'CrossFit Test Box', 'Test gym for MVP verification', '123 Fitness St', NULL, '550e8400-e29b-41d4-a716-446655440003', 'active', NOW(), NOW());

-- Insert ClassTypes
INSERT INTO class_types (id, "gymId", name, loggable, "resultMetrics", "deletedAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'CrossFit', true, 'time', NULL),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010', 'Gymnastics', true, 'reps', NULL);

-- Insert Spaces
INSERT INTO spaces (id, "gymId", name, "baseCapacity", "deletedAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', 'Main Hall', 15, NULL),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440010', 'Studio', 8, NULL);

-- Insert MembershipPlans
INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status, "createdAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440010', 'Premium', 100, 'monthly', '550e8400-e29b-41d4-a716-446655440020,550e8400-e29b-41d4-a716-446655440021', 'active', NOW());

-- Insert GymStaff
INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'coach', 'active', NOW()),
  ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', 'owner', 'active', NOW());

-- Insert GymMembership for athlete
INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'active', NOW());

-- Insert AthleteMembershipPlan (autoRoll/autoRollCount stated explicitly rather
-- than left to the column defaults, so the seed documents the renewal policy)
INSERT INTO athlete_membership_plans (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt", "autoRoll", "autoRollCount")
VALUES
  ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440040', 'active', NOW(), NULL, true, 0);

-- Insert Classes (15 classes, 7-14 days in future, various times, published state)
INSERT INTO classes (
  id, "gymId", "classTypeId", "coachUserId", "spaceId",
  "scheduledDate", "scheduledTime", capacity, loggable, state,
  "createdAt", "lastModifiedAt", "deletedAt"
)
VALUES
  ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '7 days', '06:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '7 days', '09:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '7 days', '12:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '7 days', '18:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '7 days', '19:30', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '8 days', '06:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '8 days', '09:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '8 days', '12:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '8 days', '18:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '9 days', '09:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440110', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '10 days', '06:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '10 days', '12:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '11 days', '09:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440113', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '12 days', '18:00', 8, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440114', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030', CURRENT_DATE + INTERVAL '13 days', '06:00', 12, true, 'published', NOW(), NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440115', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031', CURRENT_DATE + INTERVAL '14 days', '12:00', 8, true, 'published', NOW(), NOW(), NULL);

-- Verify seed data was inserted
SELECT 'Users inserted:' as msg, COUNT(*) as count FROM users;
SELECT 'Gyms inserted:' as msg, COUNT(*) as count FROM gyms;
SELECT 'ClassTypes inserted:' as msg, COUNT(*) as count FROM class_types;
SELECT 'Spaces inserted:' as msg, COUNT(*) as count FROM spaces;
SELECT 'MembershipPlans inserted:' as msg, COUNT(*) as count FROM membership_plans;
SELECT 'GymMemberships inserted:' as msg, COUNT(*) as count FROM gym_memberships;
SELECT 'AthleteMembershipPlans inserted:' as msg, COUNT(*) as count FROM athlete_membership_plans;
SELECT 'Classes inserted:' as msg, COUNT(*) as count FROM classes;

EOF

# Execute seed SQL
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d "$DB_NAME" \
  -f "$SEED_SQL"

# Clean up temp file
rm "$SEED_SQL"

# Give the seeded gym a roster that exercises every membership state. The base
# seed above has a single member on a single unlimited plan, which leaves the
# owner's members list showing one "active" row and exercises none of the
# derived statuses.
if [ "$MEMBERS" != "0" ]; then
  echo ""
  echo "👥 Adding $MEMBERS members across every membership state"
  PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" \
    -v gym_id="$SEED_GYM_ID" -v members="$MEMBERS" \
    -f scripts/sql/populate-members.sql
fi

echo "✅ Database reset and seeded successfully"
echo ""
echo "Test users created (all password123):"
echo "  Athlete:  athlete@example.com"
echo "  Coach:    coach@example.com"
echo "  Owner:    owner@example.com"
if [ "$MEMBERS" != "0" ]; then
  echo "  Members:  member01@${SEED_GYM_ID:0:8}.testbox.local … member$(printf '%02d' "$MEMBERS")@…"
fi
echo ""
echo "Gym: CrossFit Test Box (active)"
echo "Classes: 15 published classes scheduled 7-14 days from now (varied times)"
echo ""
echo "Ready to start backend with: cd backend && npm run start:dev"
