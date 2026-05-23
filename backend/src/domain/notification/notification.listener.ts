import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { UserEntity } from '../user/entities/user.entity';
import { BookingCreatedEvent } from './events/booking-created.event';
import { WaitlistPromotedEvent } from './events/waitlist-promoted.event';
import { ClassModifiedEvent } from './events/class-modified.event';
import { ClassCancelledEvent } from './events/class-cancelled.event';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: event.userId } });
    if (!user || !user.notificationPreferences?.booking_confirmations) {
      return;
    }

    const title = 'Booking Confirmed';
    const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
    const data = { classId: event.classId };

    await this.notificationService.createNotification({
      userId: event.userId,
      gymId: event.gymId,
      type: 'booking_confirmed',
      title,
      body,
      data,
    });

    await this.pushService.sendPushToUser(event.userId, title, body, data);
  }

  @OnEvent('waitlist.promoted')
  async handleWaitlistPromoted(event: WaitlistPromotedEvent): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: event.userId } });
    if (!user || !user.notificationPreferences?.waitlist_updates) {
      return;
    }

    const title = "You're In!";
    const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
    const data = { classId: event.classId };

    await this.notificationService.createNotification({
      userId: event.userId,
      gymId: event.gymId,
      type: 'waitlist_promoted',
      title,
      body,
      data,
    });

    await this.pushService.sendPushToUser(event.userId, title, body, data);
  }

  @OnEvent('class.modified')
  async handleClassModified(event: ClassModifiedEvent): Promise<void> {
    for (const userId of event.bookedUserIds) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.notificationPreferences?.class_changes) {
        continue;
      }

      const title = 'Class Updated';
      const body = `${event.classTypeName} — ${event.changes}`;
      const data = { classId: event.classId };

      await this.notificationService.createNotification({
        userId,
        gymId: event.gymId,
        type: 'class_changed',
        title,
        body,
        data,
      });

      await this.pushService.sendPushToUser(userId, title, body, data);
    }
  }

  @OnEvent('class.cancelled')
  async handleClassCancelled(event: ClassCancelledEvent): Promise<void> {
    for (const userId of event.bookedUserIds) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.notificationPreferences?.class_changes) {
        continue;
      }

      const title = 'Class Cancelled';
      const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
      const data = { classId: event.classId };

      await this.notificationService.createNotification({
        userId,
        gymId: event.gymId,
        type: 'class_cancelled',
        title,
        body,
        data,
      });

      await this.pushService.sendPushToUser(userId, title, body, data);
    }
  }
}
