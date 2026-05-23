import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { NotificationListener } from './notification.listener';
import { NotificationReminderScheduler } from './notification-reminder.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      PushTokenEntity,
      UserEntity,
      ClassEntity,
      BookingEntity,
    ]),
  ],
  providers: [
    NotificationService,
    PushService,
    NotificationListener,
    NotificationReminderScheduler,
  ],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
