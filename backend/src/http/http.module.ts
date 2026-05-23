import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClassController } from '../api/class/class.controller';
import { ClassModule } from '../domain/class/class.module';
import { GymStaffModule } from '../domain/gym-staff/gym-staff.module';
import { GymConfigurationModule } from '../domain/gym-configuration/gym-configuration.module';
import { GymConfigurationController } from '../api/gym-configuration/gym-configuration.controller';
import { NotificationModule } from '../domain/notification/notification.module';
import { NotificationController } from '../api/notification/notification.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * HttpModule: Registers all HTTP controllers
 *
 * This module:
 * - Imports CQRS for command handling
 * - Imports feature modules (ClassModule, GymConfigurationModule, NotificationModule, etc.)
 * - Registers controllers (ClassController, GymConfigurationController, NotificationController, etc.)
 * - Provides guards for authorization (RolesGuard)
 * - Makes controllers available to AppModule
 */
@Module({
  imports: [
    CqrsModule,
    ClassModule,
    GymStaffModule,
    GymConfigurationModule,
    NotificationModule,
  ],
  controllers: [
    ClassController,
    GymConfigurationController,
    NotificationController,
  ],
  providers: [RolesGuard],
})
export class HttpModule {}
