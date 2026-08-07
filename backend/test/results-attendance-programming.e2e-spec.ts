import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Results, Attendance, and Programming E2E Tests
 *
 * Endpoints covered:
 * - POST /api/gyms/:gymId/classes/:classId/results       (log result)
 * - PATCH /api/gyms/:gymId/results/:resultId             (edit result)
 * - GET  /api/gyms/:gymId/classes/:classId/results       (view results)
 * - POST /api/gyms/:gymId/classes/:classId/toggle-loggable
 * - POST /api/gyms/:gymId/classes/:classId/attendance    (mark attendance)
 * - GET  /api/gyms/:gymId/classes/:classId/programming
 * - POST /api/gyms/:gymId/classes/:classId/programming
 *
 * Test guards checked per endpoint:
 * - Happy path: correct role, correct gymId, valid state → 200/201
 * - No auth token → 401
 * - Wrong role → 403
 * - gymId mismatch (JWT gym ≠ route gym) → 403
 * - Invalid state where applicable → 400
 */
describe('Results, Attendance, and Programming (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Shared IDs
  const gymId = uuidv4();
  const otherGymId = uuidv4();
  const ownerUserId = uuidv4();
  const coachUserId = uuidv4();
  const athleteUserId = uuidv4();
  const otherGymOwnerUserId = uuidv4();
  const otherCoachUserId = uuidv4();
  const spaceId = uuidv4();

  // classTypeId with resultMetrics='time' so results can be logged
  const classTypeId = uuidv4();

  // Class IDs seeded in specific lifecycle states
  let publishedClassId: string;       // state = 'published'   — for toggle-loggable, programming
  let inProgressClassId: string;      // state = 'in_progress' — for attendance
  let completedClassId: string;       // state = 'completed'   — for log result
  let otherCoachClassId: string;      // state = 'published', assigned to a different coach

  // IDs created during tests (for edit result)
  let loggedResultId: string;

  // Tokens
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@results-test.local',
    gymId,
    role: 'owner',
  });
  const coachToken = generateTestToken({
    id: coachUserId,
    email: 'coach@results-test.local',
    gymId,
    role: 'coach',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@results-test.local',
    gymId,
    role: 'athlete',
  });
  // Token whose gymId does not match the route gymId
  const wrongGymToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@results-test.local',
    gymId: otherGymId,
    role: 'owner',
  });

  // -------------------------------------------------------------------------
  // App lifecycle
  // -------------------------------------------------------------------------

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

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

  // -------------------------------------------------------------------------
  // Seed data
  // -------------------------------------------------------------------------

  async function setupTestData() {
    if (!dataSource) throw new Error('DataSource not initialized');

    // Users
    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1,  $2,  'Test Owner',       'active', NOW()),
        ($3,  $4,  'Test Coach',       'active', NOW()),
        ($5,  $6,  'Test Athlete',     'active', NOW()),
        ($7,  $8,  'Other Gym Owner',  'active', NOW()),
        ($9,  $10, 'Other Coach',      'active', NOW())`,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        coachUserId,
        `coach-${uuidv4()}@test.local`,
        athleteUserId,
        `athlete-${uuidv4()}@test.local`,
        otherGymOwnerUserId,
        `other-owner-${uuidv4()}@test.local`,
        otherCoachUserId,
        `other-coach-${uuidv4()}@test.local`,
      ],
    );

    // Primary gym
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [gymId, 'Results Test Gym', 'Gym for results tests', 'Lisbon', ownerUserId, 'active'],
    );

    // Other gym (for cross-gym / gymId-mismatch tests)
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [otherGymId, 'Other Gym', 'Cross-gym isolation', 'Porto', otherGymOwnerUserId, 'active'],
    );

    // Staff: owner + coach in primary gym
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
        ($1, $2, $3, $4, $5, NOW()),
        ($6, $7, $8, $9, $10, NOW())`,
      [
        uuidv4(), gymId, ownerUserId, 'owner', 'active',
        uuidv4(), gymId, coachUserId, 'coach', 'active',
      ],
    );

    // Staff: a second coach in the primary gym (for not-assigned-coach tests)
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, otherCoachUserId, 'coach', 'active'],
    );

    // Staff: owner in other gym (so wrongGymToken passes RolesGuard on other-gym routes)
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), otherGymId, otherGymOwnerUserId, 'owner', 'active'],
    );

    // Athlete membership
    const gymMembershipId = uuidv4();
    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [gymMembershipId, gymId, athleteUserId, 'active'],
    );

    // Space
    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, $3, $4)`,
      [spaceId, gymId, 'Main Box', 20],
    );

    // ClassType with resultMetrics='time' and loggable=true so we can log results
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, $3, $4, $5)`,
      [classTypeId, gymId, 'CrossFit WOD', 'time', true],
    );

    const baseDate = '2025-01-10';
    const baseTime = '09:00:00';

    // Class in 'published' state — for toggle-loggable and programming tests
    publishedClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (id, "gymId", "classTypeId", "coachUserId", "spaceId",
         "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [publishedClassId, gymId, classTypeId, coachUserId, spaceId, baseDate, baseTime, 20, 'published', true],
    );

    // Class in 'published' state assigned to a DIFFERENT coach
    otherCoachClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (id, "gymId", "classTypeId", "coachUserId", "spaceId",
         "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [otherCoachClassId, gymId, classTypeId, otherCoachUserId, spaceId, baseDate, '18:00:00', 20, 'published', true],
    );

    // Class in 'in_progress' state — for attendance tests
    inProgressClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (id, "gymId", "classTypeId", "coachUserId", "spaceId",
         "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [inProgressClassId, gymId, classTypeId, coachUserId, spaceId, baseDate, baseTime, 20, 'in_progress', true],
    );

    // Class in 'completed' state — for log result / get results tests
    completedClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (id, "gymId", "classTypeId", "coachUserId", "spaceId",
         "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [completedClassId, gymId, classTypeId, coachUserId, spaceId, baseDate, baseTime, 20, 'completed', true],
    );

    // Seed an attendance record marking the athlete present for the completed class
    // so logResult preconditions pass
    await dataSource.query(
      `INSERT INTO attendance (id, "classId", "userId", present, "markedAt", "markedByUserId", notes)
       VALUES ($1, $2, $3, $4, NOW(), $5, NULL)`,
      [uuidv4(), completedClassId, athleteUserId, true, coachUserId],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      // Results
      await dataSource.query(
        `DELETE FROM results WHERE "classId" IN ($1, $2, $3, $4)`,
        [publishedClassId, inProgressClassId, completedClassId, otherCoachClassId],
      );
      // Programming
      await dataSource.query(
        `DELETE FROM programming WHERE "classId" IN ($1, $2, $3, $4)`,
        [publishedClassId, inProgressClassId, completedClassId, otherCoachClassId],
      );
      // Attendance
      await dataSource.query(
        `DELETE FROM attendance WHERE "classId" IN ($1, $2, $3, $4)`,
        [publishedClassId, inProgressClassId, completedClassId, otherCoachClassId],
      );
      // Classes
      await dataSource.query(
        `DELETE FROM classes WHERE id IN ($1, $2, $3, $4)`,
        [publishedClassId, inProgressClassId, completedClassId, otherCoachClassId],
      );
      await dataSource.query(`DELETE FROM class_types WHERE "gymId" = $1`, [gymId]);
      await dataSource.query(`DELETE FROM spaces WHERE "gymId" = $1`, [gymId]);
      await dataSource.query(`DELETE FROM gym_memberships WHERE "gymId" = $1`, [gymId]);
      await dataSource.query(`DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(
        `DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)`,
        [ownerUserId, coachUserId, athleteUserId, otherGymOwnerUserId, otherCoachUserId],
      );
    } catch {
      // silently ignore cleanup errors
    }
  }

  // =========================================================================
  // 1. POST /api/gyms/:gymId/classes/:classId/results  (log result)
  // =========================================================================

  describe('POST /api/gyms/:gymId/classes/:classId/results — log result', () => {
    const endpoint = () => `/api/gyms/${gymId}/classes/${completedClassId}/results`;

    // Lazy: completedClassId is assigned in beforeAll, after describe body runs
    const validBody = () => ({
      classId: completedClassId,
      metricType: 'time',
      value: '300',
      unit: 'seconds',
    });

    it('happy path: athlete, completed class, present → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .send(validBody())
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('classId', completedClassId);
      expect(body).toHaveProperty('userId', athleteUserId);
      expect(body).toHaveProperty('metricType', 'time');
      expect(body).toHaveProperty('value', '300');
      expect(body).toHaveProperty('unit', 'seconds');
      expect(body).toHaveProperty('loggedAt');

      loggedResultId = body.id as string;
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .send(validBody())
        .expect(401);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .send(validBody())
        .expect(403);
    });

    it('invalid state: class is published, not completed → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${publishedClassId}/results`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ ...validBody(), classId: publishedClassId })
        .expect(400);
    });
  });

  // =========================================================================
  // 2. PATCH /api/gyms/:gymId/results/:resultId  (edit result)
  // =========================================================================

  describe('PATCH /api/gyms/:gymId/results/:resultId — edit result', () => {
    // loggedResultId is set during the log result happy path test above

    it('happy path: athlete edits their result → 200', async () => {
      expect(loggedResultId).toBeDefined();

      const res = await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/results/${loggedResultId}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({
          resultId: loggedResultId,
          value: '280',
          notes: 'Improved time',
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', loggedResultId);
      expect(body).toHaveProperty('value', '280');
    });

    it('no auth token → 401', async () => {
      expect(loggedResultId).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/results/${loggedResultId}`)
        .send({ resultId: loggedResultId, value: '250' })
        .expect(401);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      expect(loggedResultId).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/results/${loggedResultId}`)
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .send({ resultId: loggedResultId, value: '250' })
        .expect(403);
    });

    it('non-existent result → 404', async () => {
      const fakeResultId = uuidv4();
      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/results/${fakeResultId}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ resultId: fakeResultId, value: '250' })
        .expect(404);
    });
  });

  // =========================================================================
  // 3. GET /api/gyms/:gymId/classes/:classId/results  (view results)
  // =========================================================================

  describe('GET /api/gyms/:gymId/classes/:classId/results — view results', () => {
    const endpoint = () => `/api/gyms/${gymId}/classes/${completedClassId}/results`;

    it('happy path: coach retrieves results → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('happy path: owner retrieves results → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('results');
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .expect(401);
    });

    it('wrong role: athlete cannot view results → 403', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 3b. GET /api/gyms/:gymId/classes/:classId/results/me  (own result)
  // =========================================================================

  describe('GET /api/gyms/:gymId/classes/:classId/results/me — own result', () => {
    const endpoint = () =>
      `/api/gyms/${gymId}/classes/${completedClassId}/results/me`;

    it("happy path: athlete retrieves their own result → 200 with their result", async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('result');
      const result = body.result as Record<string, unknown> | null;
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('userId', athleteUserId);
    });

    it('empty: caller with no logged result → 200 with result null', async () => {
      // owner has no result logged for the completed class
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('result', null);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer()).get(endpoint()).expect(401);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 4. POST /api/gyms/:gymId/classes/:classId/toggle-loggable
  // =========================================================================

  describe('POST /api/gyms/:gymId/classes/:classId/toggle-loggable', () => {
    const endpoint = () =>
      `/api/gyms/${gymId}/classes/${publishedClassId}/toggle-loggable`;

    // Lazy: publishedClassId is assigned in beforeAll, after describe body runs
    const validBody = () => ({ classId: publishedClassId });

    it('happy path: coach toggles loggable on published class → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${coachToken}`)
        .send(validBody())
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', publishedClassId);
      expect(body).toHaveProperty('loggable');
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .send(validBody())
        .expect(401);
    });

    it('happy path: gym owner toggles loggable on a class they do not coach → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody())
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', publishedClassId);
      expect(body).toHaveProperty('loggable');
    });

    it('wrong role: athlete cannot toggle loggable → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .send(validBody())
        .expect(403);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .send(validBody())
        .expect(403);
    });

    it('invalid state: class is completed, not published/booking_closed → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${completedClassId}/toggle-loggable`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ classId: completedClassId })
        .expect(400);
    });
  });

  // =========================================================================
  // 5. POST /api/gyms/:gymId/classes/:classId/attendance  (mark attendance)
  // =========================================================================

  describe('POST /api/gyms/:gymId/classes/:classId/attendance — mark attendance', () => {
    const endpoint = () =>
      `/api/gyms/${gymId}/classes/${inProgressClassId}/attendance`;

    // Lazy: inProgressClassId is assigned in beforeAll, after describe body runs
    const validBody = () => ({
      classId: inProgressClassId,
      attendanceRecords: [
        { athleteUserId, present: true },
      ],
    });

    it('happy path: coach marks attendance on in-progress class → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${coachToken}`)
        .send(validBody())
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('classId', inProgressClassId);
      expect(body).toHaveProperty('attendanceRecords');
      expect(
        Array.isArray(body.attendanceRecords),
      ).toBe(true);
      const records = body.attendanceRecords as Array<Record<string, unknown>>;
      expect(records).toHaveLength(1);
      expect(records[0]).toHaveProperty('userId', athleteUserId);
      expect(records[0]).toHaveProperty('present', true);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .send(validBody())
        .expect(401);
    });

    it('wrong role: athlete cannot mark attendance → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .send(validBody())
        .expect(403);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .send(validBody())
        .expect(403);
    });

    it('invalid state: class is published, attendance not allowed → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${publishedClassId}/attendance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          classId: publishedClassId,
          attendanceRecords: [{ athleteUserId, present: true }],
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 6. GET /api/gyms/:gymId/classes/:classId/programming
  // =========================================================================

  describe('GET /api/gyms/:gymId/classes/:classId/programming — get programming', () => {
    const endpoint = () =>
      `/api/gyms/${gymId}/classes/${publishedClassId}/programming`;

    it('happy path: coach retrieves programming → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      // content is null when no programming has been set yet
      expect(body).toHaveProperty('classId', publishedClassId);
    });

    it('happy path: owner retrieves programming → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('classId', publishedClassId);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .expect(401);
    });

    it('athlete with active membership can view programming → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('classId', publishedClassId);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 7. POST /api/gyms/:gymId/classes/:classId/programming
  // =========================================================================

  describe('POST /api/gyms/:gymId/classes/:classId/programming — add/edit programming', () => {
    const endpoint = () =>
      `/api/gyms/${gymId}/classes/${publishedClassId}/programming`;

    // Lazy: publishedClassId is assigned in beforeAll, after describe body runs
    const validBody = () => ({
      classId: publishedClassId,
      content: '5 rounds: 20 box jumps, 15 pull-ups, 10 burpees. For time.',
      loggable: true,
    });

    it('happy path: coach adds programming to published class → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${coachToken}`)
        .send(validBody())
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('classId', publishedClassId);
      expect(body).toHaveProperty('content', validBody().content);
      expect(body).toHaveProperty('createdByUserId', coachUserId);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .send(validBody())
        .expect(401);
    });

    it('happy path: gym owner adds programming to a class they do not coach → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody(), content: 'Owner-authored WOD: 21-15-9.' })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('classId', publishedClassId);
      expect(body).toHaveProperty('content', 'Owner-authored WOD: 21-15-9.');
    });

    it('coach not assigned to the class cannot add programming → 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${otherCoachClassId}/programming`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ...validBody(), classId: otherCoachClassId })
        .expect(403);
    });

    it('wrong role: athlete cannot add programming → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${athleteToken}`)
        .send(validBody())
        .expect(403);
    });

    it('gymId mismatch (JWT gym ≠ route gym) → 403', async () => {
      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', `Bearer ${wrongGymToken}`)
        .send(validBody())
        .expect(403);
    });

    it('invalid state: class is completed, programming not allowed → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${completedClassId}/programming`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ...validBody(), classId: completedClassId })
        .expect(400);
    });
  });
});
