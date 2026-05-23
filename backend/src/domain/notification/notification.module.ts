import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, PushTokenEntity])],
  providers: [NotificationService, PushService],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
