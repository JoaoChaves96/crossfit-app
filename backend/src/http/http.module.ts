import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSchedulingController } from '../api/class/class-scheduling.controller';
import { ClassBookingController } from '../api/class/class-booking.controller';
import { ClassProgrammingController } from '../api/class/class-programming.controller';
import { ClassResultsController } from '../api/class/class-results.controller';
import { ClassModule } from '../domain/class/class.module';
import { GymStaffModule } from '../domain/gym-staff/gym-staff.module';
import { GymConfigurationModule } from '../domain/gym-configuration/gym-configuration.module';
import { GymConfigurationController } from '../api/gym-configuration/gym-configuration.controller';
import { GymMembersController } from '../api/gym-configuration/gym-members.controller';
import { GymProfileController } from '../api/gym-configuration/gym-profile.controller';
import { GymFeatureModule } from '../domain/gym/gym-feature.module';
import { GymController } from '../api/gym/gym.controller';
import { NotificationModule } from '../domain/notification/notification.module';
import { NotificationController } from '../api/notification/notification.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GymOwnershipGuard } from '../auth/guards/gym-ownership.guard';
import { UserController } from '../api/user/user.controller';
import { AthleteController } from '../api/user/athlete.controller';
import { UserBookingsService } from '../queries/booking/user-bookings.service';
import { TrainingHistoryService } from '../queries/training-history/training-history.service';
import { BookingRepository } from '../repositories/booking.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { ResultRepository } from '../repositories/result.repository';
import { GymMembershipRepository } from '../repositories/gym-membership.repository';
import { GymMembershipEntity } from '../domain/gym-membership/entities/gym-membership.entity';
import { GymStaffEntity } from '../domain/gym-staff/entities/gym-staff.entity';
import { GymEntity } from '../domain/gym/entities/gym.entity';
import { BookingEntity } from '../domain/booking/entities/booking.entity';
import { AttendanceEntity } from '../domain/attendance/entities/attendance.entity';
import { ResultEntity } from '../domain/result/entities/result.entity';
import { GymScheduleController } from '../api/gym-schedule/gym-schedule.controller';
import { CoachClassesController } from '../api/coach/coach-classes.controller';
import { InviteModule } from '../api/invite/invite.module';
import { InviteController } from '../api/invite/invite.controller';
import { GetUserProfileService } from '../queries/user/get-user-profile.service';
import { GetUserGymsService } from '../queries/user/get-user-gyms.service';
import { UpdateUserProfileHandler } from '../commands/user/handlers/update-user-profile.handler';
import { UserModule } from '../domain/user/user.module';
import { UuidParamPipe } from './uuid-param.pipe';
import { QueryFailedFilter } from './query-failed.filter';

@Module({
  imports: [
    CqrsModule,
    ClassModule,
    GymStaffModule,
    GymConfigurationModule,
    GymFeatureModule,
    NotificationModule,
    InviteModule,
    UserModule,
    TypeOrmModule.forFeature([
      GymMembershipEntity,
      GymStaffEntity,
      GymEntity,
      BookingEntity,
      AttendanceEntity,
      ResultEntity,
    ]),
  ],
  controllers: [
    ClassSchedulingController,
    ClassBookingController,
    ClassProgrammingController,
    ClassResultsController,
    GymConfigurationController,
    GymMembersController,
    GymProfileController,
    UserController,
    AthleteController,
    GymController,
    GymScheduleController,
    CoachClassesController,
    NotificationController,
    InviteController,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: UuidParamPipe,
    },
    {
      provide: APP_FILTER,
      useClass: QueryFailedFilter,
    },
    RolesGuard,
    GymOwnershipGuard,
    UserBookingsService,
    TrainingHistoryService,
    BookingRepository,
    AttendanceRepository,
    ResultRepository,
    GymMembershipRepository,
    GetUserProfileService,
    GetUserGymsService,
    UpdateUserProfileHandler,
  ],
})
export class HttpModule {}
