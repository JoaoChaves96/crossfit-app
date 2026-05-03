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

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'crossfit_box_dev',
  entities: [
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
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.DATABASE_LOGGING === 'true',
};
