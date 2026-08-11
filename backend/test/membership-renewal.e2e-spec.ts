import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { MembershipRenewalScheduler } from '../src/domain/athlete-membership-plan/membership-renewal.scheduler';

/**
 * MembershipRenewalScheduler (e2e)
 *
 * Proves the finder (AthleteMembershipPlanRepository.findDueForRenewal) and
 * the sweep (MembershipRenewalScheduler.rollOrExpireMemberships) together
 * against a real database — in particular that a plan with a null
 * expiresAt (unlimited) is excluded from the sweep and left untouched,
 * which the mocked unit spec cannot exercise.
 *
 * Uses real database access. Dates are kept months away from `now` so no
 * server timezone offset can flip an assertion.
 */
describe('MembershipRenewalScheduler (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;
  let scheduler: MembershipRenewalScheduler;

  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const athleteUnlimitedUserId = uuidv4();
  const athleteExpiredUserId = uuidv4();
  const membershipPlanId = uuidv4();
  const gymMembershipUnlimitedId = uuidv4();
  const gymMembershipExpiredId = uuidv4();
  const athletePlanUnlimitedId = uuidv4();
  const athletePlanExpiredId = uuidv4();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    scheduler = moduleFixture.get(MembershipRenewalScheduler);

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
    if (!dataSource) {
      throw new Error('DataSource not initialized');
    }

    // 1. Users
    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, $3, $4, NOW()),
        ($5, $6, $7, $8, NOW()),
        ($9, $10, $11, $12, NOW())
    `,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        'Test Owner',
        'active',
        athleteUnlimitedUserId,
        `athlete-unlimited-${uuidv4()}@test.local`,
        'Test Athlete Unlimited',
        'active',
        athleteExpiredUserId,
        `athlete-expired-${uuidv4()}@test.local`,
        'Test Athlete Expired',
        'active',
      ],
    );

    // 2. Gym
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `,
      [
        gymId,
        'Test Gym Renewal',
        'Test gym description',
        'Test Location',
        ownerUserId,
        'active',
      ],
    );

    // 3. MembershipPlan (monthly)
    await dataSource.query(
      `
      INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [membershipPlanId, gymId, 'Unlimited', 99, 'monthly', '', 'active'],
    );

    // 4. GymMemberships (athletes)
    await dataSource.query(
      `
      INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
      VALUES
        ($1, $2, $3, $4, NOW()),
        ($5, $2, $6, $4, NOW())
    `,
      [
        gymMembershipUnlimitedId,
        gymId,
        athleteUnlimitedUserId,
        'active',
        gymMembershipExpiredId,
        athleteExpiredUserId,
      ],
    );

    // 5. AthleteMembershipPlans:
    //    (a) active, expiresAt = NULL (unlimited, must never be swept)
    //    (b) active, expiresAt well in the past (due for the sweep)
    await dataSource.query(
      `
      INSERT INTO athlete_membership_plans
        (id, "gymMembershipId", "membershipPlanId", status, "startedAt", "expiresAt", "autoRoll", "autoRollCount")
      VALUES
        ($1, $2, $3, 'active', NOW(), NULL, true, 0),
        ($4, $5, $3, 'active', NOW(), $6, true, 0)
    `,
      [
        athletePlanUnlimitedId,
        gymMembershipUnlimitedId,
        membershipPlanId,
        athletePlanExpiredId,
        gymMembershipExpiredId,
        new Date('2026-01-01T00:00:00.000Z'),
      ],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      await dataSource.query(
        'DELETE FROM athlete_membership_plans WHERE id = ANY($1)',
        [[athletePlanUnlimitedId, athletePlanExpiredId]],
      );
      await dataSource.query(
        'DELETE FROM gym_memberships WHERE id = ANY($1)',
        [[gymMembershipUnlimitedId, gymMembershipExpiredId]],
      );
      await dataSource.query('DELETE FROM membership_plans WHERE id = $1', [
        membershipPlanId,
      ]);
      await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
      await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
        [ownerUserId, athleteUnlimitedUserId, athleteExpiredUserId],
      ]);
    } catch {
      // Silently ignore cleanup errors
    }
  }

  it('sweeps only the expired row, leaving the unlimited (null-expiry) row untouched', async () => {
    await scheduler.rollOrExpireMemberships();

    const rows = await dataSource!.query(
      `
      SELECT id, status, "expiresAt", "autoRoll", "autoRollCount"
      FROM athlete_membership_plans
      WHERE id = ANY($1)
    `,
      [[athletePlanUnlimitedId, athletePlanExpiredId]],
    );

    const unlimited = rows.find(
      (r: { id: string }) => r.id === athletePlanUnlimitedId,
    );
    const expired = rows.find(
      (r: { id: string }) => r.id === athletePlanExpiredId,
    );

    // Unlimited plan (null expiresAt): never touched by the sweep.
    expect(unlimited.status).toBe('active');
    expect(unlimited.expiresAt).toBeNull();
    expect(unlimited.autoRollCount).toBe(0);

    // Overdue plan: rolled forward one monthly cycle from its old expiry,
    // landing months in the future — far from any DST/timezone boundary.
    expect(expired.status).toBe('active');
    expect(new Date(expired.expiresAt).getTime()).toBeGreaterThan(
      new Date('2026-08-11T00:00:00.000Z').getTime(),
    );
    expect(expired.autoRollCount).toBeGreaterThan(0);
  });
});
