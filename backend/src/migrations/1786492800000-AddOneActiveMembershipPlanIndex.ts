import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces "at most one active plan row per gym membership" at the DB level.
 *
 * The relation between AthleteMembershipPlanEntity and GymMembershipEntity was
 * changed from OneToOne to ManyToOne (a membership accumulates plan rows as
 * append-only history), which dropped the accidental
 * UNIQUE("gymMembershipId") that the OneToOne had generated. That UNIQUE was
 * too strict (it forbade the history) but it was also the only structural
 * guarantee that two concurrent assignments couldn't each leave an active row
 * behind. This migration replaces it with a partial unique index that only
 * constrains rows where status = 'active', which permits the history while
 * still ruling out two active rows for the same membership.
 */
export class AddOneActiveMembershipPlanIndex1786492800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The old UNIQUE constraint from the OneToOne relation no longer exists
    // in any environment that has run the entity change, but drop it
    // defensively for parity with environments that haven't.
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      DROP CONSTRAINT IF EXISTS "REL_160876fc498111a4b78a6e08bc"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_athlete_membership_plans_one_active"
      ON "athlete_membership_plans" ("gymMembershipId")
      WHERE status = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_athlete_membership_plans_one_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      ADD CONSTRAINT "REL_160876fc498111a4b78a6e08bc" UNIQUE ("gymMembershipId")
    `);
  }
}
