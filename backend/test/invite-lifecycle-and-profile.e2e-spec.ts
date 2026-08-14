import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Invite Lifecycle and Profile E2E Tests
 *
 * Covers:
 *   GET    /api/invites/:inviteToken           — public: validate invite
 *   POST   /api/invites/:inviteToken/accept    — public: accept invite
 *   GET    /api/gyms/:gymId/invites            — owner: list invites
 *   DELETE /api/gyms/:gymId/invites/:token     — owner: revoke invite
 *   GET    /api/me                             — auth: get user profile
 *   PATCH  /api/me                             — auth: update user profile
 *   GET    /api/gyms/:gymId/profile            — owner: get gym profile
 *   PATCH  /api/gyms/:gymId/profile            — owner: update gym profile
 */
describe('Invite Lifecycle and Profile Endpoints (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const gymId = uuidv4();
  const ownerUserId = uuidv4();

  const otherGymId = uuidv4();
  const otherOwnerUserId = uuidv4();

  const athleteUserId = uuidv4();
  const athleteEmail = `athlete-profile-${uuidv4()}@test.local`;

  // Registered user who has not accepted anything yet — used for the
  // coach-invite acceptance test
  const newCoachUserId = uuidv4();
  const newCoachEmail = `coach-new-lifecycle-${uuidv4()}@test.local`;

  // Coach staffed at both gymId and otherGymId — used for the gym-context
  // switching tests
  const twoGymCoachUserId = uuidv4();
  const twoGymCoachEmail = `two-gym-coach-lifecycle-${uuidv4()}@test.local`;

  // Reused across invite tests
  let pendingInviteToken: string;

  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: `owner-lifecycle-${uuidv4()}@test.local`,
    gymId,
    role: 'owner',
  });

  const otherOwnerToken = generateTestToken({
    id: otherOwnerUserId,
    email: `owner-other-lifecycle-${uuidv4()}@test.local`,
    gymId: otherGymId,
    role: 'owner',
  });

  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: athleteEmail,
    gymId,
    role: 'athlete',
  });

  const newCoachToken = generateTestToken({
    id: newCoachUserId,
    email: newCoachEmail,
    gymId,
    role: 'athlete',
  });

  // Mirrors what login produces: the token names the first (oldest) gym the
  // coach is staffed at — this is the token the gym-context switch replaces.
  const twoGymCoachToken = generateTestToken({
    id: twoGymCoachUserId,
    email: twoGymCoachEmail,
    gymId,
    role: 'coach',
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
      await seedTestData();
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

  async function seedTestData() {
    if (!dataSource) throw new Error('DataSource not initialized');

    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, 'Lifecycle Owner',  'active', NOW()),
        ($3, $4, 'Other Gym Owner',  'active', NOW()),
        ($5, $6, 'Athlete User',     'active', NOW()),
        ($7, $8, 'New Coach User',   'active', NOW()),
        ($9, $10, 'Two-Gym Coach',   'active', NOW())
      `,
      [
        ownerUserId,
        `owner-lifecycle-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `owner-other-lifecycle-${uuidv4()}@test.local`,
        athleteUserId,
        athleteEmail,
        newCoachUserId,
        newCoachEmail,
        twoGymCoachUserId,
        twoGymCoachEmail,
      ],
    );

    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [gymId, 'Lifecycle Test Gym', 'Gym for lifecycle tests', 'Lisbon', ownerUserId, 'active'],
    );

    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [otherGymId, 'Other Lifecycle Gym', 'Other gym', 'Porto', otherOwnerUserId, 'active'],
    );

    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
    );

    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), otherGymId, otherOwnerUserId, 'owner', 'active'],
    );

    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt") VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), gymId, athleteUserId, 'active'],
    );

    // Two-gym coach: active staff at both gymId and otherGymId, so the
    // gym-context switch and /api/me/gyms tests have something to switch
    // between.
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), gymId, twoGymCoachUserId, 'coach', 'active'],
    );

    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), otherGymId, twoGymCoachUserId, 'coach', 'active'],
    );

    // Seed one pending invite for listing/revoking tests
    const inviteId = uuidv4();
    const inviteToken = `test-token-pending-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dataSource.query(
      `
      INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NOW())
      `,
      [
        inviteId,
        gymId,
        ownerUserId,
        `invitee-lifecycle-${uuidv4()}@test.local`,
        inviteToken,
        expiresAt,
        'pending',
      ],
    );

    pendingInviteToken = inviteToken;
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      await dataSource.query('DELETE FROM invites WHERE "gymId" IN ($1, $2)', [gymId, otherGymId]);
      await dataSource.query('DELETE FROM gym_memberships WHERE "gymId" IN ($1, $2)', [gymId, otherGymId]);
      await dataSource.query('DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)', [gymId, otherGymId]);
      await dataSource.query('DELETE FROM gyms WHERE id IN ($1, $2)', [gymId, otherGymId]);
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)', [ownerUserId, otherOwnerUserId, athleteUserId, newCoachUserId, twoGymCoachUserId]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/invites/:inviteToken — public: validate invite
  // ---------------------------------------------------------------------------
  describe('GET /api/invites/:inviteToken — validate invite (public)', () => {
    it('happy path → 200 with invite details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/invites/${pendingInviteToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('gymId', gymId);
      expect(body).toHaveProperty('gymName', 'Lifecycle Test Gym');
      expect(body).toHaveProperty('inviteeEmail');
      expect(body).toHaveProperty('expiresAt');
      expect(body).toHaveProperty('status', 'pending');
    });

    it('unknown token → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/invites/totally-nonexistent-token-xyz')
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/invites/:inviteToken/accept — public: accept invite
  // ---------------------------------------------------------------------------
  describe('POST /api/invites/:inviteToken/accept — accept invite (public)', () => {
    let acceptInviteToken: string;
    let acceptInviteId: string;

    beforeAll(async () => {
      if (!dataSource || !dataSource.isInitialized) return;

      const inviteId = uuidv4();
      const inviteToken = `test-token-accept-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await dataSource.query(
        `
        INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NOW())
        `,
        [inviteId, gymId, ownerUserId, athleteEmail, inviteToken, expiresAt, 'pending'],
      );

      acceptInviteToken = inviteToken;
      acceptInviteId = inviteId;
    });

    afterAll(async () => {
      if (!dataSource || !dataSource.isInitialized) return;
      try {
        // Remove the membership that was created by the accept, so cleanup is clean
        await dataSource.query(
          `DELETE FROM gym_memberships WHERE "gymId" = $1 AND "userId" = $2 AND id NOT IN (SELECT id FROM gym_memberships WHERE "gymId" = $2 LIMIT 0)`,
          [gymId, athleteUserId],
        );
      } catch {
        // ignore
      }
    });

    it('unknown token → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/invites/nonexistent-accept-token-xyz/accept')
        .expect(404);
    });

    it('already accepted invite → 400', async () => {
      if (!dataSource || !dataSource.isInitialized) return;

      // Seed an already-accepted invite
      const alreadyAcceptedId = uuidv4();
      const alreadyAcceptedToken = `test-token-already-accepted-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await dataSource.query(
        `
        INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
        `,
        [alreadyAcceptedId, gymId, ownerUserId, `accepted-invitee-${uuidv4()}@test.local`, alreadyAcceptedToken, expiresAt, 'accepted', ownerUserId],
      );

      await request(app.getHttpServer())
        .post(`/api/invites/${alreadyAcceptedToken}/accept`)
        .expect(400);

      await dataSource.query('DELETE FROM invites WHERE id = $1', [alreadyAcceptedId]);
    });

    it('expired invite → 400', async () => {
      if (!dataSource || !dataSource.isInitialized) return;

      const expiredId = uuidv4();
      const expiredToken = `test-token-expired-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      const expiredAt = new Date(Date.now() - 1000);

      await dataSource.query(
        `
        INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NOW())
        `,
        [expiredId, gymId, ownerUserId, `expired-invitee-${uuidv4()}@test.local`, expiredToken, expiredAt, 'pending'],
      );

      await request(app.getHttpServer())
        .post(`/api/invites/${expiredToken}/accept`)
        .expect(400);

      await dataSource.query('DELETE FROM invites WHERE id = $1', [expiredId]);
    });

    it('happy path (authenticated user) → 200 with gym and athlete details', async () => {
      // Remove existing membership to allow accept
      await dataSource!.query(
        `DELETE FROM gym_memberships WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, athleteUserId],
      );

      const response = await request(app.getHttpServer())
        .post(`/api/invites/${acceptInviteToken}/accept`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('message', 'Successfully joined gym');
      expect(body).toHaveProperty('gym');
      expect(body).toHaveProperty('role', 'athlete');
      expect(typeof body.token).toBe('string');
      expect((body.token as string).split('.')).toHaveLength(3);
      expect(body).toHaveProperty('user');
      expect(body).not.toHaveProperty('athlete');

      const gym = body.gym as Record<string, unknown>;
      expect(gym).toHaveProperty('id', gymId);
      expect(gym).toHaveProperty('name', 'Lifecycle Test Gym');

      const user = body.user as Record<string, unknown>;
      expect(user).toHaveProperty('id', athleteUserId);
      expect(user).toHaveProperty('email', athleteEmail);

      // Restore membership for subsequent tests
      await dataSource!.query(
        `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt") VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), gymId, athleteUserId, 'active'],
      );
    });

    it('athlete already member → 409', async () => {
      // Seed a new invite for the athlete (who is now already a member)
      const duplicateInviteId = uuidv4();
      const duplicateToken = `test-token-duplicate-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await dataSource!.query(
        `
        INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NOW())
        `,
        [duplicateInviteId, gymId, ownerUserId, athleteEmail, duplicateToken, expiresAt, 'pending'],
      );

      await request(app.getHttpServer())
        .post(`/api/invites/${duplicateToken}/accept`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(409);

      await dataSource!.query('DELETE FROM invites WHERE id = $1', [duplicateInviteId]);
    });

    it('accepting a coach invite creates active staff and returns a coach token', async () => {
      const token = `coach-invite-token-e2e-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      await dataSource!.query(
        `INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, role)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', 'pending', 'coach')`,
        [randomUUID(), gymId, ownerUserId, newCoachEmail, token],
      );

      const res = await request(app.getHttpServer())
        .post(`/api/invites/${token}/accept`)
        .set('Authorization', `Bearer ${newCoachToken}`)
        .expect(200);

      expect(res.body.role).toBe('coach');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toHaveProperty('id', newCoachUserId);

      const staff = await dataSource!.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, newCoachUserId],
      );
      expect(staff).toHaveLength(1);
      expect(staff[0].role).toBe('coach');
      expect(staff[0].status).toBe('active');

      const claims = JSON.parse(
        Buffer.from(res.body.token.split('.')[1], 'base64').toString('utf8'),
      );
      expect(claims.gymId).toBe(gymId);
      expect(claims.role).toBe('coach');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/gyms/:gymId/invites — owner: list invites
  // ---------------------------------------------------------------------------
  describe('GET /api/gyms/:gymId/invites — list invites', () => {
    it('happy path → 200 with array of invites', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as unknown[];
      expect(Array.isArray(body)).toBe(true);

      if (body.length > 0) {
        const item = body[0] as Record<string, unknown>;
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('inviteeEmail');
        expect(item).toHaveProperty('inviteToken');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('expiresAt');
        expect(item).toHaveProperty('acceptedAt');
      }
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites`)
        .expect(401);
    });

    it('athlete role (not owner) → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });

    it('owner of different gym (gymId mismatch) → 403', async () => {
      // otherOwnerToken has gymId=otherGymId but route has gymId → 403 from GymOwnershipGuard
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);
    });

    it('?role=coach → only coach invites', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites?role=coach`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Array<Record<string, unknown>>;
      expect(body.length).toBeGreaterThan(0);
      expect(body.some((item) => item.inviteeEmail === newCoachEmail)).toBe(
        true,
      );
      for (const item of body) {
        expect(item).toHaveProperty('role', 'coach');
      }
    });

    it('?role=athlete → only athlete invites', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites?role=athlete`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Array<Record<string, unknown>>;
      expect(body.length).toBeGreaterThan(0);
      expect(
        body.some((item) => item.inviteToken === pendingInviteToken),
      ).toBe(true);
      for (const item of body) {
        expect(item).toHaveProperty('role', 'athlete');
      }
    });

    it('?role=bogus → 400', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/invites?role=bogus`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/gyms/:gymId/invites/:token — owner: revoke invite
  // ---------------------------------------------------------------------------
  describe('DELETE /api/gyms/:gymId/invites/:token — revoke invite', () => {
    it('happy path → 200 with revoke confirmation', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${pendingInviteToken}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('message', 'Invite revoked');
    });

    it('already revoked invite → 400', async () => {
      // The invite seeded in beforeAll is now revoked from the happy path test above
      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${pendingInviteToken}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('nonexistent invite token → 404', async () => {
      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/totally-fake-token-xyz`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${pendingInviteToken}`)
        .expect(401);
    });

    it('athlete role (not owner) → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${pendingInviteToken}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });

    it('owner of different gym (gymId mismatch) → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${pendingInviteToken}`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);
    });

    it('already accepted invite → 400', async () => {
      if (!dataSource || !dataSource.isInitialized) return;

      const acceptedId = uuidv4();
      const acceptedToken = `test-token-accepted-revoke-${uuidv4().replace(/-/g, '')}`.slice(0, 43);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await dataSource.query(
        `
        INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, "acceptedAt", "acceptedByUserId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
        `,
        [acceptedId, gymId, ownerUserId, `accepted-${uuidv4()}@test.local`, acceptedToken, expiresAt, 'accepted', ownerUserId],
      );

      await request(app.getHttpServer())
        .delete(`/api/gyms/${gymId}/invites/${acceptedToken}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await dataSource.query('DELETE FROM invites WHERE id = $1', [acceptedId]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/me — get user profile
  // ---------------------------------------------------------------------------
  describe('GET /api/me — get user profile', () => {
    it('happy path → 200 with user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', athleteUserId);
      expect(body).toHaveProperty('email', athleteEmail);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('createdAt');
    });

    it('owner token also works (multi-role endpoint) → 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', ownerUserId);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/me')
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/me — update user profile
  // ---------------------------------------------------------------------------
  describe('PATCH /api/me — update user profile', () => {
    it('happy path → 200 with updated profile', async () => {
      const newName = `Updated Athlete ${uuidv4().slice(0, 8)}`;

      const response = await request(app.getHttpServer())
        .patch('/api/me')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ name: newName })
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', athleteUserId);
      expect(body).toHaveProperty('name', newName);
      expect(body).toHaveProperty('email', athleteEmail);
    });

    it('missing name → 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({})
        .expect(400);
    });

    it('empty name string → 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .send({ name: 'Some Name' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/gyms/:gymId/profile — owner: get gym profile
  // ---------------------------------------------------------------------------
  describe('GET /api/gyms/:gymId/profile — get gym profile', () => {
    it('happy path → 200 with gym profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', gymId);
      expect(body).toHaveProperty('name', 'Lifecycle Test Gym');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('location', 'Lisbon');
      expect(body).toHaveProperty('status', 'active');
      expect(body).toHaveProperty('createdAt');
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/profile`)
        .expect(401);
    });

    it('athlete role (not owner) → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });

    it('owner of different gym (gymId mismatch) → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/gyms/:gymId/profile — owner: update gym profile
  // ---------------------------------------------------------------------------
  describe('PATCH /api/gyms/:gymId/profile — update gym profile', () => {
    it('happy path → 200 with updated profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Lifecycle Gym', location: 'Cascais' })
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', gymId);
      expect(body).toHaveProperty('name', 'Updated Lifecycle Gym');
      expect(body).toHaveProperty('location', 'Cascais');
      expect(body).toHaveProperty('status', 'active');
    });

    it('empty name string → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .send({ name: 'Some Name' })
        .expect(401);
    });

    it('athlete role (not owner) → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('owner of different gym (gymId mismatch) → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({ name: 'Cross-gym Hack' })
        .expect(403);
    });

    it('partial update (only description) → 200', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/gyms/${gymId}/profile`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: 'Updated description for lifecycle gym' })
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', gymId);
      expect(body).toHaveProperty('description', 'Updated description for lifecycle gym');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/me/gyms — list gyms for the caller
  // POST /api/auth/gym-context — re-sign the token for another attached gym
  // ---------------------------------------------------------------------------
  describe('GET /api/me/gyms and POST /api/auth/gym-context', () => {
    it('lists both gyms for a coach staffing two', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/me/gyms')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .expect(200);

      const ids = res.body.gyms.map((g: { gymId: string }) => g.gymId);
      expect(ids).toContain(gymId);
      expect(ids).toContain(otherGymId);
      expect(res.body.gyms.every((g: { role: string }) => g.role === 'coach')).toBe(true);
    });

    it('re-signs the token for the second gym', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .send({ gymId: otherGymId })
        .expect(200);

      const claims = JSON.parse(
        Buffer.from(res.body.accessToken.split('.')[1], 'base64').toString('utf8'),
      );
      expect(claims.gymId).toBe(otherGymId);
      expect(claims.role).toBe('coach');
    });

    it('the re-signed token opens the second gym, which the old one could not', async () => {
      // The claim this whole phase exists for: the guard compares route gymId
      // to the token, so the pre-switch token must be refused here.
      await request(app.getHttpServer())
        .get(`/api/gyms/${otherGymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .expect(403);

      const switched = await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .send({ gymId: otherGymId })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/gyms/${otherGymId}/coach/classes`)
        .set('Authorization', `Bearer ${switched.body.accessToken}`)
        .expect(200);
    });

    it('refuses a gym the caller is not attached to → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ gymId: otherGymId })
        .expect(403);
    });

    it('rejects a non-uuid gymId → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ gymId: 'not-a-uuid' })
        .expect(400);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer()).get('/api/me/gyms').expect(401);
    });
  });
});
