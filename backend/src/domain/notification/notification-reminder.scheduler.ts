import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { UserEntity } from '../user/entities/user.entity';
import { toLocalTimestamp } from '../shared/calendar-day';
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
    // The whole window, not the last minute of it: a missed or delayed tick would
    // otherwise skip a class forever. `reminderSentAt` does the de-duplication.
    const reminderWindowEnd = new Date(
      now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000,
    );

    const classes = await this.classRepo
      .createQueryBuilder('class')
      // A QueryBuilder does not apply eager relations, so the class type name
      // has to be joined explicitly or every reminder reads "Class".
      .leftJoinAndSelect('class.classType', 'classType')
      .where('class.state IN (:...states)', {
        states: ['published', 'booking_closed'],
      })
      .andWhere('class."deletedAt" IS NULL')
      .andWhere('class."reminderSentAt" IS NULL')
      .andWhere(
        `(class."scheduledDate" + class."scheduledTime"::time) BETWEEN :start AND :end`,
        {
          // Both bounds are wall-clock readings, because the column they are
          // compared against is a naive timestamp with no zone. An ISO string
          // here displaces the whole window by the server's UTC offset.
          start: toLocalTimestamp(now),
          end: toLocalTimestamp(reminderWindowEnd),
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

        await this.pushService.sendPushToUser(
          booking.userId,
          title,
          body,
          data,
        );
        sentCount++;
      }

      // Marked whether or not anyone was notified: the class has been processed
      // for this start time and must not be picked up again.
      await this.classRepo.update(cls.id, { reminderSentAt: new Date() });
    }

    if (sentCount > 0) {
      this.logger.log(`[Reminder] Sent ${sentCount} reminder(s)`);
    }
  }
}
