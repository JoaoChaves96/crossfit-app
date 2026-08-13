import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Coach Invitation E2E Tests
 *
 * Endpoint: POST /api/gyms/:gymId/configuration/coaches
 *
 * Request body:
 *   { coachEmail: string }  — must be a valid email address
 *
 * Response (201) — an invite, not a staff assignment:
 *   {
 *     inviteToken:  string
 *     inviteLink:   string   — contains "/invite/"
 *     expiresAt:    ISO date string
 *     inviteeEmail: string
 *     role:         'coach'
 *   }
 *
 * No `gym_staff` row and no `users` row is created by this endpoint. The
 * invitee only becomes staff by accepting the invite (see
 * invite-lifecycle-and-profile.e2e-spec.ts).
 *
 * Auth: header-based — x-user-id (acting user), x-gym-id (gym context)
 * Authorization: acting user must have gym_staff row with role='owner', status='active' for the gym
 *
 * Validates:
 * 1. Successful invite when coach user already exists — no staff row yet
 * 2. Inviting an email not registered in users → 201, no user row created
 * 3. Duplicate invite: already-active staff → 409; duplicate pending invite → 409
 * 4. Non-owner requesting invite → 403
 * 5. Missing email field → 400
 * 6. Invalid (non-email) email field → 400
 * 7. Gym scoping: owner of gym A cannot invite into gym B
 */
describe('Coach Invitation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Fixed IDs for the primary gym
  const gymId = uuidv4();
  const ownerUserId = uuidv4();

  // IDs for a second gym (scoping tests)
  const otherGymId = uuidv4();
  const otherOwnerUserId = uuidv4();

  // Existing coach user (pre-registered), not yet staff
  const existingCoachUserId = uuidv4();
  const existingCoachEmail = `coach-existing-${uuidv4()}@test.local`;

  // Coach user already assigned as active staff — used for the
  // "already assigned" duplicate case
  const assignedCoachUserId = uuidv4();
  const assignedCoachEmail = `coach-assigned-${uuidv4()}@test.local`;

  // Athlete user (no owner role)
  const athleteUserId = uuidv4();
  const athleteEmail = `athlete-${uuidv4()}@test.local`;

  // Email that has no registered user
  const newCoachEmail = `coach-new-${uuidv4()}@test.local`;

  // JWTs for each actor
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner-primary@invite-coach.test',
    gymId,
    role: 'owner',
  });
  const otherOwnerToken = generateTestToken({
    id: otherOwnerUserId,
    email: 'owner-other@invite-coach.test',
    gymId: otherGymId,
    role: 'owner',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@invite-coach.test',
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

    // Users: owner, other owner, existing coach, assigned coach, athlete
    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, 'Primary Owner',    'active', NOW()),
        ($3, $4, 'Other Gym Owner',  'active', NOW()),
        ($5, $6, 'Existing Coach',   'active', NOW()),
        ($7, $8, 'Assigned Coach',   'active', NOW()),
        ($9, $10, 'Athlete User',    'active', NOW())
      `,
      [
        ownerUserId,
        `owner-primary-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `owner-other-${uuidv4()}@test.local`,
        existingCoachUserId,
        existingCoachEmail,
        assignedCoachUserId,
        assignedCoachEmail,
        athleteUserId,
        athleteEmail,
      ],
    );

    // Primary gym
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [
        gymId,
        'Primary Test Gym',
        'Gym for coach invitation tests',
        'Lisbon',
        ownerUserId,
        'active',
      ],
    );

    // Other gym
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [
        otherGymId,
        'Other Test Gym',
        'Second gym for scoping tests',
        'Porto',
        otherOwnerUserId,
        'active',
      ],
    );

    // gym_staff: primary owner in primary gym
    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
    );

    // gym_staff: other owner in other gym
    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [uuidv4(), otherGymId, otherOwnerUserId, 'owner', 'active'],
    );

    // gym_staff: assignedCoach already active in primary gym — used to
    // exercise the "already assigned" duplicate-invite case
    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [uuidv4(), gymId, assignedCoachUserId, 'coach', 'active'],
    );

    // gym_membership: athlete in primary gym (not an owner)
    await dataSource.query(
      `
      INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [uuidv4(), gymId, athleteUserId, 'active'],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      await dataSource.query(
        'DELETE FROM invites WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query(
        'DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)',
        [gymId, otherGymId],
      );
      await dataSource.query(
        'DELETE FROM gym_memberships WHERE "gymId" IN ($1, $2)',
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
          otherOwnerUserId,
          existingCoachUserId,
          assignedCoachUserId,
          athleteUserId,
        ],
      );
      // No user row is ever auto-created for an unknown invitee email, but
      // clean up defensively in case a regression creates one.
      await dataSource.query('DELETE FROM users WHERE email = $1', [
        newCoachEmail,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Successful invite — coach user already exists, no staff row yet
  // ---------------------------------------------------------------------------
  describe('Test 1: Successful coach invite (existing user)', () => {
    it('POST /api/gyms/:gymId/configuration/coaches → 201 with an invite, no staff row', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(201);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('inviteToken');
      expect(typeof body.inviteToken).toBe('string');
      expect(body).toHaveProperty('inviteLink');
      expect(body.inviteLink as string).toContain('/invite/');
      expect(body).toHaveProperty('expiresAt');
      expect(body).toHaveProperty('inviteeEmail', existingCoachEmail);
      expect(body).toHaveProperty('role', 'coach');

      const staffRows = await dataSource!.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, existingCoachUserId],
      );
      expect(staffRows).toHaveLength(0);

      const inviteRows = await dataSource!.query(
        `SELECT * FROM invites WHERE "gymId" = $1 AND "inviteeEmail" = $2`,
        [gymId, existingCoachEmail],
      );
      expect(inviteRows).toHaveLength(1);
      expect(inviteRows[0].role).toBe('coach');
      expect(inviteRows[0].status).toBe('pending');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Inviting an email not registered in users → 201, no user row created
  // ---------------------------------------------------------------------------
  describe('Test 2: Coach email not registered', () => {
    it('POST with an unknown email → 201 and no user row is created', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: newCoachEmail })
        .expect(201);

      expect(res.body.role).toBe('coach');
      expect(res.body.inviteToken).toBeTruthy();
      expect(res.body.inviteeEmail).toBe(newCoachEmail);

      const users = await dataSource!.query(
        `SELECT * FROM users WHERE email = $1`,
        [newCoachEmail],
      );
      expect(users).toHaveLength(0);

      const inviteRows = await dataSource!.query(
        `SELECT * FROM invites WHERE "gymId" = $1 AND "inviteeEmail" = $2`,
        [gymId, newCoachEmail],
      );
      expect(inviteRows).toHaveLength(1);
      expect(inviteRows[0].status).toBe('pending');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Duplicate invite cases → 409
  // ---------------------------------------------------------------------------
  describe('Test 3: Duplicate coach invite', () => {
    it('POST for a coach already assigned as active staff → 409', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: assignedCoachEmail })
        .expect(409);

      // No second staff row and no invite row were created by the conflict
      const staffRows = await dataSource!.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, assignedCoachUserId],
      );
      expect(staffRows).toHaveLength(1);
    });

    it('POST for an email with an already-pending invite → 409', async () => {
      // existingCoachEmail was already invited (and is still pending) in Test 1
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(409);

      // Still exactly one pending invite for that email — the duplicate attempt
      // did not create a second row
      const inviteRows = await dataSource!.query(
        `SELECT * FROM invites WHERE "gymId" = $1 AND "inviteeEmail" = $2`,
        [gymId, existingCoachEmail],
      );
      expect(inviteRows).toHaveLength(1);
      expect(inviteRows[0].status).toBe('pending');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Non-owner tries to invite → 403
  // ---------------------------------------------------------------------------
  describe('Test 4: Non-owner cannot invite a coach', () => {
    it('POST by athlete user → 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(403);
    });

    it('POST by owner of a different gym → 403', async () => {
      // otherOwnerUserId is owner of otherGymId but not gymId
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Missing email field → 400
  // ---------------------------------------------------------------------------
  describe('Test 5: Missing email field', () => {
    it('POST without coachEmail → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Invalid email format → 400
  // ---------------------------------------------------------------------------
  describe('Test 6: Invalid email format', () => {
    it('POST with non-email string → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: 'not-an-email' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6b: Email exceeding RFC 5321 max length → 400
  // ---------------------------------------------------------------------------
  describe('Test 6b: Email exceeding 254 characters', () => {
    it('POST with email > 254 chars → 400', async () => {
      const oversizedEmail = `${'a'.repeat(244)}@test.local`;
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: oversizedEmail })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Gym scoping — owner of gym A cannot write into gym B via route
  // ---------------------------------------------------------------------------
  describe('Test 7: Gym scoping — route gymId must match x-gym-id context', () => {
    it('POST to otherGymId with ownerUserId (not owner there) → 403', async () => {
      // ownerUserId is owner of gymId but not otherGymId
      const ownerScopedToOtherGymToken = generateTestToken({
        id: ownerUserId,
        email: 'owner-primary@invite-coach.test',
        gymId: otherGymId,
        role: 'owner',
      });
      await request(app.getHttpServer())
        .post(`/api/gyms/${otherGymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerScopedToOtherGymToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(403);
    });
  });
});

// ---------------------------------------------------------------------------
// The "Coach Invitation — Transaction Rollback (e2e)" describe block that
// used to live here has been removed. It asserted that a `users` row
// inserted by InviteCoachHandler rolled back atomically with the
// `gym_staff` row when the staff save failed. As of Tasks 3/4, the invite
// endpoint performs a single `invites` row insert and never touches
// `users` or `gym_staff` — there is no multi-row write left to roll back,
// so the scenario the test existed to guard no longer applies.
// ---------------------------------------------------------------------------
