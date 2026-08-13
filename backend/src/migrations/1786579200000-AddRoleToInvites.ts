import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `role` to invites so one invite subsystem serves both athletes and
 * coaches.
 *
 * Coach invitation previously bypassed invites entirely: InviteCoachHandler
 * wrote an active gym_staff row on the spot. Every existing invite row is
 * therefore an athlete invite, which is exactly what the DEFAULT encodes — no
 * backfill statement is needed.
 */
export class AddRoleToInvites1786579200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invites"
      ADD COLUMN IF NOT EXISTS "role" varchar NOT NULL DEFAULT 'athlete'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invites" DROP COLUMN IF EXISTS "role"
    `);
  }
}
