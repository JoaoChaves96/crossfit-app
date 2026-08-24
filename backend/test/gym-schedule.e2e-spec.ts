import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * Gym Owner Schedule E2E Tests
 *
 * Endpoint: GET /api/gyms/:gymId/schedule
 * Auth: signed JWT — `sub` (actor), `gymId` (gym context), `role`
 * Role required: owner (gym_staff row with role='owner' for the gym)
 *
 * Success response (200):
 * {
 *   classes: [
 *     {
 *       id:             string
 *       classTypeId:    string
 *       classTypeName:  string
 *       scheduledDate:  string (YYYY-MM-DD)
 *       scheduledTime:  string (HH:mm:ss)
 *       coachName:      string
 *       capacity:       number
 *       bookedCount:    number
 *       state:          string
 *     }
 *   ]
 * }
 *
 * Test coverage:
 * 1. Owner can retrieve all published classes (no membership filtering)
 * 2. Non-owner (athlete) is rejected with 403
 * 3. Non-owner (coach) is rejected with 403
 * 4. Optional startDate/endDate narrow the schedule, inclusively, in real SQL
 */
describe('Gym Owner Schedule (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const coachUserId = uuidv4();
  const athleteUserId = uuidv4();
  const spaceId = uuidv4();
  const classTypeId = uuidv4();
  let classId: string;

  /**
   * Fixed calendar days for the date-range cases, far enough out that no other
   * fixture and no clock-derived date can land inside the window. Hard-coded
   * rather than computed from `new Date()`: the window under test is a calendar
   * range, and deriving it from an instant is the exact confusion these cases
   * exist to catch.
   *
   * The window asserted below is 2099-03-10 .. 2099-03-16 inclusive.
   */
  const RANGE_DAYS = {
    dayBefore: '2099-03-09',
    startEdge: '2099-03-10',
    middle: '2099-03-13',
    endEdge: '2099-03-16',
    dayAfter: '2099-03-17',
  } as const;
  const rangeClassIds: Record<keyof typeof RANGE_DAYS, string> = {
    dayBefore: uuidv4(),
    startEdge: uuidv4(),
    middle: uuidv4(),
    endEdge: uuidv4(),
    dayAfter: uuidv4(),
  };

  // JWTs for each actor
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@gym-schedule.test',
    gymId,
    role: 'owner',
  });
  const coachToken = generateTestToken({
    id: coachUserId,
    email: 'coach@gym-schedule.test',
    gymId,
    role: 'coach',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@gym-schedule.test',
    gymId,
    role: 'athlete',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);
    if (dataSource && dataSource.isInitialized) {
      await setupTestData();
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  async function setupTestData() {
    if (!dataSource) throw new Error('DataSource not initialized');

    // 1. Create users: owner, coach, athlete
    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1, $2, 'Schedule Test Owner',   'active', NOW()),
        ($3, $4, 'Schedule Test Coach',   'active', NOW()),
        ($5, $6, 'Schedule Test Athlete', 'active', NOW())`,
      [
        ownerUserId,
        `schedule-owner-${uuidv4()}@test.local`,
        coachUserId,
        `schedule-coach-${uuidv4()}@test.local`,
        athleteUserId,
        `schedule-athlete-${uuidv4()}@test.local`,
      ],
    );

    // 2. Create gym
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        gymId,
        'Schedule Test Gym',
        'Owner schedule test gym',
        'Lisbon',
        ownerUserId,
        'active',
      ],
    );

    // 3. Create gym_staff: owner
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
    );

    // 4. Create gym_staff: coach
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, coachUserId, 'coach', 'active'],
    );

    // 5. Create gym_membership: athlete
    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), gymId, athleteUserId, 'active'],
    );

    // 6. Create space
    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, $3, $4)`,
      [spaceId, gymId, 'Main Box', 20],
    );

    // 7. Create class type
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, $3, $4, $5)`,
      [classTypeId, gymId, 'CrossFit WOD', 'none', true],
    );

    // 8. Create a published class
    classId = uuidv4();
    const scheduledDate = new Date();
    scheduledDate.setFullYear(scheduledDate.getFullYear() + 1);
    const dateStr = scheduledDate.toISOString().split('T')[0];

    await dataSource.query(
      `INSERT INTO classes (
        id, "gymId", "classTypeId", "coachUserId", "spaceId",
        "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        classId,
        gymId,
        classTypeId,
        coachUserId,
        spaceId,
        dateStr,
        '09:00:00',
        15,
        'published',
        true,
      ],
    );

    // 9. Five classes straddling the date-range window under test
    for (const key of Object.keys(RANGE_DAYS) as (keyof typeof RANGE_DAYS)[]) {
      await dataSource.query(
        `INSERT INTO classes (
          id, "gymId", "classTypeId", "coachUserId", "spaceId",
          "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          rangeClassIds[key],
          gymId,
          classTypeId,
          coachUserId,
          spaceId,
          RANGE_DAYS[key],
          '10:00:00',
          15,
          'published',
          true,
        ],
      );
    }
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      await dataSource.query('DELETE FROM classes WHERE "gymId" = $1', [gymId]);
      await dataSource.query('DELETE FROM class_types WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query('DELETE FROM spaces WHERE "gymId" = $1', [gymId]);
      await dataSource.query('DELETE FROM gym_memberships WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query('DELETE FROM gym_staff WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
        ownerUserId,
        coachUserId,
        athleteUserId,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Owner retrieves all classes without membership filtering
  // ---------------------------------------------------------------------------
  describe('Test 1: Owner can view all classes in the schedule', () => {
    it('GET /api/gyms/:gymId/schedule → 200 with all classes', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('classes');
      const classes = body.classes as Record<string, unknown>[];
      expect(Array.isArray(classes)).toBe(true);
      expect(classes.length).toBeGreaterThanOrEqual(1);

      const found = classes.find((c) => c.id === classId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('classTypeId', classTypeId);
      expect(found).toHaveProperty('scheduledTime');
      expect(found).toHaveProperty('capacity', 15);
      expect(found).toHaveProperty('bookedCount', 0);
      expect(found).toHaveProperty('state', 'published');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Non-owner (athlete) is rejected with 403
  // ---------------------------------------------------------------------------
  describe('Test 2: Athlete is rejected with 403', () => {
    it('GET /api/gyms/:gymId/schedule as athlete → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Non-owner (coach) is rejected with 403
  // ---------------------------------------------------------------------------
  describe('Test 3: Coach is rejected with 403', () => {
    it('GET /api/gyms/:gymId/schedule as coach → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: startDate / endDate narrow the schedule
  // ---------------------------------------------------------------------------
  describe('Test 4: date range', () => {
    /** The ids returned for a given query string, in response order. */
    async function scheduleIds(query = ''): Promise<string[]> {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule${query}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const classes = (response.body as { classes: { id: string }[] }).classes;
      return classes.map((cls) => cls.id);
    }

    it('returns both edge days and excludes the days either side', async () => {
      const ids = await scheduleIds(
        `?startDate=${RANGE_DAYS.startEdge}&endDate=${RANGE_DAYS.endEdge}`,
      );

      // Inclusive on BOTH ends — the owner's visible week depends on it.
      expect(ids).toContain(rangeClassIds.startEdge);
      expect(ids).toContain(rangeClassIds.middle);
      expect(ids).toContain(rangeClassIds.endEdge);

      expect(ids).not.toContain(rangeClassIds.dayBefore);
      expect(ids).not.toContain(rangeClassIds.dayAfter);
      // The clock-derived fixture class from Test 1 is a year out, not in 2099.
      expect(ids).not.toContain(classId);
      expect(ids).toHaveLength(3);
    });

    it('bounds only the lower end when given startDate alone', async () => {
      // The original complaint: startDate was accepted and silently ignored.
      const ids = await scheduleIds(`?startDate=${RANGE_DAYS.middle}`);

      expect(ids).toContain(rangeClassIds.middle);
      expect(ids).toContain(rangeClassIds.endEdge);
      expect(ids).toContain(rangeClassIds.dayAfter);

      expect(ids).not.toContain(rangeClassIds.dayBefore);
      expect(ids).not.toContain(rangeClassIds.startEdge);
      expect(ids).not.toContain(classId);
    });

    it('bounds only the upper end when given endDate alone', async () => {
      const ids = await scheduleIds(`?endDate=${RANGE_DAYS.middle}`);

      expect(ids).toContain(rangeClassIds.dayBefore);
      expect(ids).toContain(rangeClassIds.startEdge);
      expect(ids).toContain(rangeClassIds.middle);
      // The Test 1 class is a year from now, so it is below the 2099 ceiling.
      expect(ids).toContain(classId);

      expect(ids).not.toContain(rangeClassIds.endEdge);
      expect(ids).not.toContain(rangeClassIds.dayAfter);
    });

    it('returns the whole schedule when neither bound is given', async () => {
      const ids = await scheduleIds();

      // Back-compatibility: the unbounded call is unchanged by the range work.
      expect(ids).toContain(classId);
      for (const id of Object.values(rangeClassIds)) {
        expect(ids).toContain(id);
      }
    });

    it('returns an empty schedule for a window with no classes', async () => {
      const ids = await scheduleIds('?startDate=2099-06-01&endDate=2099-06-07');

      expect(ids).toEqual([]);
    });

    it('rejects a malformed date instead of ignoring it', async () => {
      // The whole point of the card: an unparsed param used to be dropped
      // silently. A caller who misspells the parameter's VALUE must be told.
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule?startDate=banana`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule?endDate=2099-3-1`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule?startDate=2099-03-10T00:00:00.000Z`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('rejects a well-formed but non-existent calendar day', async () => {
      // Must be a 400, NOT a 500: a day like this reaching Postgres raises on
      // the cast to `date`.
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule?startDate=2099-99-99`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/schedule?endDate=2099-02-30`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('rejects an inverted range rather than answering with nothing', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/gyms/${gymId}/schedule?startDate=${RANGE_DAYS.endEdge}&endDate=${RANGE_DAYS.startEdge}`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('still refuses a non-owner who supplies a valid range', async () => {
      // Authorization is not weakened by the new parameters.
      await request(app.getHttpServer())
        .get(
          `/api/gyms/${gymId}/schedule?startDate=${RANGE_DAYS.startEdge}&endDate=${RANGE_DAYS.endEdge}`,
        )
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });
});
