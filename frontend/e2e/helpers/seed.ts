/**
 * Per-journey fixtures.
 *
 * Every journey calls `seedGym()` and gets a gym nobody else touches: its own
 * owner, coach, athletes, spaces, class types and plans. That is what lets a
 * journey run alone, in any order, and eventually in parallel — and it mirrors
 * the product's own multi-tenant invariant, so a leak between fixtures is a
 * real bug rather than test noise.
 *
 * The suite this replaces used one global fixture, which is what forced its
 * ~20 conditional `test.skip()` calls: any journey that consumed the shared
 * class left the next one with nothing, so tests learned to skip themselves
 * instead of fail. Nothing here is shared, and nothing here is tolerant —
 * a seed that cannot complete throws.
 *
 * Users are created through the REST API so bcrypt hashing matches the real
 * auth flow (a hash written directly to SQL would not authenticate). Everything
 * else is written as SQL: preconditions must be cheap, and building them through
 * the UI would mean a broken create-class form failing all eleven journeys
 * instead of the one that tests it.
 */
import { randomUUID } from 'crypto';
import { Client } from 'pg';
import { E2E_API_URL, assertE2eDatabase, e2eDbConfig } from '../env';
import { bookableDay, type CalendarDay } from './dates';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SeededUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface SeededAthlete extends SeededUser {
  /** Row in `gym_memberships`. Needed to assign or expire a plan. */
  gymMembershipId: string;
}

export interface SeededPlan {
  id: string;
  name: string;
  classTypeIds: string[];
}

export interface SeededGym {
  id: string;
  name: string;
  owner: SeededUser;
  coach: SeededUser;
  /** Two athletes: journeys needing a second actor (waitlist, attendance) use `athletes[1]`. */
  athletes: SeededAthlete[];
  space: { id: string; name: string; capacity: number };
  classTypes: {
    /** Loggable, metric `time`. The default type for a seeded class. */
    crossfit: { id: string; name: string };
    /** Not loggable. Exists so a plan can deliberately EXCLUDE a type. */
    strength: { id: string; name: string };
  };
  plans: {
    /** Covers both class types. */
    unlimited: SeededPlan;
    /** Covers CrossFit only — the fixture for the visibility rule. */
    crossfitOnly: SeededPlan;
  };
}

export interface SeedClassOptions {
  gym: SeededGym;
  /** Defaults to a day far enough out that no cutoff has passed. */
  date?: CalendarDay;
  /** 24h `HH:MM:SS`. */
  time?: string;
  capacity?: number;
  state?: 'published' | 'booking_closed' | 'in_progress' | 'completed' | 'archived';
  /** Defaults to the CrossFit type. */
  classTypeId?: string;
  loggable?: boolean;
}

export interface SeededClass {
  id: string;
  date: CalendarDay;
  time: string;
  capacity: number;
}

// ── Database access ──────────────────────────────────────────────────────────

/**
 * Opens a connection to the e2e database, runs `fn`, and always closes.
 *
 * `assertE2eDatabase` runs before connecting: the guard has to sit on the path
 * every statement takes, not only on the truncate in global-setup, because an
 * INSERT into the dev database is just as unwelcome as a TRUNCATE.
 */
export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  assertE2eDatabase(e2eDbConfig.database);

  const client = new Client(e2eDbConfig);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// ── User registration ────────────────────────────────────────────────────────

/**
 * Registers a user through the API and returns their id from the JWT `sub`.
 *
 * Throws on any non-2xx. The predecessor logged a warning and continued, so a
 * backend that was not running produced a green suite full of skips.
 */
async function registerUser(name: string, email: string, password: string): Promise<SeededUser> {
  let res: Response;
  try {
    res = await fetch(`${E2E_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
  } catch (err) {
    throw new Error(
      `[seed] Could not reach the e2e API at ${E2E_API_URL} to register ${email}. ` +
        `Is the e2e backend up? (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `[seed] Registering ${email} failed: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { accessToken?: string };
  const id = body.accessToken ? userIdFromToken(body.accessToken) : undefined;
  if (!id) {
    throw new Error(`[seed] Register for ${email} returned no usable accessToken.`);
  }

  return { id, name, email, password };
}

/**
 * Registers a user who belongs to no gym yet.
 *
 * The invite journeys need exactly this: a real account, with a real password
 * they can log in with, that the gym does not know about. `seedGym` cannot
 * supply one — every user it makes is already staff or a member, which is the
 * state an invite exists to create.
 *
 * `label` distinguishes the user in the database and in a failure message
 * (`coach-<label>-<pid>-<n>@e2e.test`).
 */
export async function seedUser(label: string, displayName: string): Promise<SeededUser> {
  const suffix = uniqueSuffix(label);
  return registerUser(`${displayName} ${suffix}`, `${label}-${suffix}@e2e.test`, 'password123');
}

/** Decodes the `sub` claim from a JWT. The payload is the base64url middle segment. */
function userIdFromToken(token: string): string | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  try {
    return (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }).sub;
  } catch {
    return undefined;
  }
}

/**
 * Makes an email nobody else in the run will claim.
 *
 * `key` is the journey's own label, so a row in the database can be traced back
 * to the test that made it. The counter and pid keep two workers, and two
 * `seedGym()` calls in one spec, from colliding on the users table's unique
 * email — a collision would surface as a confusing 409 rather than as itself.
 */
let seedCounter = 0;
function uniqueSuffix(key: string): string {
  seedCounter += 1;
  return `${key}-${process.pid}-${seedCounter}`;
}

// ── The fixture ──────────────────────────────────────────────────────────────

/**
 * Creates a complete, self-contained gym and returns every id a journey needs.
 *
 * `key` labels the fixture's users (`owner-<key>@e2e.test`); pass the journey's
 * name. `athleteCount` defaults to 2 because the multi-actor journeys — waitlist
 * promotion, attendance gating — need a second athlete to act against.
 */
export async function seedGym(key: string, athleteCount = 2): Promise<SeededGym> {
  const suffix = uniqueSuffix(key);
  const password = 'password123';

  const owner = await registerUser(`Owner ${suffix}`, `owner-${suffix}@e2e.test`, password);
  const coach = await registerUser(`Coach ${suffix}`, `coach-${suffix}@e2e.test`, password);
  const athleteUsers: SeededUser[] = [];
  for (let i = 1; i <= athleteCount; i += 1) {
    athleteUsers.push(
      await registerUser(`Athlete ${i} ${suffix}`, `athlete${i}-${suffix}@e2e.test`, password),
    );
  }

  const gymId = randomUUID();
  const spaceId = randomUUID();
  const crossfitTypeId = randomUUID();
  const strengthTypeId = randomUUID();
  const unlimitedPlanId = randomUUID();
  const crossfitOnlyPlanId = randomUUID();
  const spaceCapacity = 20;

  const athletes: SeededAthlete[] = athleteUsers.map((u) => ({
    ...u,
    gymMembershipId: randomUUID(),
  }));

  await withDb(async (db) => {
    // `status` must be set explicitly: the column defaults to
    // 'pending_approval', and an unapproved gym is not a working fixture.
    await db.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
      [gymId, `Gym ${suffix}`, 'e2e fixture', 'Test Location', owner.id],
    );

    await db.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity") VALUES ($1, $2, $3, $4)`,
      [spaceId, gymId, 'Main Floor', spaceCapacity],
    );

    // CrossFit is loggable with a `time` metric so result-logging journeys have
    // a type that accepts a result. Strength is deliberately plain: it is the
    // type the crossfitOnly plan excludes.
    await db.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable) VALUES
         ($1, $3, 'CrossFit', 'time', true),
         ($2, $3, 'Strength', 'none', false)`,
      [crossfitTypeId, strengthTypeId, gymId],
    );

    // The owner needs a gym_staff row as well as gyms.ownerUserId: the staff
    // row is what the authorization chain reads.
    await db.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
         ($1, $3, $4, 'owner', 'active', NOW()),
         ($2, $3, $5, 'coach', 'active', NOW())`,
      [randomUUID(), randomUUID(), gymId, owner.id, coach.id],
    );

    // `classTypes` is a TypeORM simple-array: a comma-separated string in one
    // varchar, not a Postgres array.
    await db.query(
      `INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status) VALUES
         ($1, $3, 'Unlimited', 99, 'monthly', $4, 'active'),
         ($2, $3, 'CrossFit Only', 59, 'monthly', $5, 'active')`,
      [
        unlimitedPlanId,
        crossfitOnlyPlanId,
        gymId,
        `${crossfitTypeId},${strengthTypeId}`,
        crossfitTypeId,
      ],
    );

    for (const athlete of athletes) {
      await db.query(
        `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
         VALUES ($1, $2, $3, 'active', NOW())`,
        [athlete.gymMembershipId, gymId, athlete.id],
      );
    }
  });

  const gym: SeededGym = {
    id: gymId,
    name: `Gym ${suffix}`,
    owner,
    coach,
    athletes,
    space: { id: spaceId, name: 'Main Floor', capacity: spaceCapacity },
    classTypes: {
      crossfit: { id: crossfitTypeId, name: 'CrossFit' },
      strength: { id: strengthTypeId, name: 'Strength' },
    },
    plans: {
      unlimited: {
        id: unlimitedPlanId,
        name: 'Unlimited',
        classTypeIds: [crossfitTypeId, strengthTypeId],
      },
      crossfitOnly: {
        id: crossfitOnlyPlanId,
        name: 'CrossFit Only',
        classTypeIds: [crossfitTypeId],
      },
    },
  };

  // Athletes start on the plan that covers everything. A journey testing the
  // visibility rule reassigns; every other journey wants a working athlete.
  for (const athlete of athletes) {
    await assignPlan(athlete, gym.plans.unlimited);
  }

  return gym;
}

// ── Fixture mutators ─────────────────────────────────────────────────────────

/**
 * Puts an athlete on a plan, expiring whatever they were on.
 *
 * The expire-then-insert order is required, not tidiness: a partial unique index
 * (`IDX_athlete_membership_plans_one_active`) allows only one active row per
 * membership, so inserting first would violate it.
 *
 * `expiresAt` defaults to a month out. It is a real timestamp column here, so
 * unlike a class's `scheduledDate` an instant is the correct shape.
 */
export async function assignPlan(
  athlete: SeededAthlete,
  plan: SeededPlan,
  expiresAt: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
): Promise<void> {
  await withDb(async (db) => {
    await db.query(
      `UPDATE athlete_membership_plans SET status = 'expired'
       WHERE "gymMembershipId" = $1 AND status = 'active'`,
      [athlete.gymMembershipId],
    );
    await db.query(
      `INSERT INTO athlete_membership_plans
         (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt", "autoRoll", "autoRollCount")
       VALUES ($1, $2, $3, 'active', NOW(), $4, true, 0)`,
      [randomUUID(), athlete.gymMembershipId, plan.id, expiresAt],
    );
  });
}

/**
 * Moves an athlete's active plan expiry, keeping the row active.
 *
 * Used to build the expired-plan precondition. The row stays `status='active'`
 * on purpose: the product decides access from the DATE, and a test that also
 * flipped the status would pass even if the date check were deleted.
 */
export async function setPlanExpiry(athlete: SeededAthlete, expiresAt: Date): Promise<void> {
  await updateActivePlan(athlete, `SET "expiresAt" = $2`, [expiresAt]);
}

/**
 * Turns auto-renew on or off for an athlete's active plan.
 *
 * Required to express "expired", not a convenience. `seedGym` gives every athlete
 * an auto-roll plan, and both read guards judge a request against
 * `effectiveExpiresAt`, which rolls a lapsed auto-roll plan forward whole billing
 * cycles (so a paying member is not locked out between scheduler ticks). An
 * auto-roll plan that lapsed is therefore still covered by design, and
 * `setPlanExpiry` alone cannot make an athlete expired.
 */
export async function setPlanAutoRoll(athlete: SeededAthlete, autoRoll: boolean): Promise<void> {
  await updateActivePlan(athlete, `SET "autoRoll" = $2`, [autoRoll]);
}

/**
 * Applies a SET clause to the athlete's ONE active plan, or throws.
 *
 * The row count is checked rather than trusted: a partial unique index allows a
 * single active row per membership, so anything other than 1 means the fixture is
 * not what the caller thinks — which must fail here rather than three assertions
 * later. `$1` is always the membership id; extra params start at `$2`.
 */
async function updateActivePlan(
  athlete: SeededAthlete,
  setClause: string,
  params: unknown[],
): Promise<void> {
  await withDb(async (db) => {
    const res = await db.query(
      `UPDATE athlete_membership_plans ${setClause}
       WHERE "gymMembershipId" = $1 AND status = 'active'`,
      [athlete.gymMembershipId, ...params],
    );
    if (res.rowCount !== 1) {
      throw new Error(
        `[seed] Expected exactly one active plan for membership ${athlete.gymMembershipId}, updated ${res.rowCount}.`,
      );
    }
  });
}

/** Creates a class in the gym. Defaults to a published, bookable CrossFit class. */
export async function seedClass(options: SeedClassOptions): Promise<SeededClass> {
  const {
    gym,
    date = bookableDay(),
    time = '09:00:00',
    capacity = 20,
    state = 'published',
    classTypeId = gym.classTypes.crossfit.id,
    loggable = true,
  } = options;

  const id = randomUUID();

  await withDb(async (db) => {
    // `date` is passed as a bare 'YYYY-MM-DD' string and reaches a
    // @Column('date'). Never hand this a Date: node-postgres would serialise it
    // through the machine's local zone, which is the write-side seam fixed in
    // 8829f75 — a Friday class stored as Thursday.
    await db.query(
      `INSERT INTO classes
         (id, "gymId", "classTypeId", "coachUserId", "spaceId", "scheduledDate",
          "scheduledTime", capacity, duration, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 60, $9, $10, NOW(), NOW())`,
      [id, gym.id, classTypeId, gym.coach.id, gym.space.id, date, time, capacity, state, loggable],
    );
  });

  return { id, date, time, capacity };
}

/**
 * Books an athlete into a class directly, bypassing the UI.
 *
 * For preconditions only — "someone else already took the last spot". A journey
 * asserting that BOOKING works must click through the app instead.
 */
export async function seedBooking(
  cls: SeededClass,
  athlete: SeededAthlete,
  status: 'booked' | 'waitlisted' = 'booked',
  bookedPosition = 1,
): Promise<string> {
  const id = randomUUID();
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO bookings (id, "classId", "userId", status, "bookedPosition", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, cls.id, athlete.id, status, bookedPosition],
    );
  });
  return id;
}

// ── Fixture readers ──────────────────────────────────────────────────────────

/**
 * Counts bookings on a class by status.
 *
 * A last-resort assertion: prefer asserting what the actor SEES. Use this only
 * where the UI does not surface the number, so the alternative is asserting
 * nothing.
 */
export async function countBookings(
  cls: SeededClass,
  status: 'booked' | 'waitlisted' | 'cancelled' = 'booked',
): Promise<number> {
  return withDb(async (db) => {
    const res = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM bookings WHERE "classId" = $1 AND status = $2`,
      [cls.id, status],
    );
    return Number(res.rows[0].count);
  });
}

/**
 * The athlete's single active plan row, as stored.
 *
 * A database read, and like `countBookings` a last resort: prefer asserting what
 * the actor sees. It exists because the auto-renew toggle carries its state only
 * in its own styling, so after a reload there is nothing on screen to check a
 * persisted `autoRoll` against.
 *
 * `expiresAt` comes back as the bare calendar day (`to_char`) so a caller never
 * re-parses a timestamp through the machine's zone to name a day.
 */
export async function readActivePlan(athlete: SeededAthlete): Promise<{
  membershipPlanId: string;
  autoRoll: boolean;
  expiresDay: string | null;
}> {
  return withDb(async (db) => {
    const res = await db.query<{
      membershipPlanId: string;
      autoRoll: boolean;
      expiresDay: string | null;
    }>(
      `SELECT "membershipPlanId", "autoRoll", to_char("expiresAt", 'YYYY-MM-DD') AS "expiresDay"
       FROM athlete_membership_plans
       WHERE "gymMembershipId" = $1 AND status = 'active'`,
      [athlete.gymMembershipId],
    );
    if (res.rowCount !== 1) {
      throw new Error(
        `[seed] Expected exactly one active plan for membership ${athlete.gymMembershipId}, found ${res.rowCount}.`,
      );
    }
    return res.rows[0];
  });
}

/** Reads a class's stored `scheduledDate` as the bare day Postgres holds. */
export async function readStoredClassDate(cls: SeededClass): Promise<string> {
  return withDb(async (db) => {
    const res = await db.query<{ day: string }>(
      `SELECT to_char("scheduledDate", 'YYYY-MM-DD') AS day FROM classes WHERE id = $1`,
      [cls.id],
    );
    if (res.rowCount !== 1) throw new Error(`[seed] No class ${cls.id}.`);
    return res.rows[0].day;
  });
}

/**
 * Finds the single class the gym has, by date, and fails loudly otherwise.
 *
 * For journeys where the OWNER creates the class through the UI and the test
 * then needs its id. `to_char` keeps the comparison on the calendar day rather
 * than re-parsing into an instant.
 */
export async function findClassByDate(gym: SeededGym, date: CalendarDay): Promise<SeededClass> {
  return withDb(async (db) => {
    const res = await db.query<{
      id: string;
      day: string;
      time: string;
      capacity: number;
    }>(
      `SELECT id, to_char("scheduledDate", 'YYYY-MM-DD') AS day, "scheduledTime" AS time, capacity
       FROM classes WHERE "gymId" = $1 AND "scheduledDate" = $2 AND "deletedAt" IS NULL`,
      [gym.id, date],
    );

    if (res.rowCount !== 1) {
      const all = await db.query<{ day: string }>(
        `SELECT to_char("scheduledDate", 'YYYY-MM-DD') AS day FROM classes WHERE "gymId" = $1`,
        [gym.id],
      );
      throw new Error(
        `[seed] Expected exactly one class on ${date} in gym ${gym.id}, found ${res.rowCount}. ` +
          `Classes present: ${all.rows.map((r) => r.day).join(', ') || '(none)'}. ` +
          `A class stored on the day either side of ${date} is the date seam, not a flake.`,
      );
    }

    const row = res.rows[0];
    return { id: row.id, date: row.day, time: row.time, capacity: row.capacity };
  });
}
