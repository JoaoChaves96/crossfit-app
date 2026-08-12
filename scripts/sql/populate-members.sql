-- Populate a gym with a realistic roster that exercises every membership state.
--
-- ADDITIVE AND RE-RUNNABLE. This script never deletes or truncates anything and
-- never touches a row it did not create: every id it writes is derived from the
-- gym id plus a tag (see stable_uuid below), so a second run conflicts with its
-- own rows and does nothing. Existing members of the gym are left exactly as
-- they are.
--
-- Required variables:
--   gym_id  — the gym to populate (uuid)
--   members — how many members to create (integer)
--
-- Usage:
--   psql -v gym_id=4fdee05a-… -v members=40 -f scripts/sql/populate-members.sql
--
-- Every created user's password is "password123".
--
-- The status spread is deliberate: the owner's member list derives a four-value
-- membershipStatus, and two of those (`expired` with no plan at all, and an
-- auto-roll row whose stored expiry has passed but which still reads `active`
-- because coverage is judged against the DERIVED expiry) are invisible unless
-- the data contains them. See docs/DECISIONS.md → "An Auto-Roll Plan Is Judged
-- By Its Derived Expiry".

\set ON_ERROR_STOP on

-- psql does NOT interpolate :variables inside a dollar-quoted body, so hand
-- them to the DO block through the session config instead.
SELECT set_config('populate.gym_id', :'gym_id', false),
       set_config('populate.members', :'members', false)
\g /dev/null

-- Deterministic ids, so this script is re-runnable without duplicating rows.
--
-- A raw md5 is NOT usable here even though Postgres will happily cast it to
-- uuid: the API validates every route param ending in "Id" with
-- class-validator's isUUID (backend/src/http/uuid-param.pipe.ts), which demands
-- a version nibble in [1-8] and a variant nibble in [89ab]. md5 satisfies
-- neither ~94% of the time, so seeded rows would be readable in lists but every
-- action addressing one by id would fail with 400 "is not a valid UUID".
-- Forcing version 4 and variant 'a' keeps the determinism and passes the pipe.
--
-- pg_temp means the function disappears with the session; the schema is untouched.
CREATE FUNCTION pg_temp.stable_uuid(seed text) RETURNS uuid AS $fn$
  SELECT (substr(h, 1, 12) || '4' || substr(h, 14, 3) || 'a' || substr(h, 18, 15))::uuid
    FROM (SELECT md5(seed) AS h) t;
$fn$ LANGUAGE sql IMMUTABLE;

DO $populate$
DECLARE
  v_gym_id      uuid    := current_setting('populate.gym_id');
  v_members     integer := current_setting('populate.members')::integer;
  v_gym         text    := current_setting('populate.gym_id');
  -- bcrypt("password123"), the same hash the rest of the dev seed uses
  v_pwd         text    := '$2b$10$2XwoJPhlfulcQ0fJsZ8lgOUhPtLiTRdIVgnZxCvJXc9/e9G3PBEoC';
  v_class_types text;
  v_plan_ids    uuid[];
  v_plan_id     uuid;
  v_user_id     uuid;
  v_ms_id       uuid;
  v_ms_status   text;
  v_expires     timestamp;
  v_auto_roll   boolean;
  v_roll_count  integer;
  v_has_plan    boolean;
  v_first       text;
  v_last        text;
  i             integer;
  v_firsts      text[]  := ARRAY['Ana','Bruno','Carla','Diogo','Elena','Filipe','Gabriela','Hugo',
                                 'Inês','João','Katia','Luís','Marta','Nuno','Olívia','Pedro',
                                 'Rita','Sofia','Tiago','Vera'];
  v_lasts       text[]  := ARRAY['Almeida','Barbosa','Costa','Dias','Esteves','Ferreira','Gomes',
                                 'Henriques','Ivo','Jesus','Lopes','Martins','Neves','Oliveira',
                                 'Pereira','Queirós','Ribeiro','Santos','Teixeira','Vieira'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = v_gym_id) THEN
    RAISE EXCEPTION 'gym % does not exist', v_gym_id;
  END IF;

  -- The gym's class types, in the comma-joined form TypeORM's simple-array uses.
  SELECT COALESCE(string_agg(id::text, ','), '')
    INTO v_class_types
    FROM class_types
   WHERE "gymId" = v_gym_id AND "deletedAt" IS NULL;

  -- ---------------------------------------------------------------- plans ----
  -- Four assignable plans plus one archived, so the Plans tab has variety and
  -- the archived branch (Edit and Archive both hidden) has something to render.
  INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status, "createdAt")
  VALUES
    (pg_temp.stable_uuid(v_gym || ':plan:basic')::uuid,   v_gym_id, 'Basic',            59,  'monthly', v_class_types, 'active',   NOW()),
    (pg_temp.stable_uuid(v_gym || ':plan:student')::uuid, v_gym_id, 'Student',          39,  'monthly', v_class_types, 'active',   NOW()),
    (pg_temp.stable_uuid(v_gym || ':plan:annual')::uuid,  v_gym_id, 'Unlimited Annual', 990, 'annual',  v_class_types, 'active',   NOW()),
    (pg_temp.stable_uuid(v_gym || ':plan:legacy')::uuid,  v_gym_id, 'Legacy Off-Peak',  45,  'monthly', v_class_types, 'archived', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Assignable plans, the gym's pre-existing ones included, in a stable order.
  SELECT array_agg(id ORDER BY "createdAt", id)
    INTO v_plan_ids
    FROM membership_plans
   WHERE "gymId" = v_gym_id AND status = 'active';

  -- -------------------------------------------------------------- members ----
  FOR i IN 1..v_members LOOP
    v_user_id := pg_temp.stable_uuid(v_gym || ':member:' || i);
    v_ms_id   := pg_temp.stable_uuid(v_gym || ':membership:' || i);
    v_first   := v_firsts[1 + ((i - 1) % array_length(v_firsts, 1))];
    v_last    := v_lasts[1 + ((i * 7 - 1) % array_length(v_lasts, 1))];

    -- Defaults, overridden per band below.
    v_ms_status  := 'active';
    v_has_plan   := true;
    v_expires    := NULL;
    v_auto_roll  := true;
    v_roll_count := 0;

    -- Bands as fractions of v_members, so the spread survives any roster size.
    CASE
      -- No plan row at all → derives "expired" with an em-dash where the plan goes.
      WHEN i <= GREATEST(1, v_members / 8) THEN
        v_has_plan := false;

      -- Unlimited (NULL expiry) → always "active", nothing to roll.
      WHEN i <= GREATEST(2, v_members * 2 / 8) THEN
        v_expires    := NULL;
        v_roll_count := i % 5;

      -- Comfortably in the future → "active" with a date.
      WHEN i <= GREATEST(3, v_members * 5 / 8) THEN
        v_expires    := date_trunc('minute', NOW()) + ((15 + i) || ' days')::interval;
        v_roll_count := i % 9;

      -- Inside the seven-day warning window → "expiring".
      WHEN i <= GREATEST(4, v_members * 6 / 8) THEN
        v_expires    := date_trunc('minute', NOW()) + (((i % 7) + 1) || ' days')::interval;
        v_roll_count := i % 4;

      -- Lapsed with auto-renew OFF → "expired". Expired is expired.
      WHEN i <= GREATEST(5, v_members * 7 / 8) THEN
        v_expires    := date_trunc('minute', NOW()) - (((i % 40) + 2) || ' days')::interval;
        v_auto_roll  := false;
        v_roll_count := 3 + (i % 6);

      -- Suspended membership on top of a healthy plan → "inactive" outranks it.
      WHEN i <= v_members - 2 THEN
        v_ms_status  := 'inactive';
        v_expires    := date_trunc('minute', NOW()) + '60 days'::interval;
        v_roll_count := i % 3;

      -- Auto-renew ON, stored expiry just passed: the scheduler has not ticked
      -- yet, so the row still reads 'active' with a past date. Coverage is
      -- judged against the derived expiry, so these must read "active" and show
      -- a date one billing cycle out — NOT "expired". This is the case that
      -- regressed once and is invisible without seeded data.
      ELSE
        v_expires    := date_trunc('minute', NOW()) - '25 minutes'::interval;
        v_auto_roll  := true;
        v_roll_count := 11 + i;
    END CASE;

    -- The email carries the gym discriminator because users.email is globally
    -- unique: without it, populating a second gym in the same database collides
    -- on the email, skips the user, and then fails the membership foreign key.
    INSERT INTO users (id, email, "passwordHash", "socialLoginId", name, status, "createdAt")
    VALUES (v_user_id,
            'member' || lpad(i::text, 2, '0') || '@' || left(v_gym, 8) || '.testbox.local',
            v_pwd, NULL, v_first || ' ' || v_last, 'active',
            NOW() - ((v_members - i) || ' days')::interval)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
    VALUES (v_ms_id, v_gym_id, v_user_id, v_ms_status,
            NOW() - ((v_members - i) || ' days')::interval)
    ON CONFLICT (id) DO NOTHING;

    IF v_has_plan THEN
      -- Rotate through the assignable plans; the archived plan deliberately
      -- keeps two subscribers so a lapsed legacy plan is visible in the list.
      -- These two indices must sit outside the no-plan band (i <= members/8),
      -- or the archived plan silently ends up with nobody on it.
      IF i IN (12, 13) THEN
        v_plan_id := pg_temp.stable_uuid(v_gym || ':plan:legacy');
      ELSE
        v_plan_id := v_plan_ids[1 + ((i - 1) % array_length(v_plan_ids, 1))];
      END IF;

      -- The partial unique index allows at most one active row per membership,
      -- so skip any membership that already has one rather than colliding.
      INSERT INTO athlete_membership_plans
        (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt", "autoRoll", "autoRollCount")
      SELECT pg_temp.stable_uuid(v_gym || ':amp:' || i)::uuid, v_ms_id, v_plan_id, 'active',
             NOW() - ((v_members - i) || ' days')::interval, v_expires, v_auto_roll, v_roll_count
       WHERE NOT EXISTS (
         SELECT 1 FROM athlete_membership_plans
          WHERE "gymMembershipId" = v_ms_id AND status = 'active'
       )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'populated gym % with % members', v_gym_id, v_members;
END
$populate$;

\echo
\echo '=== derived membership status (what the owner list will show) ==='
SELECT
  CASE
    WHEN m.status = 'inactive'                      THEN 'inactive'
    WHEN p.id IS NULL                               THEN 'expired (no plan)'
    WHEN p."expiresAt" IS NULL                      THEN 'active (unlimited)'
    WHEN p."expiresAt" >  NOW() + INTERVAL '7 days' THEN 'active'
    WHEN p."expiresAt" >  NOW()                     THEN 'expiring'
    WHEN p."autoRoll"                               THEN 'active (derived - stale auto-roll row)'
    ELSE                                                 'expired'
  END AS shows_as,
  COUNT(*)
FROM gym_memberships m
LEFT JOIN athlete_membership_plans p
       ON p."gymMembershipId" = m.id AND p.status = 'active'
WHERE m."gymId" = :'gym_id'
GROUP BY 1
ORDER BY 2 DESC;

\echo '=== plans and their active subscriber counts ==='
SELECT mp.name, mp.pricing, mp."billingCycle", mp.status,
       COUNT(amp.id) FILTER (WHERE amp.status = 'active') AS subscribers
FROM membership_plans mp
LEFT JOIN athlete_membership_plans amp ON amp."membershipPlanId" = mp.id
WHERE mp."gymId" = :'gym_id'
GROUP BY mp.id, mp.name, mp.pricing, mp."billingCycle", mp.status
ORDER BY mp.status, mp.name;
