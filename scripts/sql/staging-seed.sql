-- Staging demo seed — ADDITIVE and idempotent.
--
-- Run only via scripts/staging-seed.sh, which refuses any database but
-- boxops_staging. There is deliberately no TRUNCATE, DELETE or DROP anywhere in
-- this file: staging holds a demo somebody may be mid-way through showing, and a
-- redeploy must leave it untouched. Contrast scripts/sql/../dev-db-reset.sh,
-- which destroys everything.
--
-- Every statement ends in ON CONFLICT DO NOTHING against a fixed, derived id, so
-- a second run inserts nothing rather than failing on a duplicate key. The
-- arbiter is left implicit (bare DO NOTHING) so that a collision on ANY unique
-- index — users.email, or the one-active-plan partial index on
-- athlete_membership_plans — is absorbed too, not just one on the primary key.
--
-- Passwords: every demo user has the same bcrypt hash of "password123" that
-- scripts/dev-db-reset.sh uses. Staging carries no real data, and a demo
-- credential nobody wrote down is a demo nobody can open.

\set ON_ERROR_STOP on

BEGIN;

-- Ids are literal and stable, derived from one demo-gym prefix, so that a second
-- run addresses the same rows. Classes are the exception: their ids are derived
-- from the calendar slot they occupy (see below).
\set gym            '''a5000000-0000-4000-8000-000000000010'''
\set owner          '''a5000000-0000-4000-8000-000000000001'''
\set coach          '''a5000000-0000-4000-8000-000000000002'''
\set ct_crossfit    '''a5000000-0000-4000-8000-000000000020'''
\set ct_gymnastics  '''a5000000-0000-4000-8000-000000000021'''
\set ct_weightlift  '''a5000000-0000-4000-8000-000000000022'''
\set sp_floor       '''a5000000-0000-4000-8000-000000000030'''
\set sp_studio      '''a5000000-0000-4000-8000-000000000031'''
\set plan_unlimited '''a5000000-0000-4000-8000-000000000040'''
\set plan_crossfit  '''a5000000-0000-4000-8000-000000000041'''

-- Password hash for "password123", copied from scripts/dev-db-reset.sh.
\set pwd '''$2b$10$2XwoJPhlfulcQ0fJsZ8lgOUhPtLiTRdIVgnZxCvJXc9/e9G3PBEoC'''

-- Users: one owner, one coach, six athletes.
INSERT INTO users (id, email, "passwordHash", "socialLoginId", name, status)
VALUES
  (:owner, 'owner@demo.boxops.dev',    :pwd, NULL, 'Dana Okonkwo',   'active'),
  (:coach, 'coach@demo.boxops.dev',    :pwd, NULL, 'Rui Marques',    'active'),
  ('a5000000-0000-4000-8000-000000000003', 'athlete1@demo.boxops.dev', :pwd, NULL, 'Alex Ferreira', 'active'),
  ('a5000000-0000-4000-8000-000000000004', 'athlete2@demo.boxops.dev', :pwd, NULL, 'Bea Nowak',     'active'),
  ('a5000000-0000-4000-8000-000000000005', 'athlete3@demo.boxops.dev', :pwd, NULL, 'Chidi Balogun', 'active'),
  ('a5000000-0000-4000-8000-000000000006', 'athlete4@demo.boxops.dev', :pwd, NULL, 'Dita Ranta',    'active'),
  ('a5000000-0000-4000-8000-000000000007', 'athlete5@demo.boxops.dev', :pwd, NULL, 'Emre Yildiz',   'active'),
  ('a5000000-0000-4000-8000-000000000008', 'athlete6@demo.boxops.dev', :pwd, NULL, 'Fen Zhao',      'active')
ON CONFLICT DO NOTHING;

-- The gym. Every row below is scoped to it: no entity but User is global.
INSERT INTO gyms (id, name, description, location, "logoUrl", "ownerUserId", status)
VALUES (
  :gym,
  'BoxOps Demo Box',
  'A demonstration gym. All data here is fictional and all passwords are password123.',
  'Rua da Alegria 12, Porto',
  NULL,
  :owner,
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO class_types (id, "gymId", name, loggable, "resultMetrics", "deletedAt")
VALUES
  (:ct_crossfit,   :gym, 'CrossFit',              true, 'time',   NULL),
  (:ct_gymnastics, :gym, 'Gymnastics',            true, 'reps',   NULL),
  (:ct_weightlift, :gym, 'Olympic Weightlifting', true, 'weight', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO spaces (id, "gymId", name, "baseCapacity", "deletedAt")
VALUES
  (:sp_floor,  :gym, 'Main Floor', 20, NULL),
  (:sp_studio, :gym, 'Studio',     10, NULL)
ON CONFLICT DO NOTHING;

-- Two plans, so the demo shows the visibility rule rather than hiding it: the
-- Unlimited plan covers all three class types, the CrossFit plan covers one. An
-- athlete on the narrower plan sees a genuinely shorter schedule — which is the
-- point, but it also means a plan must cover a class type that classes exist for,
-- or the schedule renders empty and the demo looks broken.
INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status)
VALUES
  (:plan_unlimited, :gym, 'Unlimited', 95, 'monthly',
   :ct_crossfit || ',' || :ct_gymnastics || ',' || :ct_weightlift, 'active'),
  (:plan_crossfit,  :gym, 'CrossFit Only', 60, 'monthly',
   :ct_crossfit, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO gym_staff (id, "gymId", "userId", role, status)
VALUES
  ('a5000000-0000-4000-8000-000000000050', :gym, :owner, 'owner', 'active'),
  ('a5000000-0000-4000-8000-000000000051', :gym, :coach, 'coach', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO gym_memberships (id, "gymId", "userId", status)
VALUES
  ('a5000000-0000-4000-8000-000000000060', :gym, 'a5000000-0000-4000-8000-000000000003', 'active'),
  ('a5000000-0000-4000-8000-000000000061', :gym, 'a5000000-0000-4000-8000-000000000004', 'active'),
  ('a5000000-0000-4000-8000-000000000062', :gym, 'a5000000-0000-4000-8000-000000000005', 'active'),
  ('a5000000-0000-4000-8000-000000000063', :gym, 'a5000000-0000-4000-8000-000000000006', 'active'),
  ('a5000000-0000-4000-8000-000000000064', :gym, 'a5000000-0000-4000-8000-000000000007', 'active'),
  ('a5000000-0000-4000-8000-000000000065', :gym, 'a5000000-0000-4000-8000-000000000008', 'active')
ON CONFLICT DO NOTHING;

-- autoRoll/autoRollCount are stated rather than defaulted, so the seed records
-- the renewal policy it is demonstrating.
INSERT INTO athlete_membership_plans (
  id, "gymMembershipId", "membershipPlanId", status, "expiresAt", "autoRoll", "autoRollCount"
)
VALUES
  ('a5000000-0000-4000-8000-000000000070', 'a5000000-0000-4000-8000-000000000060', :plan_unlimited, 'active', NULL, true, 0),
  ('a5000000-0000-4000-8000-000000000071', 'a5000000-0000-4000-8000-000000000061', :plan_unlimited, 'active', NULL, true, 0),
  ('a5000000-0000-4000-8000-000000000072', 'a5000000-0000-4000-8000-000000000062', :plan_unlimited, 'active', NULL, true, 0),
  ('a5000000-0000-4000-8000-000000000073', 'a5000000-0000-4000-8000-000000000063', :plan_unlimited, 'active', NULL, true, 0),
  ('a5000000-0000-4000-8000-000000000074', 'a5000000-0000-4000-8000-000000000064', :plan_crossfit,  'active', NULL, true, 0),
  ('a5000000-0000-4000-8000-000000000075', 'a5000000-0000-4000-8000-000000000065', :plan_crossfit,  'active', NULL, true, 0)
ON CONFLICT DO NOTHING;

-- A fortnight of classes, generated from CURRENT_DATE so the demo schedule is
-- never empty and a later run tops it up with the days that have since come into
-- range. The id is the md5 of the calendar slot the class occupies, so it is
-- fixed for a given (date, time, space): re-running on the same day inserts
-- nothing at all, and re-running a week later adds only the new days, without
-- ever touching or deleting what is already there.
--
-- Saturdays get the two morning slots only; Sundays are closed.
INSERT INTO classes (
  id, "gymId", "classTypeId", "coachUserId", "spaceId",
  "scheduledDate", "scheduledTime", capacity, duration, loggable, state, "deletedAt"
)
SELECT
  md5(
    'boxops-staging-class:' || d.day::text || ':' || s.at || ':' || s.space_id
  )::uuid,
  :gym,
  s.class_type_id::uuid,
  :coach,
  s.space_id::uuid,
  d.day,
  s.at::time,
  s.capacity,
  s.duration,
  true,
  'published',
  NULL
FROM (
  SELECT g::date AS day
    FROM generate_series(CURRENT_DATE, CURRENT_DATE + 13, INTERVAL '1 day') AS g
) AS d
CROSS JOIN (
  VALUES
    ('06:00', :ct_crossfit,   :sp_floor,  18, 60, true),
    ('09:30', :ct_gymnastics, :sp_studio,  9, 60, true),
    ('12:15', :ct_crossfit,   :sp_floor,  18, 45, false),
    ('18:30', :ct_crossfit,   :sp_floor,  20, 60, false),
    ('19:45', :ct_weightlift, :sp_studio, 10, 75, false)
) AS s(at, class_type_id, space_id, capacity, duration, weekend)
WHERE EXTRACT(ISODOW FROM d.day) <= 5      -- weekdays: the full timetable
   OR (EXTRACT(ISODOW FROM d.day) = 6 AND s.weekend)  -- Saturday: mornings only
ON CONFLICT DO NOTHING;

COMMIT;

-- What the run produced. Counts are of the demo gym only, so they stay honest if
-- staging ever holds a second gym somebody created through the UI.
SELECT 'users (demo)'              AS entity, count(*) FROM users WHERE email LIKE '%@demo.boxops.dev'
UNION ALL SELECT 'gyms',                       count(*) FROM gyms                    WHERE id = :gym
UNION ALL SELECT 'class_types',                count(*) FROM class_types             WHERE "gymId" = :gym
UNION ALL SELECT 'spaces',                     count(*) FROM spaces                  WHERE "gymId" = :gym
UNION ALL SELECT 'membership_plans',           count(*) FROM membership_plans        WHERE "gymId" = :gym
UNION ALL SELECT 'gym_staff',                  count(*) FROM gym_staff               WHERE "gymId" = :gym
UNION ALL SELECT 'gym_memberships',            count(*) FROM gym_memberships         WHERE "gymId" = :gym
UNION ALL SELECT 'athlete_membership_plans',   count(*) FROM athlete_membership_plans amp
    JOIN gym_memberships gm ON gm.id = amp."gymMembershipId" WHERE gm."gymId" = :gym
UNION ALL SELECT 'classes',                    count(*) FROM classes                 WHERE "gymId" = :gym;
