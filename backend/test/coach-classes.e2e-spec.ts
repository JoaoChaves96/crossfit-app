import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Coach Classes E2E Tests
 *
 * Endpoint: GET /api/gyms/:gymId/coach/classes
 * Auth: signed JWT — `sub` (actor), `gymId` (gym context), `role`
 * Role required: active coach in the gym (gym_staff row with role='coach')
 *
 * Success response (200):
 * {
 *   classes: [
 *     {
 *       id:             string
 *       scheduledDate:  string (YYYY-MM-DD)
 *       scheduledTime:  string (HH:mm:ss)
 *       spaceName:      string
 *       classTypeName:  string
 *       capacity:       number
 *       bookedCount:    number
 *       state:          string
 *     }
 *   ]
 * }
 *
 * Test coverage:
 * 1. Coach retrieves only their own assigned classes (happy path)
 * 2. Coach from another gym cannot see classes from this gym (cross-coach isolation)
 * 3. Non-coach user (athlete) is rejected with 403
 */
describe('Coach Classes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const gymId = uuidv4();
  const otherGymId = uuidv4();
  const coachUserId = uuidv4();
  const otherCoachUserId = uuidv4();
  const ownerUserId = uuidv4();
  const athleteUserId = uuidv4();
  const spaceId = uuidv4();
  const classTypeId = uuidv4();
  let coachClassId: string;
  let otherCoachClassId: string;

  // JWTs for each actor
  const coachToken = generateTestToken({
    id: coachUserId,
    email: 'coach@coach-classes.test',
    gymId,
    role: 'coach',
  });
  const otherCoachToken = generateTestToken({
    id: otherCoachUserId,
    email: 'other-coach@coach-classes.test',
    gymId,
    role: 'coach',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@coach-classes.test',
    gymId,
    role: 'athlete',
  });

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

  async function setupTestData() {
    if (!dataSource) throw new Error('DataSource not initialized');

    // 1. Create users
    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1, $2, 'Coach Classes Owner',       'active', NOW()),
        ($3, $4, 'Coach Classes Coach',       'active', NOW()),
        ($5, $6, 'Coach Classes Other Coach', 'active', NOW()),
        ($7, $8, 'Coach Classes Athlete',     'active', NOW())`,
      [
        ownerUserId,
        `coach-cls-owner-${uuidv4()}@test.local`,
        coachUserId,
        `coach-cls-coach-${uuidv4()}@test.local`,
        otherCoachUserId,
        `coach-cls-other-${uuidv4()}@test.local`,
        athleteUserId,
        `coach-cls-athlete-${uuidv4()}@test.local`,
      ],
    );

    // 2. Create primary gym
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        gymId,
        'Coach Classes Gym',
        'Primary gym',
        'Lisbon',
        ownerUserId,
        'active',
      ],
    );

    // 3. Create other gym (for isolation test)
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        otherGymId,
        'Other Coach Gym',
        'Other gym',
        'Porto',
        ownerUserId,
        'active',
      ],
    );

    // 4. Create gym_staff: owner in primary gym
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
    );

    // 5. Create gym_staff: coach in primary gym
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, coachUserId, 'coach', 'active'],
    );

    // 6. Create gym_staff: otherCoach in OTHER gym only (not in primary gym)
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), otherGymId, otherCoachUserId, 'coach', 'active'],
    );

    // 7. Create gym_membership: athlete in primary gym
    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), gymId, athleteUserId, 'active'],
    );

    // 8. Create space in primary gym
    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, $3, $4)`,
      [spaceId, gymId, 'Main Box', 20],
    );

    // 9. Create class type in primary gym
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, $3, $4, $5)`,
      [classTypeId, gymId, 'CrossFit WOD', 'none', true],
    );

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    // 10. Create a class assigned to coachUserId in gymId
    coachClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (
        id, "gymId", "classTypeId", "coachUserId", "spaceId",
        "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        coachClassId,
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

    // 11. Create a class assigned to otherCoachUserId in gymId
    //     (same gym, different coach — must NOT appear in coachUserId's results)
    otherCoachClassId = uuidv4();
    await dataSource.query(
      `INSERT INTO classes (
        id, "gymId", "classTypeId", "coachUserId", "spaceId",
        "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        otherCoachClassId,
        gymId,
        classTypeId,
        otherCoachUserId,
        spaceId,
        dateStr,
        '10:00:00',
        10,
        'published',
        true,
      ],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      await dataSource.query('DELETE FROM classes WHERE id IN ($1, $2)', [
        coachClassId,
        otherCoachClassId,
      ]);
      await dataSource.query('DELETE FROM class_types WHERE id = $1', [
        classTypeId,
      ]);
      await dataSource.query('DELETE FROM spaces WHERE id = $1', [spaceId]);
      await dataSource.query(
        'DELETE FROM gym_memberships WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query(
        'DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query('DELETE FROM gyms WHERE id IN ($1, $2)', [
        gymId,
        otherGymId,
      ]);
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [
        ownerUserId,
        coachUserId,
        otherCoachUserId,
        athleteUserId,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Coach retrieves only their own classes (happy path)
  // ---------------------------------------------------------------------------
  describe('Test 1: Coach sees only their own assigned classes', () => {
    it('GET /api/gyms/:gymId/coach/classes → 200 with coach-scoped classes', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('classes');
      const classes = body.classes as Record<string, unknown>[];
      expect(Array.isArray(classes)).toBe(true);

      // The coach's own class must appear
      const found = classes.find((c) => c.id === coachClassId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('scheduledDate');
      expect(found).toHaveProperty('scheduledTime');
      expect(found).toHaveProperty('spaceName', 'Main Box');
      expect(found).toHaveProperty('classTypeName', 'CrossFit WOD');
      expect(found).toHaveProperty('capacity', 15);
      expect(found).toHaveProperty('bookedCount', 0);
      expect(found).toHaveProperty('state', 'published');

      // The other coach's class must NOT appear
      const forbidden = classes.find((c) => c.id === otherCoachClassId);
      expect(forbidden).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Cross-coach isolation — a coach from another gym cannot see classes
  //          in the primary gym (otherCoachUserId is not staff of gymId)
  // ---------------------------------------------------------------------------
  describe('Test 2: Cross-coach isolation — coach from another gym is rejected', () => {
    it('GET /api/gyms/:gymId/coach/classes as otherCoach → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${otherCoachToken}`)
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Non-coach user (athlete) is rejected with 403
  // ---------------------------------------------------------------------------
  describe('Test 3: Athlete is rejected with 403', () => {
    it('GET /api/gyms/:gymId/coach/classes as athlete → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });
});
