#!/bin/bash

# Local development database reset and seed script
# Clears all tables and inserts minimal viable test data

set -e

# Load environment from backend/.env
export $(grep -v '^#' backend/.env | xargs)

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-crossfit_box_dev}"

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

-- Insert Users (proper UUIDs)
INSERT INTO users (id, email, "passwordHash", "socialLoginId", name, status, "createdAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'athlete@example.com', NULL, NULL, 'Test Athlete', 'active', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'coach@example.com', NULL, NULL, 'Test Coach', 'active', NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'owner@example.com', NULL, NULL, 'Gym Owner', 'active', NOW());

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

-- Insert AthleteMembershipPlan
INSERT INTO athlete_membership_plans (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt")
VALUES
  ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440040', 'active', NOW(), NULL);

-- Insert Classes (3 classes, 7-8 days in future, published state)
INSERT INTO classes (
  id, "gymId", "classTypeId", "coachUserId", "spaceId",
  "scheduledDate", "scheduledTime", capacity, loggable, state,
  "createdAt", "lastModifiedAt", "deletedAt"
)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030',
    CURRENT_DATE + INTERVAL '7 days', '09:00', 12, true, 'published',
    NOW(), NOW(), NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440031',
    CURRENT_DATE + INTERVAL '7 days', '18:00', 8, true, 'published',
    NOW(), NOW(), NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440030',
    CURRENT_DATE + INTERVAL '8 days', '09:00', 12, true, 'published',
    NOW(), NOW(), NULL
  );

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

echo "✅ Database reset and seeded successfully"
echo ""
echo "Test users created:"
echo "  Athlete:  athlete@example.com"
echo "  Coach:    coach@example.com"
echo "  Owner:    owner@example.com"
echo ""
echo "Gym: CrossFit Test Box (active)"
echo "Classes: 3 published classes scheduled 7-8 days from now"
echo ""
echo "Ready to start backend with: cd backend && npm run start:dev"
