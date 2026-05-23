import { Client } from 'pg';
import { randomUUID } from 'crypto';

const uuidv4 = () => randomUUID();

/**
 * Playwright globalSetup hook.
 *
 * Resets the test database by truncating all application tables (cascade)
 * and re-seeding a complete, deterministic dataset for the E2E suite:
 *
 *   Gym:          "Test Gym"
 *   Space:        "Main Floor" (capacity 20)
 *   Class types:  "CrossFit" (loggable, resultMetrics: time)
 *                 "Strength" (not loggable)
 *   Users:        owner@example.com  / password123  (gym owner + staff)
 *                 coach@example.com  / password123  (gym coach + staff)
 *                 athlete@example.com / password123 (gym member)
 *   Classes:      3 published classes this week assigned to the coach
 *                 1 completed class with attendance + result for athlete
 *   Booking:      athlete booked into the first published class
 *
 * The seed is idempotent: truncation runs before every insert,
 * so multiple runs always produce an identical clean state.
 *
 * Passwords are created via the backend REST API so bcrypt hashing
 * stays consistent with the application auth flow.
 */
async function dbReset(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'crossfit_box_dev',
  });

  let dbConnected = false;

  try {
    await client.connect();
    dbConnected = true;

    // Truncate all tables that hold application data (cascade clears FKs).
    // Table names match the @Entity() decorators in the backend domain layer.
    await client.query(`
      TRUNCATE TABLE
        results,
        attendance,
        programming,
        bookings,
        athlete_membership_plans,
        gym_memberships,
        membership_plans,
        invites,
        gym_staff,
        classes,
        spaces,
        class_types,
        gyms,
        users
      RESTART IDENTITY CASCADE
    `);

    console.log('[db-reset] Database truncated successfully.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[db-reset] Could not connect to database — skipping reset. (${message})`,
    );
  }

  // ── Step 1: Re-seed user accounts via the backend REST API ──────────────
  // Passwords are hashed by the backend; seeding through the API keeps
  // the hash algorithm consistent with what loginAs() authenticates against.

  const BACKEND_URL = 'http://localhost:3000';

  const TEST_USERS: Array<{ name: string; email: string; password: string }> = [
    { name: 'Test Owner',    email: 'owner@example.com',    password: 'password123' },
    { name: 'Test Coach',    email: 'coach@example.com',    password: 'password123' },
    { name: 'Test Athlete',  email: 'athlete@example.com',  password: 'password123' },
    { name: 'Test Athlete2', email: 'athlete2@example.com', password: 'password123' },
  ];

  const userIds: Record<string, string> = {};

  for (const user of TEST_USERS) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        const body = (await res.json()) as { id?: string };
        if (body.id) {
          userIds[user.email] = body.id;
        }
      } else if (res.status !== 409) {
        const body = await res.text();
        console.warn(
          `[db-reset] Could not seed user ${user.email}: ${res.status} ${body}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[db-reset] Backend not reachable — skipping seed for ${user.email}. (${message})`,
      );
    }
  }

  // ── Step 2: Seed the remaining fixture data directly via SQL ────────────
  // This requires a DB connection and at least the three user IDs returned
  // from the registration step.

  if (!dbConnected) {
    console.warn('[db-reset] No DB connection — skipping fixture seed.');
    return;
  }

  const ownerId    = userIds['owner@example.com'];
  const coachId    = userIds['coach@example.com'];
  const athleteId  = userIds['athlete@example.com'];
  const athlete2Id = userIds['athlete2@example.com'];

  if (!ownerId || !coachId || !athleteId || !athlete2Id) {
    console.warn(
      '[db-reset] One or more user IDs are missing — skipping fixture seed.',
    );
    await client.end();
    return;
  }

  try {
    const gymId             = uuidv4();
    const spaceId           = uuidv4();
    const crossfitTypeId    = uuidv4();
    const strengthTypeId    = uuidv4();
    const membershipPlanId  = uuidv4();
    const gymMembershipId   = uuidv4();
    const ampId             = uuidv4();

    // athlete2 membership UUIDs
    const gymMembershipId2  = uuidv4();
    const ampId2            = uuidv4();

    // Class IDs for the current week (published) + one completed class
    const publishedClassId1 = uuidv4();
    const publishedClassId2 = uuidv4();
    const publishedClassId3 = uuidv4();
    const completedClassId  = uuidv4();

    // Capacity-1 class for waitlist promotion scenario (Thursday of current week)
    const capacityOneClassId = uuidv4();

    const bookingId          = uuidv4();
    const capacityOneBookingId = uuidv4();
    const attendanceId       = uuidv4();
    const resultId           = uuidv4();

    // ── Gym ──────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [gymId, 'Test Gym', 'E2E test gym', 'Test Location', ownerId, 'active'],
    );

    // ── Space ─────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, $3, $4)`,
      [spaceId, gymId, 'Main Floor', 20],
    );

    // ── Class types ───────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable) VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10)`,
      [
        crossfitTypeId, gymId, 'CrossFit',  'time', true,
        strengthTypeId, gymId, 'Strength',  'none', false,
      ],
    );

    // ── Gym staff: owner + coach ──────────────────────────────────────────
    await client.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
         ($1, $2, $3, $4, $5, NOW()),
         ($6, $7, $8, $9, $10, NOW())`,
      [
        uuidv4(), gymId, ownerId,  'owner', 'active',
        uuidv4(), gymId, coachId,  'coach', 'active',
      ],
    );

    // ── Athlete membership ────────────────────────────────────────────────
    await client.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [gymMembershipId, gymId, athleteId, 'active'],
    );

    // ── Membership plan covering both class types ─────────────────────────
    // TypeORM simple-array stores multiple values as a comma-separated string.
    const classTypesCsv = `${crossfitTypeId},${strengthTypeId}`;
    await client.query(
      `INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [membershipPlanId, gymId, 'Unlimited', 99, 'monthly', classTypesCsv, 'active'],
    );

    // ── Link athlete to plan ──────────────────────────────────────────────
    await client.query(
      `INSERT INTO athlete_membership_plans (id, "gymMembershipId", "membershipPlanId", status, "startedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [ampId, gymMembershipId, membershipPlanId, 'active'],
    );

    // ── Athlete2 membership ───────────────────────────────────────────────
    await client.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [gymMembershipId2, gymId, athlete2Id, 'active'],
    );

    // ── Link athlete2 to the same plan ────────────────────────────────────
    await client.query(
      `INSERT INTO athlete_membership_plans (id, "gymMembershipId", "membershipPlanId", status, "startedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [ampId2, gymMembershipId2, membershipPlanId, 'active'],
    );

    // ── Published classes spread across the current week ─────────────────
    // Monday, Wednesday, Friday of the current ISO week at 09:00
    const monday    = getMondayOfCurrentWeek();
    const wednesday = addDays(monday, 2);
    const friday    = addDays(monday, 4);

    await client.query(
      `INSERT INTO classes
         (id, "gymId", "classTypeId", "coachUserId", "spaceId",
          "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES
         ($1,  $2, $3,  $4, $5,  $6,  '09:00:00', 20, 'published', true,  NOW(), NOW()),
         ($7,  $2, $3,  $4, $5,  $8,  '09:00:00', 20, 'published', false, NOW(), NOW()),
         ($9,  $2, $10, $4, $5,  $11, '09:00:00', 20, 'published', false, NOW(), NOW())`,
      [
        publishedClassId1, gymId, crossfitTypeId, coachId, spaceId, monday,
        publishedClassId2, gymId, crossfitTypeId, coachId, spaceId, wednesday,
        publishedClassId3, gymId, strengthTypeId, coachId, spaceId, friday,
      ],
    );

    // ── Completed class (last Monday, so clearly in the past) ─────────────
    const lastMonday = addDays(monday, -7);
    await client.query(
      `INSERT INTO classes
         (id, "gymId", "classTypeId", "coachUserId", "spaceId",
          "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, '09:00:00', 20, 'completed', true, NOW(), NOW())`,
      [completedClassId, gymId, crossfitTypeId, coachId, spaceId, lastMonday],
    );

    // ── Capacity-1 class: Thursday of current week ───────────────────────
    // Used for waitlist promotion scenario: athlete books in, athlete2 joins
    // waitlist, athlete cancels, athlete2 is promoted.
    const thursday = addDays(monday, 3);
    await client.query(
      `INSERT INTO classes
         (id, "gymId", "classTypeId", "coachUserId", "spaceId",
          "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, '10:00:00', 1, 'published', false, NOW(), NOW())`,
      [capacityOneClassId, gymId, crossfitTypeId, coachId, spaceId, thursday],
    );

    // ── Booking: athlete into first published class ───────────────────────
    await client.query(
      `INSERT INTO bookings (id, "classId", "userId", status, "bookedPosition", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [bookingId, publishedClassId1, athleteId, 'booked', 1],
    );

    // ── Booking: athlete into the capacity-1 class ────────────────────────
    await client.query(
      `INSERT INTO bookings (id, "classId", "userId", status, "bookedPosition", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [capacityOneBookingId, capacityOneClassId, athleteId, 'booked', 1],
    );

    // ── Attendance: athlete present in the completed class ────────────────
    await client.query(
      `INSERT INTO attendance (id, "classId", "userId", present, "markedAt", "markedByUserId", notes)
       VALUES ($1, $2, $3, $4, NOW(), $5, NULL)`,
      [attendanceId, completedClassId, athleteId, true, coachId],
    );

    // ── Result: athlete result for the completed class ────────────────────
    await client.query(
      `INSERT INTO results (id, "classId", "userId", "gymId", "metricType", value, unit, notes, "loggedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NOW())`,
      [resultId, completedClassId, athleteId, gymId, 'time', '300', 'seconds'],
    );

    console.log('[db-reset] Fixture seed complete.');
    console.log(`[db-reset]   gymId:              ${gymId}`);
    console.log(`[db-reset]   spaceId:            ${spaceId}`);
    console.log(`[db-reset]   crossfitTypeId:     ${crossfitTypeId}`);
    console.log(`[db-reset]   strengthTypeId:     ${strengthTypeId}`);
    console.log(`[db-reset]   publishedClass1:    ${publishedClassId1} (${toDateStr(monday)})`);
    console.log(`[db-reset]   publishedClass2:    ${publishedClassId2} (${toDateStr(wednesday)})`);
    console.log(`[db-reset]   publishedClass3:    ${publishedClassId3} (${toDateStr(friday)})`);
    console.log(`[db-reset]   completedClass:     ${completedClassId} (${toDateStr(lastMonday)})`);
    console.log(`[db-reset]   capacityOneClass:   ${capacityOneClassId} (${toDateStr(thursday)}, capacity 1)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[db-reset] Fixture seed failed: ${message}`);
  } finally {
    await client.end();
  }
}

// ── Date helpers ────────────────────────────────────────────────────────────

/** Returns the Monday (ISO week start) of the current week as a Date. */
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, …
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Returns a new Date offset by `days` days from `base`. */
function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setUTCDate(base.getUTCDate() + days);
  return result;
}

/** Formats a Date as a YYYY-MM-DD string (UTC). */
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default dbReset;
