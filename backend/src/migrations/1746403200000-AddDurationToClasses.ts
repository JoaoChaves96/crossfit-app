import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurationToClasses1746403200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "duration" INTEGER NOT NULL DEFAULT 60`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classes" DROP COLUMN IF EXISTS "duration"`,
    );
  }
}
