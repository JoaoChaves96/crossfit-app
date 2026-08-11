import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipAutoRoll1754870400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      ADD COLUMN IF NOT EXISTS "autoRoll" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      ADD COLUMN IF NOT EXISTS "autoRollCount" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans" DROP COLUMN IF EXISTS "autoRollCount"
    `);
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans" DROP COLUMN IF EXISTS "autoRoll"
    `);
  }
}
