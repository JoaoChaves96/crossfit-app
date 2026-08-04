import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
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
        ($5, $6, 'Athlete User',     'active', NOW())
      `,
      [
        ownerUserId,
        `owner-lifecycle-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `owner-other-lifecycle-${uuidv4()}@test.local`,
        athleteUserId,
        athleteEmail,
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
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [ownerUserId, otherOwnerUserId, athleteUserId]);
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
      expect(body).toHaveProperty('athlete');

      const gym = body.gym as Record<string, unknown>;
      expect(gym).toHaveProperty('id', gymId);
      expect(gym).toHaveProperty('name', 'Lifecycle Test Gym');

      const athlete = body.athlete as Record<string, unknown>;
      expect(athlete).toHaveProperty('id', athleteUserId);
      expect(athlete).toHaveProperty('email', athleteEmail);

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
});
