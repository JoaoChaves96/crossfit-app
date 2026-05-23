import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { NotificationListener } from './notification.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, PushTokenEntity, UserEntity]),
  ],
  providers: [NotificationService, PushService, NotificationListener],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
