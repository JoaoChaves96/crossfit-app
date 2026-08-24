import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * E2E tests for PATCH /api/gyms/:gymId/configuration/coaches/:coachUserId
 *
 * This is the only revoke-access control an owner has: it is what cuts a coach
 * off from a gym. The round trip matters less than the consequence, so these
 * tests assert both — the status flips, *and* a disabled coach is actually
 * refused by the gym's coach routes, then let back in on re-enable.
 *
 * Every token here claims `role: 'coach'` in its JWT even when the staff row is
 * disabled. That is deliberate: the claim is stale by design (tokens live 7
 * days), so what these tests prove is that the guard re-reads the database
 * rather than trusting the claim.
 */
describe('PATCH /api/gyms/:gymId/configuration/coaches/:coachUserId', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const gymId = uuid();
  const ownerUserId = uuid();
  const ownerStaffId = uuid();

  const otherGymId = uuid();
  const otherOwnerUserId = uuid();
  const otherOwnerStaffId = uuid();

  const coachUserId = uuid();
  const coachStaffId = uuid();
  const peerCoachUserId = uuid();
  const peerCoachStaffId = uuid();

  const athleteUserId = uuid();
  const athleteMembershipId = uuid();

  const strangerUserId = uuid();

  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@ccs.test',
    gymId,
    role: 'owner',
  });
  const otherOwnerToken = generateTestToken({
    id: otherOwnerUserId,
    email: 'owner@ccs-other.test',
    gymId: otherGymId,
    role: 'owner',
  });
  const coachToken = generateTestToken({
    id: coachUserId,
    email: 'coach@ccs.test',
    gymId,
    role: 'coach',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@ccs.test',
    gymId,
    role: 'athlete',
  });

  const endpoint = (targetGymId: string, targetUserId: string) =>
    `/api/gyms/${targetGymId}/configuration/coaches/${targetUserId}`;

  async function readStaffStatus(staffId: string): Promise<string> {
    const rows: Array<{ status: string }> = await dataSource.query(
      `SELECT status FROM gym_staff WHERE id = $1`,
      [staffId],
    );
    return rows[0]?.status;
  }

  async function setStaffStatus(staffId: string, status: string) {
    await dataSource.query(`UPDATE gym_staff SET status = $1 WHERE id = $2`, [
      status,
      staffId,
    ]);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);

    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1, $2, 'CCS Owner',       'active', NOW()),
        ($3, $4, 'CCS Other Owner', 'active', NOW()),
        ($5, $6, 'CCS Coach',       'active', NOW()),
        ($7, $8, 'CCS Peer Coach',  'active', NOW()),
        ($9, $10,'CCS Athlete',     'active', NOW()),
        ($11,$12,'CCS Stranger',    'active', NOW())`,
      [
        ownerUserId,
        `ccs-owner-${uuid()}@test.local`,
        otherOwnerUserId,
        `ccs-other-owner-${uuid()}@test.local`,
        coachUserId,
        `ccs-coach-${uuid()}@test.local`,
        peerCoachUserId,
        `ccs-peer-${uuid()}@test.local`,
        athleteUserId,
        `ccs-athlete-${uuid()}@test.local`,
        strangerUserId,
        `ccs-stranger-${uuid()}@test.local`,
      ],
    );

    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, NULL, $3, $4, 'active', NOW(), NOW()),
              ($5, $6, NULL, $7, $8, 'active', NOW(), NOW())`,
      [
        gymId,
        'CCS Primary Gym',
        'Lisbon',
        ownerUserId,
        otherGymId,
        'CCS Other Gym',
        'Porto',
        otherOwnerUserId,
      ],
    );

    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
        ($1, $2,  $3,  'owner', 'active', NOW()),
        ($4, $5,  $6,  'owner', 'active', NOW()),
        ($7, $8,  $9,  'coach', 'active', NOW()),
        ($10,$11, $12, 'coach', 'active', NOW())`,
      [
        ownerStaffId, gymId, ownerUserId,
        otherOwnerStaffId, otherGymId, otherOwnerUserId,
        coachStaffId, gymId, coachUserId,
        peerCoachStaffId, gymId, peerCoachUserId,
      ],
    );

    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, 'active', NOW())`,
      [athleteMembershipId, gymId, athleteUserId],
    );
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM gym_memberships WHERE id = $1`, [
      athleteMembershipId,
    ]);
    await dataSource.query(
      `DELETE FROM gym_staff WHERE id IN ($1, $2, $3, $4)`,
      [ownerStaffId, otherOwnerStaffId, coachStaffId, peerCoachStaffId],
    );
    await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [
      gymId,
      otherGymId,
    ]);
    await dataSource.query(
      `DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6)`,
      [
        ownerUserId,
        otherOwnerUserId,
        coachUserId,
        peerCoachUserId,
        athleteUserId,
        strangerUserId,
      ],
    );
    await app.close();
  });

  beforeEach(async () => {
    // Each test starts from an active coach so they can run in any order.
    await setStaffStatus(coachStaffId, 'active');
  });

  describe('the round trip', () => {
    it('disables an active coach and reports the new status', async () => {
      const response = await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: coachStaffId,
        gymId,
        userId: coachUserId,
        role: 'coach',
        status: 'inactive',
      });
      await expect(readStaffStatus(coachStaffId)).resolves.toBe('inactive');
    });

    it('re-enables a disabled coach', async () => {
      await setStaffStatus(coachStaffId, 'inactive');

      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'active' })
        .expect(200)
        .expect((res) => expect(res.body.status).toBe('active'));

      await expect(readStaffStatus(coachStaffId)).resolves.toBe('active');
    });

    it('is idempotent — disabling an already-disabled coach stays 200 and inactive', async () => {
      await setStaffStatus(coachStaffId, 'inactive');

      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      await expect(readStaffStatus(coachStaffId)).resolves.toBe('inactive');
    });

    it('shows the disabled coach in the owner\'s coach list, marked inactive', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const entry = (
        list.body.coaches as Array<{ userId: string; status: string }>
      ).find((c) => c.userId === coachUserId);
      expect(entry?.status).toBe('inactive');
    });
  });

  describe('the consequence — a disabled coach loses access', () => {
    it('lets an active coach reach the gym\'s coach routes', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
    });

    it('refuses a disabled coach on the gym\'s coach routes, despite an unexpired token still claiming the role', async () => {
      await setStaffStatus(coachStaffId, 'inactive');

      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);
    });

    it('restores access when the owner re-enables them', async () => {
      await setStaffStatus(coachStaffId, 'inactive');
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'active' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/coach/classes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
    });

    it('refuses a disabled coach a gym context, so they cannot re-acquire the role by switching', async () => {
      await setStaffStatus(coachStaffId, 'inactive');

      await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ gymId })
        .expect(403);
    });
  });

  describe('authorization', () => {
    it('401s with no token', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .send({ status: 'inactive' })
        .expect(401);

      await expect(readStaffStatus(coachStaffId)).resolves.toBe('active');
    });

    it('403s when a coach tries to disable a peer', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, peerCoachUserId))
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ status: 'inactive' })
        .expect(403);

      await expect(readStaffStatus(peerCoachStaffId)).resolves.toBe('active');
    });

    it('403s when an athlete tries to disable a coach', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ status: 'inactive' })
        .expect(403);

      await expect(readStaffStatus(coachStaffId)).resolves.toBe('active');
    });

    it('403s when the owner of another gym tries to disable this gym\'s coach, and writes nothing', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, coachUserId))
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({ status: 'inactive' })
        .expect(403);

      await expect(readStaffStatus(coachStaffId)).resolves.toBe('active');
    });
  });

  describe('the target must be a coach of this gym', () => {
    it('404s for a user who is not staff at the gym', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, strangerUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(404);
    });

    it('404s for a well-formed but unknown user id', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, uuid()))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(404);
    });

    it('400s on a malformed coach user id rather than reaching the database', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, 'not-a-uuid'))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(400);
    });

    it('404s when an owner aims this at their own ownership row, so they cannot lock themselves out of their gym', async () => {
      await request(app.getHttpServer())
        .patch(endpoint(gymId, ownerUserId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'inactive' })
        .expect(404);

      await expect(readStaffStatus(ownerStaffId)).resolves.toBe('active');
    });
  });
});
