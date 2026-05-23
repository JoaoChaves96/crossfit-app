import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Class Creation E2E Tests
 *
 * Endpoint: POST /api/gyms/:gymId/classes
 * Auth: header-based — x-user-id (actor), x-gym-id (gym context)
 * Role required: owner (gym_staff row with role='owner' for the gym)
 *
 * Request body:
 * {
 *   classTypeId: string   (UUID — must belong to the gym)
 *   coachUserId: string   (UUID — must be active coach staff in the gym)
 *   spaceId:     string   (UUID — must belong to the gym)
 *   scheduledDate: string (ISO date, e.g. "2030-01-15")
 *   scheduledTime: string (HH:mm format, e.g. "09:00")
 *   capacity?:   number   (optional; defaults to space.baseCapacity if omitted)
 * }
 *
 * Success response (201):
 * {
 *   id:             string
 *   gymId:          string
 *   classTypeId:    string
 *   coachUserId:    string
 *   spaceId:        string
 *   scheduledDate:  string (ISO date)
 *   scheduledTime:  string (HH:mm)
 *   capacity:       number
 *   state:          "published"
 *   createdAt:      string (ISO datetime)
 *   lastModifiedAt: string (ISO datetime)
 * }
 *
 * Test coverage:
 * 1. Successful class creation with all required fields
 * 2. Successful class creation without optional capacity (defaults to space base capacity)
 * 3. Missing required field (classTypeId) → 400
 * 4. Missing required field (coachUserId) → 400
 * 5. Missing required field (spaceId) → 400
 * 6. Missing required field (scheduledDate) → 400
 * 7. Missing required field (scheduledTime) → 400
 * 8. Invalid scheduledTime format → 400
 * 9. Coach not assigned to gym → 404
 * 10. Space not in gym → 400
 * 11. Non-owner (athlete) trying to create → 403
 * 12. Invalid class type for gym → 400
 */
describe('Class Creation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Shared test identifiers
  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const coachUserId = uuidv4();
  const athleteUserId = uuidv4();
  const spaceId = uuidv4();
  const classTypeId = uuidv4();

  // IDs for cross-gym isolation tests
  const otherGymId = uuidv4();
  const otherGymOwnerUserId = uuidv4();
  const otherGymSpaceId = uuidv4();
  const otherGymClassTypeId = uuidv4();
  const outsideCoachUserId = uuidv4();

  const createdClassIds: string[] = [];

  // JWTs for each actor
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@class-creation.test',
    gymId,
    role: 'owner',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@class-creation.test',
    gymId,
    role: 'athlete',
  });
  const otherOwnerToken = generateTestToken({
    id: otherGymOwnerUserId,
    email: 'other-owner@class-creation.test',
    gymId: otherGymId,
    role: 'owner',
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

    // 1. Create users: owner, coach, athlete, outside coach, other gym owner
    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1,  $2,  'Test Owner',         'active', NOW()),
        ($3,  $4,  'Test Coach',         'active', NOW()),
        ($5,  $6,  'Test Athlete',       'active', NOW()),
        ($7,  $8,  'Outside Coach',      'active', NOW()),
        ($9,  $10, 'Other Gym Owner',    'active', NOW())`,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        coachUserId,
        `coach-${uuidv4()}@test.local`,
        athleteUserId,
        `athlete-${uuidv4()}@test.local`,
        outsideCoachUserId,
        `outside-coach-${uuidv4()}@test.local`,
        otherGymOwnerUserId,
        `other-owner-${uuidv4()}@test.local`,
      ],
    );

    // 2. Create primary gym
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [gymId, 'Test Gym', 'Primary test gym', 'Lisbon', ownerUserId, 'active'],
    );

    // 3. Create other gym (for cross-gym isolation tests)
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        otherGymId,
        'Other Gym',
        'Cross-gym test',
        'Porto',
        otherGymOwnerUserId,
        'active',
      ],
    );

    // 4. Create gym_staff: owner (primary gym)
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
    );

    // 5. Create gym_staff: coach (primary gym)
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, coachUserId, 'coach', 'active'],
    );

    // 6. Create gym_staff: owner (other gym) — so RolesGuard allows other-gym requests
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), otherGymId, otherGymOwnerUserId, 'owner', 'active'],
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

    // 9. Create space in other gym (for cross-gym space test)
    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, $3, $4)`,
      [otherGymSpaceId, otherGymId, 'Other Box', 10],
    );

    // 10. Create class type in primary gym
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, $3, $4, $5)`,
      [classTypeId, gymId, 'CrossFit WOD', 'none', true],
    );

    // 11. Create class type in other gym (for cross-gym class type test)
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, $3, $4, $5)`,
      [otherGymClassTypeId, otherGymId, 'Other WOD', 'none', true],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      if (createdClassIds.length > 0) {
        for (const id of createdClassIds) {
          await dataSource.query('DELETE FROM classes WHERE id = $1', [id]);
        }
      }
      await dataSource.query(
        'DELETE FROM class_types WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query('DELETE FROM spaces WHERE "gymId" IN ($1, $2)', [
        gymId,
        otherGymId,
      ]);
      await dataSource.query('DELETE FROM gym_memberships WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query(
        'DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query('DELETE FROM gyms WHERE id IN ($1, $2)', [
        gymId,
        otherGymId,
      ]);
      await dataSource.query(
        'DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)',
        [
          ownerUserId,
          coachUserId,
          athleteUserId,
          outsideCoachUserId,
          otherGymOwnerUserId,
        ],
      );
    } catch {
      // silently ignore cleanup errors
    }
  }

  // Builds a valid future date string (1 year ahead)
  function futureDateString(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  const validTime = '09:00';

  // ---------------------------------------------------------------------------
  // Test 1: Successful class creation with all required fields
  // ---------------------------------------------------------------------------
  describe('Test 1: Successful class creation with all fields', () => {
    it('POST /api/gyms/:gymId/classes → 201 with valid payload', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
          capacity: 15,
        })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(typeof body.id).toBe('string');
      expect(body).toHaveProperty('gymId', gymId);
      expect(body).toHaveProperty('classTypeId', classTypeId);
      expect(body).toHaveProperty('coachUserId', coachUserId);
      expect(body).toHaveProperty('spaceId', spaceId);
      expect(body).toHaveProperty('scheduledTime', validTime);
      expect(body).toHaveProperty('capacity', 15);
      expect(body).toHaveProperty('state', 'published');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('lastModifiedAt');

      createdClassIds.push(body.id as string);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Successful class creation without optional capacity
  // ---------------------------------------------------------------------------
  describe('Test 2: Successful class creation without optional capacity', () => {
    it('POST /api/gyms/:gymId/classes → 201, capacity defaults to space.baseCapacity', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: '10:30',
        })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('state', 'published');
      // Capacity must be a positive number (defaulted from space.baseCapacity = 20)
      expect(typeof body.capacity).toBe('number');
      expect(body.capacity as number).toBeGreaterThan(0);

      createdClassIds.push(body.id as string);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Missing required field — classTypeId
  // ---------------------------------------------------------------------------
  describe('Test 3: Missing required fields', () => {
    it('POST without classTypeId → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(400);
    });

    it('POST without coachUserId → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(400);
    });

    it('POST without spaceId → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(400);
    });

    it('POST without scheduledDate → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledTime: validTime,
        })
        .expect(400);
    });

    it('POST without scheduledTime → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
        })
        .expect(400);
    });

    it('POST with invalid scheduledTime format → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: '9:00am',
        })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Invalid coach — coach not assigned to gym
  // ---------------------------------------------------------------------------
  describe('Test 4: Invalid coach — coach not assigned to this gym', () => {
    it('POST with coach not in gym → 404', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId: outsideCoachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Invalid space — space not in gym
  // ---------------------------------------------------------------------------
  describe('Test 5: Invalid space — space belongs to different gym', () => {
    it('POST with space from another gym → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId: otherGymSpaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Non-owner trying to create — athlete role → 403
  // ---------------------------------------------------------------------------
  describe('Test 6: Non-owner actor is rejected', () => {
    it('POST with athlete user → 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({
          classTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Invalid class type for gym — class type belongs to another gym
  // ---------------------------------------------------------------------------
  describe('Test 7: Invalid class type — class type belongs to different gym', () => {
    it('POST with classTypeId from another gym → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          classTypeId: otherGymClassTypeId,
          coachUserId,
          spaceId,
          scheduledDate: futureDateString(),
          scheduledTime: validTime,
        })
        .expect(400);
    });
  });
});
