import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClassController } from '../api/class/class.controller';
import { ClassModule } from '../domain/class/class.module';
import { GymStaffModule } from '../domain/gym-staff/gym-staff.module';
import { GymConfigurationModule } from '../domain/gym-configuration/gym-configuration.module';
import { GymConfigurationController } from '../api/gym-configuration/gym-configuration.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserController } from '../api/user/user.controller';
import { UserBookingsService } from '../queries/booking/user-bookings.service';
import { BookingRepository } from '../repositories/booking.repository';

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
  imports: [CqrsModule, ClassModule, GymStaffModule, GymConfigurationModule],
  controllers: [ClassController, GymConfigurationController, UserController],
  providers: [RolesGuard, UserBookingsService, BookingRepository],
})
export class HttpModule {}
