import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Gym Creation E2E Tests
 *
 * Validates:
 * 1. Successful gym creation - POST /api/gyms
 * 2. Validation errors on missing/invalid fields
 * 3. Unauthenticated request is rejected (no user found)
 *
 * Uses real database, real signed JWTs (see test/helpers/jwt.helper.ts)
 */
describe('Gym Creation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const userId = uuidv4();
  const createdGymIds: string[] = [];

  // A gym is created per happy-path test and an owner may hold only one
  // (docs/DECISIONS.md → *One Gym Per Owner*), so each happy path needs its own
  // owner. Sharing one made the second test 409 — which is how that decision
  // first showed up here, as a failure rather than as coverage.
  const secondUserId = uuidv4();

  // Already owns a gym before the suite starts, so the 409 below stands on its
  // own fixture rather than on another test having run first.
  const takenOwnerId = uuidv4();
  const takenGymId = uuidv4();

  // JWT for the user (gym creation endpoint doesn't require a gymId in the token
  // since the gym doesn't exist yet; use an empty string for gymId)
  const userToken = generateTestToken({
    id: userId,
    email: 'owner@gym-creation.test',
    gymId: '',
    role: 'owner',
  });
  const secondUserToken = generateTestToken({
    id: secondUserId,
    email: 'owner2@gym-creation.test',
    gymId: '',
    role: 'owner',
  });
  const takenOwnerToken = generateTestToken({
    id: takenOwnerId,
    email: 'taken@gym-creation.test',
    gymId: takenGymId,
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
      await dataSource.query(
        `INSERT INTO users (id, email, name, status, "createdAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, `owner-${uuidv4()}@test.local`, 'Test Owner', 'active'],
      );
      await dataSource.query(
        `INSERT INTO users (id, email, name, status, "createdAt")
         VALUES ($1, $2, $3, $4, NOW()), ($5, $6, $7, $8, NOW())`,
        [
          secondUserId,
          `owner2-${uuidv4()}@test.local`,
          'Second Test Owner',
          'active',
          takenOwnerId,
          `taken-${uuidv4()}@test.local`,
          'Owner With A Gym',
          'active',
        ],
      );
      await dataSource.query(
        `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
        [takenGymId, 'Already Owned Box', 'desc', 'Faro', takenOwnerId],
      );
      await dataSource.query(
        `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
         VALUES ($1, $2, $3, 'owner', 'active', NOW())`,
        [uuidv4(), takenGymId, takenOwnerId],
      );
      // Deliberately not pushed to createdGymIds — a later test reads
      // createdGymIds[0] as "the gym the first test created", and this gym
      // predates all of them. Cleaned up explicitly in afterAll instead.
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      for (const gymId of [...createdGymIds, takenGymId]) {
        try {
          await dataSource.query('DELETE FROM gym_staff WHERE "gymId" = $1', [
            gymId,
          ]);
          await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
        } catch {
          // silently ignore cleanup errors
        }
      }
      try {
        await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
          userId,
          secondUserId,
          takenOwnerId,
        ]);
      } catch {
        // silently ignore
      }
    }

    if (app) {
      await app.close();
    }
  }, 30000);

  describe('Test 1: Successful gym creation', () => {
    it('POST /api/gyms → 201 with gym data and ownerId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'CrossFit Box Alpha',
          location: 'Lisbon, Portugal',
          description: 'A premier CrossFit box',
        })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(typeof body.id).toBe('string');
      expect(body).toHaveProperty('name', 'CrossFit Box Alpha');
      expect(body).toHaveProperty('location', 'Lisbon, Portugal');
      expect(body).toHaveProperty('description', 'A premier CrossFit box');
      expect(body).toHaveProperty('ownerId', userId);
      expect(body).toHaveProperty('createdAt');

      createdGymIds.push(body.id as string);
    });

    it('POST /api/gyms → 201 without optional description', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          name: 'CrossFit Box Beta',
          location: 'Porto, Portugal',
        })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name', 'CrossFit Box Beta');
      expect(body).toHaveProperty('location', 'Porto, Portugal');
      expect(body).toHaveProperty('ownerId', secondUserId);
      expect(body).toHaveProperty('createdAt');

      createdGymIds.push(body.id as string);
    });

    // docs/DECISIONS.md → *One Gym Per Owner*. Until now nothing asserted this:
    // the only thing exercising it was the test above, which shared an owner and
    // so 409'd by accident.
    it('POST /api/gyms → 409 when the caller already owns a gym', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${takenOwnerToken}`)
        .send({
          name: 'Second Box For One Owner',
          location: 'Braga, Portugal',
        })
        .expect(409);

      expect(response.body).toHaveProperty('message');

      if (dataSource && dataSource.isInitialized) {
        const rows = await dataSource.query(
          `SELECT id FROM gyms WHERE "ownerUserId" = $1`,
          [takenOwnerId],
        );
        expect(rows).toHaveLength(1);
      }
    });

    it('gym_staff row is created with role=owner for the authenticated user', async () => {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }

      const gymId = createdGymIds[0];
      const rows = await dataSource.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, userId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('owner');
      expect(rows[0].status).toBe('active');
    });
  });

  describe('Test 2: Validation errors', () => {
    it('POST /api/gyms without name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms without location → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Gym',
        })
        .expect(400);
    });

    it('POST /api/gyms with empty name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '',
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms with empty location → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Gym',
          location: '',
        })
        .expect(400);
    });
  });

  describe('Test 3: Max-length validation', () => {
    it('POST /api/gyms with name exceeding 100 chars → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'A'.repeat(101),
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms with location exceeding 200 chars → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Gym',
          location: 'B'.repeat(201),
        })
        .expect(400);
    });

    it('POST /api/gyms with description exceeding 1000 chars → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Gym',
          location: 'Lisbon, Portugal',
          description: 'C'.repeat(1001),
        })
        .expect(400);
    });
  });

  describe('Test 4: Authentication check', () => {
    it('POST /api/gyms with unknown user id → 404', async () => {
      const unknownUserId = uuidv4();
      const unknownUserToken = generateTestToken({
        id: unknownUserId,
        email: 'ghost@gym-creation.test',
        gymId: '',
        role: 'owner',
      });

      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('Authorization', `Bearer ${unknownUserToken}`)
        .send({
          name: 'Ghost Gym',
          location: 'Nowhere',
        })
        .expect(404);
    });
  });
});
