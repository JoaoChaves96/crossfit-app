import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { AssignMembershipPlanHandler } from '../src/commands/gym-configuration/handlers/assign-membership-plan.handler';
import { AssignMembershipPlanCommand } from '../src/commands/gym-configuration/assign-membership-plan.command';
import { AthleteMembershipPlanRepository } from '../src/repositories/athlete-membership-plan.repository';

/**
 * Membership plan history (e2e)
 *
 * Proves against a real database that a gym membership may hold MANY
 * athlete_membership_plans rows over time — the schema used to carry an
 * accidental UNIQUE("gymMembershipId"), emitted by a OneToOne, which made the
 * atomic expire-then-create pattern fail with a duplicate key for any member
 * who already had a plan row.
 *
 * A mocked unit spec cannot exercise this: the constraint lives in the
 * database, so only a real insert can show it is gone.
 *
 * Every row this suite creates is deleted in afterAll; nothing else in the
 * database is touched.
 */
describe('Membership plan history (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;
  let handler: AssignMembershipPlanHandler;
  let planRepository: AthleteMembershipPlanRepository;

  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const athleteUserId = uuidv4();
  const gymStaffId = uuidv4();
  const gymMembershipId = uuidv4();
  const firstPlanId = uuidv4();
  const secondPlanId = uuidv4();
  const seededAthletePlanId = uuidv4();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    handler = moduleFixture.get(AssignMembershipPlanHandler);
    planRepository = moduleFixture.get(AthleteMembershipPlanRepository);

    if (!dataSource || !dataSource.isInitialized) {
      throw new Error(
        'DataSource not initialized — is the dev database reachable?',
      );
    }

    await setupTestData();
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
    if (!dataSource) {
      throw new Error('DataSource not initialized');
    }

    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES ($1, $2, $3, 'active', NOW()), ($4, $5, $6, 'active', NOW())
    `,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        'History Owner',
        athleteUserId,
        `athlete-${uuidv4()}@test.local`,
        'History Athlete',
      ],
    );

    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, 'Test Gym History', 'Test gym description', 'Test Location', $2, 'active', NOW(), NOW())
    `,
      [gymId, ownerUserId],
    );

    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES ($1, $2, $3, 'owner', 'active', NOW())
    `,
      [gymStaffId, gymId, ownerUserId],
    );

    await dataSource.query(
      `
      INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status)
      VALUES ($1, $2, 'History Basic', 50, 'monthly', '', 'active'),
             ($3, $2, 'History Premium', 90, 'monthly', '', 'active')
    `,
      [firstPlanId, gymId, secondPlanId],
    );

    await dataSource.query(
      `
      INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
      VALUES ($1, $2, $3, 'active', NOW())
    `,
      [gymMembershipId, gymId, athleteUserId],
    );

    // The member ALREADY holds a plan row — the exact situation the UNIQUE
    // constraint made unassignable.
    await dataSource.query(
      `
      INSERT INTO athlete_membership_plans
        (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt", "autoRoll", "autoRollCount")
      VALUES ($1, $2, $3, 'active', NOW(), NULL, true, 0)
    `,
      [seededAthletePlanId, gymMembershipId, firstPlanId],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      await dataSource.query(
        'DELETE FROM athlete_membership_plans WHERE "gymMembershipId" = $1',
        [gymMembershipId],
      );
      await dataSource.query('DELETE FROM gym_memberships WHERE id = $1', [
        gymMembershipId,
      ]);
      await dataSource.query(
        'DELETE FROM membership_plans WHERE id = ANY($1)',
        [[firstPlanId, secondPlanId]],
      );
      await dataSource.query('DELETE FROM gym_staff WHERE id = $1', [
        gymStaffId,
      ]);
      await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
      await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
        [ownerUserId, athleteUserId],
      ]);
    } catch (error) {
      // Leave a signal instead of silently swallowing a partial cleanup.
      console.warn(
        '[membership-plan-history.e2e-spec] cleanup failed, some test rows may remain:',
        error,
      );
    }
  }

  it('has no old OneToOne-generated UNIQUE constraint, and does have the partial one-active-row index', async () => {
    const oldConstraint = await dataSource!.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'athlete_membership_plans'::regclass
        AND conname = 'REL_160876fc498111a4b78a6e08bc'
    `);
    expect(oldConstraint).toEqual([]);

    const partialIndex = await dataSource!.query(`
      SELECT indexdef
      FROM pg_indexes
      WHERE tablename = 'athlete_membership_plans'
        AND indexname = 'IDX_athlete_membership_plans_one_active'
    `);
    expect(partialIndex).toHaveLength(1);
    expect(partialIndex[0].indexdef).toContain('UNIQUE');
    expect(partialIndex[0].indexdef).toContain(
      "WHERE ((status)::text = 'active'::text)",
    );
  });

  it('assigns a new plan to a member who already has one, expiring the old row', async () => {
    const result = await handler.execute(
      new AssignMembershipPlanCommand(
        ownerUserId,
        gymId,
        gymMembershipId,
        secondPlanId,
      ),
    );

    expect(result.membershipPlanId).toBe(secondPlanId);
    expect(result.status).toBe('active');
    expect(result.autoRoll).toBe(true);
    expect(result.autoRollCount).toBe(0);

    const rows = await dataSource!.query(
      `
      SELECT id, "membershipPlanId", status
      FROM athlete_membership_plans
      WHERE "gymMembershipId" = $1
      ORDER BY "startedAt" ASC
    `,
      [gymMembershipId],
    );

    // Two rows now coexist for one membership — impossible before this fix.
    expect(rows).toHaveLength(2);
    expect(
      rows.filter((row: { status: string }) => row.status === 'active'),
    ).toHaveLength(1);

    const seeded = rows.find(
      (row: { id: string }) => row.id === seededAthletePlanId,
    );
    expect(seeded.status).toBe('expired');
  });

  it('reads the active row as the current plan, never the expired one', async () => {
    // Stand-alone: assigns its own second plan rather than depending on the
    // row created by the previous test.
    await handler.execute(
      new AssignMembershipPlanCommand(
        ownerUserId,
        gymId,
        gymMembershipId,
        secondPlanId,
      ),
    );

    const current =
      await planRepository.getActivePlanByGymMembership(gymMembershipId);

    expect(current).not.toBeNull();
    expect(current!.status).toBe('active');
    expect(current!.id).not.toBe(seededAthletePlanId);
    expect(current!.membershipPlanId).toBe(secondPlanId);
    expect(current!.membershipPlan.name).toBe('History Premium');
  });

  it('keeps the whole history readable, expired rows included', async () => {
    // Stand-alone: assigns its own second plan rather than depending on rows
    // created by earlier tests.
    await handler.execute(
      new AssignMembershipPlanCommand(
        ownerUserId,
        gymId,
        gymMembershipId,
        secondPlanId,
      ),
    );

    const history =
      await planRepository.getAllPlansByGymMembership(gymMembershipId);

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((row) => row.status === 'active')).toBe(true);
    expect(history.some((row) => row.status === 'expired')).toBe(true);
  });
});
