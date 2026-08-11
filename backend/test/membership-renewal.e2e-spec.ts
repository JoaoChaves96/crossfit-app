import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { MembershipRenewalScheduler } from '../src/domain/athlete-membership-plan/membership-renewal.scheduler';

interface ForeignDueRowSnapshot {
  id: string;
  status: string;
  expiresAt: string | null;
  autoRoll: boolean;
  autoRollCount: number;
}

/**
 * MembershipRenewalScheduler (e2e)
 *
 * Proves the finder (AthleteMembershipPlanRepository.findDueForRenewal) and
 * the sweep (MembershipRenewalScheduler.rollOrExpireMemberships) together
 * against a real database — in particular that a plan with a null
 * expiresAt (unlimited) is excluded from the sweep and left untouched,
 * which the mocked unit spec cannot exercise.
 *
 * `rollOrExpireMemberships` has no gym or id filter — it is a global sweep
 * by design. This suite drives the real scheduler (as mandated), so it
 * snapshots every other due row in the database before running it and
 * restores them afterward, to avoid permanently mutating unrelated data
 * (e.g. the hand-seeded waitlist-promotion scenario also living in this DB).
 *
 * Uses real database access. All seeded/expected dates are computed
 * relative to `Date.now()` at run time — never wall-clock literals — and
 * kept months away from `now` so no server timezone offset can flip an
 * assertion.
 */
describe('MembershipRenewalScheduler (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;
  let scheduler: MembershipRenewalScheduler;
  let foreignDueSnapshot: ForeignDueRowSnapshot[] = [];

  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const athleteUnlimitedUserId = uuidv4();
  const athleteExpiredUserId = uuidv4();
  const membershipPlanId = uuidv4();
  const gymMembershipUnlimitedId = uuidv4();
  const gymMembershipExpiredId = uuidv4();
  const athletePlanUnlimitedId = uuidv4();
  const athletePlanExpiredId = uuidv4();

  // Seeded expiry: 7 months before "now", computed at run time so no
  // wall-clock literal decides the test.
  const seededExpiredAt = new Date();
  seededExpiredAt.setUTCMonth(seededExpiredAt.getUTCMonth() - 7);

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
      foreignDueSnapshot = await snapshotForeignDueRows();
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await restoreForeignDueRows();
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  /**
   * The sweep this suite drives is global (no gym/id filter). Snapshot
   * every other row it would also touch — active, expiresAt <= now, not
   * one of ours — so we can put them back exactly as found.
   */
  async function snapshotForeignDueRows(): Promise<ForeignDueRowSnapshot[]> {
    if (!dataSource) return [];

    return dataSource.query(
      `
      SELECT id, status, "expiresAt", "autoRoll", "autoRollCount"
      FROM athlete_membership_plans
      WHERE status = 'active'
        AND "expiresAt" IS NOT NULL
        AND "expiresAt" <= NOW()
        AND id != ALL($1)
    `,
      [[athletePlanUnlimitedId, athletePlanExpiredId]],
    );
  }

  async function restoreForeignDueRows(): Promise<void> {
    if (!dataSource || foreignDueSnapshot.length === 0) return;

    for (const row of foreignDueSnapshot) {
      await dataSource.query(
        `
        UPDATE athlete_membership_plans
        SET status = $2, "expiresAt" = $3, "autoRoll" = $4, "autoRollCount" = $5
        WHERE id = $1
      `,
        [row.id, row.status, row.expiresAt, row.autoRoll, row.autoRollCount],
      );
    }
  }

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
    //    (b) active, expiresAt 7 months in the past (due for the sweep)
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
        seededExpiredAt,
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
    } catch (error) {
      // Leave a signal instead of silently swallowing a partial cleanup.
      console.warn(
        '[membership-renewal.e2e-spec] cleanup failed, some test rows may remain:',
        error,
      );
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

    // Overdue plan: rolled forward from its old expiry, landing in the
    // future — compared against the current instant, not a wall-clock
    // literal, so this stays meaningful regardless of when the suite runs.
    expect(expired.status).toBe('active');
    expect(new Date(expired.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(expired.autoRollCount).toBeGreaterThan(0);
  });
});
