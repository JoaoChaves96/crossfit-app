import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { UserEntity } from '../user/entities/user.entity';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';

const REMINDER_MINUTES_BEFORE = 30;

@Injectable()
export class NotificationReminderScheduler {
  private readonly logger = new Logger(NotificationReminderScheduler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders(): Promise<void> {
    const now = new Date();
    const reminderWindowStart = new Date(
      now.getTime() + (REMINDER_MINUTES_BEFORE - 1) * 60 * 1000,
    );
    const reminderWindowEnd = new Date(
      now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000,
    );

    const classes = await this.classRepo
      .createQueryBuilder('class')
      .where('class.state IN (:...states)', {
        states: ['published', 'booking_closed'],
      })
      .andWhere(
        `(class."scheduledDate" + class."scheduledTime"::time) BETWEEN :start AND :end`,
        {
          start: reminderWindowStart.toISOString(),
          end: reminderWindowEnd.toISOString(),
        },
      )
      .getMany();

    let sentCount = 0;

    for (const cls of classes) {
      const bookings = await this.bookingRepo.find({
        where: { classId: cls.id, status: 'booked' },
      });

      for (const booking of bookings) {
        const user = await this.userRepo.findOne({
          where: { id: booking.userId },
        });
        if (!user || !user.notificationPreferences?.class_reminders) {
          continue;
        }

        const title = 'Starting Soon';
        const body = `${cls.classType?.name || 'Class'} in ${REMINDER_MINUTES_BEFORE} minutes`;
        const data = { classId: cls.id };

        await this.notificationService.createNotification({
          userId: booking.userId,
          gymId: cls.gymId,
          type: 'class_reminder',
          title,
          body,
          data,
        });

        await this.pushService.sendPushToUser(booking.userId, title, body, data);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      this.logger.log(`[Reminder] Sent ${sentCount} reminder(s)`);
    }
  }
}
