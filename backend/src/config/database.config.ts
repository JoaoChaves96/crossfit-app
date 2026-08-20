import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ClassEntity } from '../domain/class/entities/class.entity';
import { GymEntity } from '../domain/gym/entities/gym.entity';
import { GymStaffEntity } from '../domain/gym-staff/entities/gym-staff.entity';
import { SpaceEntity } from '../domain/space/entities/space.entity';
import { ClassTypeEntity } from '../domain/class-type/entities/class-type.entity';
import { MembershipPlanEntity } from '../domain/membership-plan/entities/membership-plan.entity';
import { UserEntity } from '../domain/user/entities/user.entity';
import { BookingEntity } from '../domain/booking/entities/booking.entity';
import { ProgrammingEntity } from '../domain/programming/entities/programming.entity';
import { AttendanceEntity } from '../domain/attendance/entities/attendance.entity';
import { ResultEntity } from '../domain/result/entities/result.entity';
import { GymMembershipEntity } from '../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { InviteEntity } from '../domain/invite/entities/invite.entity';
import { NotificationEntity } from '../domain/notification/entities/notification.entity';
import { PushTokenEntity } from '../domain/notification/entities/push-token.entity';
import { ClassSeriesEntity } from '../domain/class-series/entities/class-series.entity';

/** The entity list, exported so `data-source.ts` cannot drift from the app. */
export const entities = [
  ClassEntity,
  GymEntity,
  GymStaffEntity,
  SpaceEntity,
  ClassTypeEntity,
  MembershipPlanEntity,
  UserEntity,
  BookingEntity,
  ProgrammingEntity,
  AttendanceEntity,
  ResultEntity,
  GymMembershipEntity,
  AthleteMembershipPlanEntity,
  InviteEntity,
  NotificationEntity,
  PushTokenEntity,
  ClassSeriesEntity,
];

/**
 * Builds the TypeORM options from an environment.
 *
 * A pure function of `env` so the precedence rules are unit-testable; the
 * module-level `databaseConfig` below is still a plain const evaluated once at
 * import. That is load-bearing: `test/helpers/e2e-database.ts` late-`require`s
 * this module so its first evaluation happens after `DB_NAME` is pinned, and
 * asserts on the `.database` it finds. Do not turn the const into a function.
 *
 * `DATABASE_URL` wins over the discrete `DB_*` variables because that is what a
 * managed provider issues, and a half-applied connection — provider host with a
 * local database name — is worse than either.
 *
 * TLS is an explicit flag rather than `NODE_ENV`-derived: the provider requires
 * it and local Postgres has no certificate, so no single inference serves both.
 */
export function buildDatabaseConfig(
  env: NodeJS.ProcessEnv,
): TypeOrmModuleOptions {
  const connection = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST || 'localhost',
        port: parseInt(env.DB_PORT || '5432'),
        username: env.DB_USERNAME || 'postgres',
        password: env.DB_PASSWORD || 'postgres',
        database: env.DB_NAME || 'crossfit_box_dev',
      };

  return {
    type: 'postgres',
    ...connection,
    ...(env.DATABASE_SSL === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
    entities,
    migrations: [`${__dirname}/../migrations/*.{ts,js}`],
    // Migrations are an explicit release step, never a boot side effect: two
    // machines starting together would race on the same DDL.
    migrationsRun: false,
    // Unchanged on purpose. `frontend/e2e/env.ts` e2eBackendEnv() sets
    // NODE_ENV=test specifically so this stays on and builds the e2e schema.
    synchronize: env.NODE_ENV !== 'production',
    logging: env.DATABASE_LOGGING === 'true',
  };
}

export const databaseConfig: TypeOrmModuleOptions = buildDatabaseConfig(
  process.env,
);
