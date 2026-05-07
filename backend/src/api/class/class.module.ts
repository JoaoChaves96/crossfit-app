import { Module } from '@nestjs/common';
import { ClassModule } from '../../domain/class/class.module';
import { ClassSchedulingController } from './class-scheduling.controller';
import { ClassBookingController } from './class-booking.controller';
import { ClassProgrammingController } from './class-programming.controller';
import { ClassResultsController } from './class-results.controller';

@Module({
  imports: [ClassModule],
  controllers: [
    ClassSchedulingController,
    ClassBookingController,
    ClassProgrammingController,
    ClassResultsController,
  ],
})
export class ClassApiModule {}
