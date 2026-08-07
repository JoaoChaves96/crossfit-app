import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from './entities/class.entity';
import { ClassSeriesEntity } from '../class-series/entities/class-series.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { AttendanceEntity } from '../attendance/entities/attendance.entity';
import { ResultEntity } from '../result/entities/result.entity';
import { ProgrammingEntity } from '../programming/entities/programming.entity';
import { ClassRepository } from '../../repositories/class.repository';
import { ClassSeriesRepository } from '../../repositories/class-series.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { ResultRepository } from '../../repositories/result.repository';
import { ProgrammingRepository } from '../../repositories/programming.repository';
import { CreateClassHandler } from '../../commands/class/handlers/create-class.handler';
import { CreateRecurringClassesHandler } from '../../commands/class/handlers/create-recurring-classes.handler';
import { BookClassHandler } from '../../commands/class/handlers/book-class.handler';
import { CancelBookingHandler } from '../../commands/class/handlers/cancel-booking.handler';
import { MarkAttendanceHandler } from '../../commands/class/handlers/mark-attendance.handler';
import { LogResultHandler } from '../../commands/class/handlers/log-result.handler';
import { EditResultHandler } from '../../commands/class/handlers/edit-result.handler';
import { AddOrEditProgrammingHandler } from '../../commands/class/handlers/add-or-edit-programming.handler';
import { ToggleLoggableStatusHandler } from '../../commands/class/handlers/toggle-loggable-status.handler';
import { ManuallyTransitionClassStateHandler } from '../../commands/class/handlers/manually-transition-class-state.handler';
import { UpdateClassStructureHandler } from '../../commands/class/handlers/update-class-structure.handler';
import { EditClassHandler } from '../../commands/class/handlers/edit-class.handler';
import { DeleteClassHandler } from '../../commands/class/handlers/delete-class.handler';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetClassResultsService } from '../../queries/class/get-class-results.service';
import { GetMyClassResultService } from '../../queries/class/get-my-class-result.service';
import { GetClassProgrammingService } from '../../queries/class/get-class-programming.service';
import { GetClassBookingsService } from '../../queries/class/get-class-bookings.service';
import { GymModule } from '../gym/gym.module';
import { UserModule } from '../user/user.module';
import { GymStaffModule } from '../gym-staff/gym-staff.module';
import { SpaceModule } from '../space/space.module';
import { ClassTypeModule } from '../class-type/class-type.module';
import { GymMembershipModule } from '../gym-membership/gym-membership.module';
import { AthleteMembershipPlanModule } from '../athlete-membership-plan/athlete-membership-plan.module';
import { ClassLifecycleScheduler } from './class-lifecycle.scheduler';
import { ClassContentAccessService } from './class-content-access.service';

const CommandHandlers = [
  CreateClassHandler,
  CreateRecurringClassesHandler,
  BookClassHandler,
  CancelBookingHandler,
  MarkAttendanceHandler,
  AddOrEditProgrammingHandler,
  ToggleLoggableStatusHandler,
  ManuallyTransitionClassStateHandler,
  UpdateClassStructureHandler,
  LogResultHandler,
  EditResultHandler,
  EditClassHandler,
  DeleteClassHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      ClassEntity,
      ClassSeriesEntity,
      BookingEntity,
      AttendanceEntity,
      ResultEntity,
      ProgrammingEntity,
    ]),
    GymModule,
    GymStaffModule,
    UserModule,
    SpaceModule,
    ClassTypeModule,
    GymMembershipModule,
    AthleteMembershipPlanModule,
  ],
  providers: [
    ClassRepository,
    ClassSeriesRepository,
    BookingRepository,
    AttendanceRepository,
    ResultRepository,
    ProgrammingRepository,
    ClassScheduleService,
    GetClassResultsService,
    GetMyClassResultService,
    GetClassProgrammingService,
    GetClassBookingsService,
    ClassLifecycleScheduler,
    ClassContentAccessService,
    ...CommandHandlers,
  ],
  exports: [
    ClassRepository,
    BookingRepository,
    AttendanceRepository,
    ResultRepository,
    ProgrammingRepository,
    ClassScheduleService,
    GetClassResultsService,
    GetMyClassResultService,
    GetClassProgrammingService,
    GetClassBookingsService,
  ],
})
export class ClassModule {}
