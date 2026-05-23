import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1748044800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL,
        "gymId" UUID NOT NULL,
        "type" VARCHAR NOT NULL,
        "title" VARCHAR NOT NULL,
        "body" VARCHAR NOT NULL,
        "data" JSONB NOT NULL DEFAULT '{}',
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_userId_read" ON "notifications" ("userId", "read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_gymId" ON "notifications" ("gymId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL,
        "token" VARCHAR NOT NULL,
        "platform" VARCHAR NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_userId" ON "push_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_push_tokens_token" ON "push_tokens" ("token")`,
    );

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB NOT NULL DEFAULT '{"booking_confirmations":true,"waitlist_updates":true,"class_changes":true,"class_reminders":true}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "notificationPreferences"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "push_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
