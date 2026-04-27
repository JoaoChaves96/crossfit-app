import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gym Creation E2E Tests
 *
 * Validates:
 * 1. Successful gym creation - POST /api/gyms
 * 2. Validation errors on missing/invalid fields
 * 3. Unauthenticated request is rejected (no user found)
 *
 * Uses real database, header-based auth (x-user-id)
 */
describe('Gym Creation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const userId = uuidv4();
  const createdGymIds: string[] = [];

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
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      for (const gymId of createdGymIds) {
        try {
          await dataSource.query(
            'DELETE FROM gym_staff WHERE "gymId" = $1',
            [gymId],
          );
          await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
        } catch {
          // silently ignore cleanup errors
        }
      }
      try {
        await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
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
        .set('x-user-id', userId)
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
        .set('x-user-id', userId)
        .send({
          name: 'CrossFit Box Beta',
          location: 'Porto, Portugal',
        })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name', 'CrossFit Box Beta');
      expect(body).toHaveProperty('location', 'Porto, Portugal');
      expect(body).toHaveProperty('ownerId', userId);
      expect(body).toHaveProperty('createdAt');

      createdGymIds.push(body.id as string);
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
        .set('x-user-id', userId)
        .send({
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms without location → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', userId)
        .send({
          name: 'My Gym',
        })
        .expect(400);
    });

    it('POST /api/gyms with empty name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', userId)
        .send({
          name: '',
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms with empty location → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', userId)
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
        .set('x-user-id', userId)
        .send({
          name: 'A'.repeat(101),
          location: 'Lisbon, Portugal',
        })
        .expect(400);
    });

    it('POST /api/gyms with location exceeding 200 chars → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', userId)
        .send({
          name: 'My Gym',
          location: 'B'.repeat(201),
        })
        .expect(400);
    });

    it('POST /api/gyms with description exceeding 1000 chars → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', userId)
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

      await request(app.getHttpServer())
        .post('/api/gyms')
        .set('x-user-id', unknownUserId)
        .send({
          name: 'Ghost Gym',
          location: 'Nowhere',
        })
        .expect(404);
    });
  });
});
