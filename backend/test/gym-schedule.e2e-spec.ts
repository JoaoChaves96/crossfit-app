import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

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
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      await dataSource.query('DELETE FROM classes WHERE id = $1', [classId]);
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
});
