import { Module } from '@nestjs/common';
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
import { BookingEntity } from '../domain/booking/entities/booking.entity';
import { AttendanceEntity } from '../domain/attendance/entities/attendance.entity';
import { ResultEntity } from '../domain/result/entities/result.entity';
import { GymScheduleController } from '../api/gym-schedule/gym-schedule.controller';
import { CoachClassesController } from '../api/coach/coach-classes.controller';
import { InviteModule } from '../api/invite/invite.module';
import { GetUserProfileService } from '../queries/user/get-user-profile.service';
import { UpdateUserProfileHandler } from '../commands/user/handlers/update-user-profile.handler';
import { UserModule } from '../domain/user/user.module';

/**
 * HttpModule: Registers all HTTP controllers
 *
 * This module:
 * - Imports CQRS for command handling
 * - Imports feature modules (ClassModule, GymConfigurationModule, etc.)
 * - Registers controllers (ClassController, GymConfigurationController, etc.)
 * - Provides guards for authorization (RolesGuard)
 * - Makes controllers available to AppModule
 */
@Module({
  imports: [
    CqrsModule,
    ClassModule,
    GymStaffModule,
    GymConfigurationModule,
    GymFeatureModule,
    InviteModule,
    UserModule,
    TypeOrmModule.forFeature([
      GymMembershipEntity,
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
  ],
  providers: [
    RolesGuard,
    GymOwnershipGuard,
    UserBookingsService,
    TrainingHistoryService,
    BookingRepository,
    AttendanceRepository,
    ResultRepository,
    GymMembershipRepository,
    GetUserProfileService,
    UpdateUserProfileHandler,
  ],
})
export class HttpModule {}
