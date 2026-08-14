import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * E2E tests for GET /api/gyms/:gymId/configuration/coaches
 *
 * NOTE: This endpoint does NOT currently exist in GymConfigurationController.
 * All tests that expect a 200 response WILL FAIL until:
 *   1. GET /api/gyms/:gymId/configuration/coaches is added to GymConfigurationController
 *   2. A query handler returns { coaches: CoachListItemDto[] }
 *
 * (Historical: this note also described JwtAuthGuard as a stub that never set
 * request.user, so RolesGuard 403'd everything. That was fixed by the JWT epic —
 * the guard verifies a signed token and populates request.user from its claims.)
 */

describe('GET /api/gyms/:gymId/configuration/coaches', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  // Primary gym
  const gymId = uuid();
  const ownerUserId = uuid();
  const ownerStaffId = uuid();

  // Second gym (for cross-gym scoping tests)
  const otherGymId = uuid();
  const otherOwnerUserId = uuid();
  const otherOwnerStaffId = uuid();

  // Coaches in primary gym
  const activeCoachUserId = uuid();
  const activeCoachStaffId = uuid();
  const inactiveCoachUserId = uuid();
  const inactiveCoachStaffId = uuid();

  // Athlete in primary gym (no staff role)
  const athleteUserId = uuid();
  const athleteMembershipId = uuid();

  // Empty gym (owner only, no coaches)
  const emptyGymId = uuid();
  const emptyGymOwnerUserId = uuid();
  const emptyGymOwnerStaffId = uuid();

  // JWTs for each actor
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@gym1.test',
    gymId,
    role: 'owner',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@gym1.test',
    gymId,
    role: 'athlete',
  });
  const emptyGymOwnerToken = generateTestToken({
    id: emptyGymOwnerUserId,
    email: 'owner@gymempty.test',
    gymId: emptyGymId,
    role: 'owner',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    // Seed users
    await dataSource.query(`
      INSERT INTO users (id, email, name, status, "passwordHash", "socialLoginId", "createdAt")
      VALUES
        ('${ownerUserId}',        'owner@gym1.test',        'Owner Gym1',        'active', NULL, NULL, NOW()),
        ('${otherOwnerUserId}',   'owner@gym2.test',        'Owner Gym2',        'active', NULL, NULL, NOW()),
        ('${activeCoachUserId}',  'active.coach@gym1.test', 'Active Coach',      'active', NULL, NULL, NOW()),
        ('${inactiveCoachUserId}','inactive.coach@gym1.test','Inactive Coach',   'active', NULL, NULL, NOW()),
        ('${athleteUserId}',      'athlete@gym1.test',      'Athlete Gym1',      'active', NULL, NULL, NOW()),
        ('${emptyGymOwnerUserId}','owner@gymempty.test',    'Owner Empty Gym',   'active', NULL, NULL, NOW())
    `);

    // Seed gyms
    await dataSource.query(`
      INSERT INTO gyms (id, name, description, location, "logoUrl", "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES
        ('${gymId}',      'Primary Gym',  NULL, 'Location 1', NULL, '${ownerUserId}',      'active', NOW(), NOW()),
        ('${otherGymId}', 'Other Gym',    NULL, 'Location 2', NULL, '${otherOwnerUserId}', 'active', NOW(), NOW()),
        ('${emptyGymId}', 'Empty Gym',    NULL, 'Location 3', NULL, '${emptyGymOwnerUserId}', 'active', NOW(), NOW())
    `);

    // Seed gym_staff
    await dataSource.query(`
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES
        ('${ownerStaffId}',        '${gymId}',      '${ownerUserId}',        'owner', 'active', NOW()),
        ('${otherOwnerStaffId}',   '${otherGymId}', '${otherOwnerUserId}',   'owner', 'active', NOW()),
        ('${activeCoachStaffId}',  '${gymId}',      '${activeCoachUserId}',  'coach', 'active', NOW()),
        ('${inactiveCoachStaffId}','${gymId}',      '${inactiveCoachUserId}','coach', 'inactive', NOW()),
        ('${emptyGymOwnerStaffId}','${emptyGymId}', '${emptyGymOwnerUserId}','owner', 'active', NOW())
    `);

    // Seed gym_memberships for athlete
    await dataSource.query(`
      INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
      VALUES ('${athleteMembershipId}', '${gymId}', '${athleteUserId}', 'active', NOW())
    `);
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await dataSource.query(
      `DELETE FROM gym_memberships WHERE id = '${athleteMembershipId}'`,
    );
    await dataSource.query(`
      DELETE FROM gym_staff WHERE id IN (
        '${ownerStaffId}', '${otherOwnerStaffId}',
        '${activeCoachStaffId}', '${inactiveCoachStaffId}',
        '${emptyGymOwnerStaffId}'
      )
    `);
    await dataSource.query(`
      DELETE FROM gyms WHERE id IN ('${gymId}', '${otherGymId}', '${emptyGymId}')
    `);
    await dataSource.query(`
      DELETE FROM users WHERE id IN (
        '${ownerUserId}', '${otherOwnerUserId}',
        '${activeCoachUserId}', '${inactiveCoachUserId}',
        '${athleteUserId}', '${emptyGymOwnerUserId}'
      )
    `);

    await app.close();
  });

  describe('Test 1 — Successful list (owner)', () => {
    it('should return 200 with a coaches array containing both active and inactive coaches', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('coaches');
      expect(Array.isArray(response.body.coaches)).toBe(true);

      const coaches: Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        role: string;
        status: string;
        assignedAt: string;
      }> = response.body.coaches;

      const coachUserIds = coaches.map((c) => c.userId);
      expect(coachUserIds).toContain(activeCoachUserId);
      expect(coachUserIds).toContain(inactiveCoachUserId);
    });
  });

  describe('Test 2 — Empty list', () => {
    it('should return 200 with an empty coaches array for a gym with no coaches', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${emptyGymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${emptyGymOwnerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('coaches');
      expect(Array.isArray(response.body.coaches)).toBe(true);
      expect(response.body.coaches).toHaveLength(0);
    });
  });

  describe('Test 3 — Non-owner cannot list coaches', () => {
    it('should return 403 when an athlete requests the coach list', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });

  describe('Test 4 — Owner of gym A cannot list coaches of gym B', () => {
    it('should return 403 when gym1 owner tries to access gym2 coach list', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${otherGymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  describe('Test 5 — Response shape validation', () => {
    it('should return each coach item matching CoachListItemDto shape exactly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const coaches: Array<Record<string, unknown>> = response.body.coaches;
      expect(coaches.length).toBeGreaterThan(0);

      for (const coach of coaches) {
        // id: string (UUID)
        expect(typeof coach.id).toBe('string');
        expect(coach.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );

        // userId: string (UUID)
        expect(typeof coach.userId).toBe('string');
        expect(coach.userId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );

        // name: string
        expect(typeof coach.name).toBe('string');
        expect((coach.name as string).length).toBeGreaterThan(0);

        // email: string
        expect(typeof coach.email).toBe('string');
        expect((coach.email as string).length).toBeGreaterThan(0);

        // role: 'owner' | 'coach'
        expect(['owner', 'coach']).toContain(coach.role);

        // status: 'active' | 'inactive'
        expect(['active', 'inactive']).toContain(coach.status);

        // assignedAt: string (ISO date)
        expect(typeof coach.assignedAt).toBe('string');
        expect(new Date(coach.assignedAt as string).toString()).not.toBe(
          'Invalid Date',
        );

        // No extra unexpected top-level keys (exact shape)
        const allowedKeys = [
          'id',
          'userId',
          'name',
          'email',
          'role',
          'status',
          'assignedAt',
        ];
        const coachKeys = Object.keys(coach);
        for (const key of coachKeys) {
          expect(allowedKeys).toContain(key);
        }
      }
    });
  });
});
