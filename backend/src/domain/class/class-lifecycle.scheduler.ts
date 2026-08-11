import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClassRepository } from '../../repositories/class.repository';
import { ClassEntity } from './entities/class.entity';

/**
 * How long before a class starts the booking window shuts.
 *
 * This also defines how long the waitlist is inert: cancellation is the only
 * promotion path and it rejects any class past `published`, so a seat freed
 * inside this window can never be reassigned (see DECISIONS.md → Absence Does
 * Not Promote). Keep it small for that reason.
 *
 * Unrelated to REMINDER_MINUTES_BEFORE in notification-reminder.scheduler.ts,
 * which is the class-reminder lead time.
 */
const BOOKING_CLOSE_MINUTES_BEFORE_START = 5;

@Injectable()
export class ClassLifecycleScheduler {
  private readonly logger = new Logger(ClassLifecycleScheduler.name);

  constructor(private readonly classRepository: ClassRepository) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async advanceClassStates(): Promise<void> {
    const now = new Date();

    const candidates = await this.classRepository.getClassesByStates([
      'published',
      'booking_closed',
      'in_progress',
    ]);

    const changed: ClassEntity[] = [];

    for (const cls of candidates) {
      const scheduledStart = this.buildScheduledStart(
        cls.scheduledDate,
        cls.scheduledTime,
      );

      const bookingCloseTime = new Date(
        scheduledStart.getTime() -
          BOOKING_CLOSE_MINUTES_BEFORE_START * 60 * 1000,
      );

      let nextState: ClassEntity['state'] | null = null;

      if (cls.state === 'published' && now >= bookingCloseTime) {
        nextState = 'booking_closed';
      } else if (cls.state === 'booking_closed' && now >= scheduledStart) {
        nextState = 'in_progress';
      } else if (cls.state === 'in_progress') {
        const duration: number = (cls as ClassEntity & { duration?: number }).duration ?? 60;
        const completionTime = new Date(
          scheduledStart.getTime() + duration * 60 * 1000,
        );
        if (now >= completionTime) {
          nextState = 'completed';
        }
      }

      if (nextState !== null) {
        cls.state = nextState;
        changed.push(cls);
      }
    }

    if (changed.length > 0) {
      await this.classRepository.saveMany(changed);
    }

    this.logger.log(
      `[ClassLifecycleScheduler] tick complete — transitioned ${changed.length} class(es)`,
    );
  }

  /**
   * Combines a date-only value with a time string (HH:MM or HH:MM:SS) into a
   * single UTC Date. Both values are stored in UTC in the database.
   */
  private buildScheduledStart(scheduledDate: Date, scheduledTime: string): Date {
    const dateStr =
      scheduledDate instanceof Date
        ? scheduledDate.toISOString().slice(0, 10)
        : String(scheduledDate).slice(0, 10);

    const timeStr = scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime;

    return new Date(`${dateStr}T${timeStr}Z`);
  }
}
