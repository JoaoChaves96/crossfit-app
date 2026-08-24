import { MigrationInterface, QueryRunner } from "typeorm";

export class ClassReminderSentAt1787911200000 implements MigrationInterface {
    name = 'ClassReminderSentAt1787911200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "classes" ADD "reminderSentAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "reminderSentAt"`);
    }

}
