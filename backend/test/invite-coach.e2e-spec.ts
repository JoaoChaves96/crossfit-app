import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CommandHandler } from '@nestjs/cqrs';
import { generateTestToken } from './helpers/jwt.helper';
import { InviteCoachHandler } from '../src/commands/gym-configuration/handlers/invite-coach.handler';
import { InviteCoachCommand } from '../src/commands/gym-configuration/invite-coach.command';
import { UserEntity } from '../src/domain/user/entities/user.entity';

// Faulty subclass used by the rollback test suite.
// Defined at module scope so @CommandHandler metadata is applied before
// the test module is compiled.
@CommandHandler(InviteCoachCommand)
class FaultyInviteCoachHandler extends InviteCoachHandler {
  override async execute(command: InviteCoachCommand): Promise<never> {
    return (
      this as unknown as { dataSource: DataSource }
    ).dataSource.transaction(async (manager: EntityManager) => {
      const userRepo = manager.getRepository(UserEntity);

      const coachUser = await userRepo.findOne({
        where: { email: command.coachEmail },
      });
      if (!coachUser) {
        const newUser = new UserEntity();
        newUser.id = uuidv4();
        newUser.email = command.coachEmail;
        newUser.name = 'Coach';
        newUser.passwordHash = null;
        newUser.socialLoginId = null;
        newUser.status = 'pending';
        await userRepo.save(newUser);
      }

      // Simulate failure during gym_staff creation — triggers transaction rollback
      throw new Error('Simulated gym_staff save failure');
    });
  }
}

/**
 * Coach Invitation E2E Tests
 *
 * Endpoint: POST /api/gyms/:gymId/configuration/coaches
 *
 * Request body:
 *   { coachEmail: string }  — must be a valid email address
 *
 * Response (201):
 *   {
 *     id:         string   — gym_staff row id
 *     gymId:      string
 *     userId:     string   — id of the invited coach user
 *     role:       'coach'
 *     status:     'active'
 *     assignedAt: ISO date string
 *   }
 *
 * Auth: header-based — x-user-id (acting user), x-gym-id (gym context)
 * Authorization: acting user must have gym_staff row with role='owner', status='active' for the gym
 *
 * Validates:
 * 1. Successful invitation when coach user already exists
 * 2. Inviting a coach whose email is not registered → 201 (user auto-created)
 * 3. Inviting an already-assigned coach → 400
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

  // Existing coach user (pre-registered)
  const existingCoachUserId = uuidv4();
  const existingCoachEmail = `coach-existing-${uuidv4()}@test.local`;

  // Athlete user (no owner role)
  const athleteUserId = uuidv4();
  const athleteEmail = `athlete-${uuidv4()}@test.local`;

  // Email that has no registered user — will be auto-created
  const newCoachEmail = `coach-new-${uuidv4()}@test.local`;

  // Tracks gym_staff rows created during tests so cleanup is reliable
  const createdStaffIds: string[] = [];

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

    // Users: owner, other owner, existing coach, athlete
    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, 'Primary Owner',    'active', NOW()),
        ($3, $4, 'Other Gym Owner',  'active', NOW()),
        ($5, $6, 'Existing Coach',   'active', NOW()),
        ($7, $8, 'Athlete User',     'active', NOW())
      `,
      [
        ownerUserId,
        `owner-primary-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `owner-other-${uuidv4()}@test.local`,
        existingCoachUserId,
        existingCoachEmail,
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
      // Remove all gym_staff rows for the test gyms
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
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [
        ownerUserId,
        otherOwnerUserId,
        existingCoachUserId,
        athleteUserId,
      ]);
      // Clean up auto-created user for newCoachEmail if it exists
      await dataSource.query('DELETE FROM users WHERE email = $1', [
        newCoachEmail,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Successful invitation — coach user already exists
  // ---------------------------------------------------------------------------
  describe('Test 1: Successful coach invitation (existing user)', () => {
    let responseBody: Record<string, unknown>;

    it('POST /api/gyms/:gymId/configuration/coaches → 201', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(201);

      responseBody = response.body as Record<string, unknown>;

      expect(responseBody).toHaveProperty('id');
      expect(typeof responseBody.id).toBe('string');
      expect(responseBody).toHaveProperty('gymId', gymId);
      expect(responseBody).toHaveProperty('userId', existingCoachUserId);
      expect(responseBody).toHaveProperty('role', 'coach');
      expect(responseBody).toHaveProperty('status', 'active');
      expect(responseBody).toHaveProperty('assignedAt');

      // Track the created staff row id for cleanup assertions
      createdStaffIds.push(responseBody.id as string);
    });

    it('gym_staff row persisted with role=coach', async () => {
      if (!dataSource || !dataSource.isInitialized) return;

      const rows = await dataSource.query(
        `SELECT * FROM gym_staff WHERE id = $1`,
        [createdStaffIds[0]],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('coach');
      expect(rows[0].status).toBe('active');
      expect(rows[0].gymId).toBe(gymId);
      expect(rows[0].userId).toBe(existingCoachUserId);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Inviting an email not registered in users → 201 (user auto-created)
  // ---------------------------------------------------------------------------
  describe('Test 2: Coach email not registered — user auto-created', () => {
    let newUserId: string;

    it('POST with unknown email → 201', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: newCoachEmail })
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('gymId', gymId);
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('role', 'coach');
      expect(body).toHaveProperty('status', 'active');
      expect(body).toHaveProperty('assignedAt');

      newUserId = body.userId as string;
      createdStaffIds.push(body.id as string);
    });

    it('new user row created in users table', async () => {
      if (!dataSource || !dataSource.isInitialized || !newUserId) return;

      const rows = await dataSource.query(`SELECT * FROM users WHERE id = $1`, [
        newUserId,
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe(newCoachEmail);
      expect(rows[0].status).toBe('pending');
    });

    it('gym_staff row persisted for the new user', async () => {
      if (!dataSource || !dataSource.isInitialized || !newUserId) return;

      const rows = await dataSource.query(
        `SELECT * FROM gym_staff WHERE "userId" = $1 AND "gymId" = $2`,
        [newUserId, gymId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('coach');
      expect(rows[0].status).toBe('active');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2b: Invited coach user is created with status=pending
  // ---------------------------------------------------------------------------
  describe('Test 2b: Auto-created user has status pending', () => {
    const pendingCoachEmail = `coach-pending-${uuidv4()}@test.local`;
    let pendingUserId: string;

    afterAll(async () => {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.query(
          'DELETE FROM gym_staff WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
          [pendingCoachEmail],
        );
        await dataSource.query('DELETE FROM users WHERE email = $1', [
          pendingCoachEmail,
        ]);
      }
    });

    it('POST with new email → 201', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: pendingCoachEmail })
        .expect(201);

      const body = response.body as Record<string, unknown>;
      pendingUserId = body.userId as string;
    });

    it('auto-created user has status=pending', async () => {
      if (!dataSource || !dataSource.isInitialized || !pendingUserId) return;

      const rows = await dataSource.query(`SELECT * FROM users WHERE id = $1`, [
        pendingUserId,
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('pending');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2c: Auto-created user has name="Coach", not their email address
  // ---------------------------------------------------------------------------
  describe('Test 2c: Auto-created user has placeholder name, not email', () => {
    const placeholderCoachEmail = `coach-placeholder-${uuidv4()}@test.local`;
    let placeholderUserId: string;

    afterAll(async () => {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.query(
          'DELETE FROM gym_staff WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
          [placeholderCoachEmail],
        );
        await dataSource.query('DELETE FROM users WHERE email = $1', [
          placeholderCoachEmail,
        ]);
      }
    });

    it('POST with new email → 201', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: placeholderCoachEmail })
        .expect(201);

      const body = response.body as Record<string, unknown>;
      placeholderUserId = body.userId as string;
    });

    it('auto-created user has name="Coach", not their email', async () => {
      if (!dataSource || !dataSource.isInitialized || !placeholderUserId)
        return;

      const rows = await dataSource.query(`SELECT * FROM users WHERE id = $1`, [
        placeholderUserId,
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Coach');
      expect(rows[0].name).not.toBe(placeholderCoachEmail);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Inviting already-assigned coach → 400
  // ---------------------------------------------------------------------------
  describe('Test 3: Coach already assigned to gym', () => {
    it('POST with duplicate email (existing user) → 400', async () => {
      // existingCoachEmail was already invited in Test 1
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: existingCoachEmail })
        .expect(400);
    });

    it('POST with duplicate email (auto-created user) → 400', async () => {
      // newCoachEmail was already invited in Test 2
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: newCoachEmail })
        .expect(400);
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
// Test 8: Transaction rollback — user creation rolls back when staff save fails
// ---------------------------------------------------------------------------
describe('Coach Invitation — Transaction Rollback (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const rollbackCoachEmail = `coach-rollback-${uuidv4()}@test.local`;

  const rollbackOwnerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner-rollback@invite-coach.test',
    gymId,
    role: 'owner',
  });

  beforeAll(async () => {
    // Build a module where InviteCoachHandler is replaced by FaultyInviteCoachHandler,
    // which simulates a gym_staff save failure AFTER the user row has been written
    // inside the same transaction. This verifies that both writes roll back atomically.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InviteCoachHandler)
      .useClass(FaultyInviteCoachHandler)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      await dataSource.query(
        `INSERT INTO users (id, email, name, status, "createdAt")
         VALUES ($1, $2, 'Rollback Owner', 'active', NOW())`,
        [ownerUserId, `owner-rollback-${uuidv4()}@test.local`],
      );
      await dataSource.query(
        `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          gymId,
          'Rollback Test Gym',
          'Gym for rollback tests',
          'Lisbon',
          ownerUserId,
          'active',
        ],
      );
      await dataSource.query(
        `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), gymId, ownerUserId, 'owner', 'active'],
      );
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.query('DELETE FROM gym_staff WHERE "gymId" = $1', [
          gymId,
        ]);
        await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
        await dataSource.query('DELETE FROM users WHERE id = $1', [
          ownerUserId,
        ]);
        await dataSource.query('DELETE FROM users WHERE email = $1', [
          rollbackCoachEmail,
        ]);
      } catch {
        // silently ignore cleanup errors
      }
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  it('POST /api/gyms/:gymId/configuration/coaches → 500 when staff save fails', async () => {
    await request(app.getHttpServer())
      .post(`/api/gyms/${gymId}/configuration/coaches`)
      .set('Authorization', `Bearer ${rollbackOwnerToken}`)
      .send({ coachEmail: rollbackCoachEmail })
      .expect(500);
  });

  it('user row is NOT persisted when gym_staff save fails (transaction rolled back)', async () => {
    if (!dataSource || !dataSource.isInitialized) return;

    const rows = await dataSource.query(
      `SELECT * FROM users WHERE email = $1`,
      [rollbackCoachEmail],
    );

    expect(rows).toHaveLength(0);
  });

  it('gym_staff row is NOT persisted when gym_staff save fails', async () => {
    if (!dataSource || !dataSource.isInitialized) return;

    const rows = await dataSource.query(
      `SELECT * FROM gym_staff WHERE "gymId" = $1 AND role = 'coach'`,
      [gymId],
    );

    expect(rows).toHaveLength(0);
  });
});
