import { Test } from '@nestjs/testing';
import { NotificationReminderScheduler } from './notification-reminder.scheduler';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { UserEntity } from '../user/entities/user.entity';
import { v4 as uuid } from 'uuid';

describe('NotificationReminderScheduler', () => {
  let scheduler: NotificationReminderScheduler;
  let notificationService: any;
  let pushService: any;
  let classRepo: any;
  let bookingRepo: any;
  let userRepo: any;

  /** Every `where`/`andWhere` clause the scheduler put on the query. */
  let clauses: string[];
  /** Every parameter object the scheduler bound to the query. */
  let params: Record<string, unknown>;

  /**
   * Stands in for a TypeORM QueryBuilder. It reproduces the one behaviour that
   * matters here: **eager relations are NOT loaded by a QueryBuilder**, so
   * `classType` is only present when the scheduler joins it explicitly.
   */
  function stubQuery(classes: Partial<ClassEntity>[]) {
    let joinedClassType = false;
    const qb: any = {
      leftJoinAndSelect: jest.fn((relation: string) => {
        if (relation === 'class.classType') {
          joinedClassType = true;
        }
        return qb;
      }),
      where: jest.fn((clause: string, bound?: Record<string, unknown>) => {
        clauses.push(clause);
        Object.assign(params, bound ?? {});
        return qb;
      }),
      andWhere: jest.fn((clause: string, bound?: Record<string, unknown>) => {
        clauses.push(clause);
        Object.assign(params, bound ?? {});
        return qb;
      }),
      getMany: jest.fn(async () =>
        classes.map((cls) =>
          joinedClassType ? cls : { ...cls, classType: undefined },
        ),
      ),
    };
    classRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  function classInWindow(overrides: Partial<ClassEntity> = {}) {
    return {
      id: uuid(),
      gymId: uuid(),
      classType: { name: 'CrossFit' },
      scheduledTime: '07:00',
      scheduledDate: new Date('2026-05-25'),
      ...overrides,
    } as Partial<ClassEntity>;
  }

  beforeEach(async () => {
    clauses = [];
    params = {};
    notificationService = { createNotification: jest.fn() };
    pushService = { sendPushToUser: jest.fn() };
    classRepo = { createQueryBuilder: jest.fn(), update: jest.fn() };
    bookingRepo = { find: jest.fn().mockResolvedValue([]) };
    userRepo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NotificationReminderScheduler,
        { provide: NotificationService, useValue: notificationService },
        { provide: PushService, useValue: pushService },
        { provide: getRepositoryToken(ClassEntity), useValue: classRepo },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    scheduler = module.get(NotificationReminderScheduler);
  });

  it('should send reminders for classes starting within the reminder window', async () => {
    const cls = classInWindow();
    const userId = uuid();
    stubQuery([cls]);

    bookingRepo.find.mockResolvedValue([{ userId, status: 'booked' }]);
    userRepo.findOne.mockResolvedValue({
      id: userId,
      notificationPreferences: { class_reminders: true },
    });

    await scheduler.sendReminders();

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'class_reminder', userId }),
    );
    expect(pushService.sendPushToUser).toHaveBeenCalledWith(
      userId,
      'Starting Soon',
      expect.any(String),
      expect.objectContaining({ classId: cls.id }),
    );
  });

  it('should skip users with class_reminders disabled', async () => {
    const userId = uuid();
    stubQuery([classInWindow()]);

    bookingRepo.find.mockResolvedValue([{ userId, status: 'booked' }]);
    userRepo.findOne.mockResolvedValue({
      id: userId,
      notificationPreferences: { class_reminders: false },
    });

    await scheduler.sendReminders();

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('should not send reminders when no classes are in the window', async () => {
    stubQuery([]);

    await scheduler.sendReminders();

    expect(notificationService.createNotification).not.toHaveBeenCalled();
    expect(pushService.sendPushToUser).not.toHaveBeenCalled();
  });

  describe('query scope', () => {
    it('should exclude soft-deleted classes', async () => {
      stubQuery([]);

      await scheduler.sendReminders();

      expect(clauses.join(' ; ')).toMatch(/deletedAt"? IS NULL/);
    });

    it('should exclude classes already reminded', async () => {
      stubQuery([]);

      await scheduler.sendReminders();

      expect(clauses.join(' ; ')).toMatch(/reminderSentAt"? IS NULL/);
    });

    it('should cover the whole window up to the reminder lead time, not a single minute', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-25T06:00:00.000Z'));
      stubQuery([]);

      await scheduler.sendReminders();

      // A missed cron tick must not permanently skip a class: the window runs
      // from now to the lead time, and reminderSentAt does the de-duplication.
      expect(params.start).toBe('2026-05-25 02:00:00');
      expect(params.end).toBe('2026-05-25 02:30:00');
      jest.useRealTimers();
    });

    /**
     * `scheduledDate + scheduledTime::time` is a naive timestamp: the wall clock
     * the owner typed, with no zone attached. Binding `now.toISOString()` against
     * it compares that wall clock to UTC, so the window is displaced by the
     * server's offset — 30 minutes becomes 30 minutes ± the offset. Under the
     * pinned UTC-4 zone that shipped a scheduler which reminded athletes about
     * classes that had already started and stayed silent for the next one.
     */
    it('should bound the window on the same wall clock the column stores', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-25T18:00:00.000Z'));
      stubQuery([]);

      await scheduler.sendReminders();

      // 18:00Z is 14:00 locally, so a class the owner scheduled for 14:20 is
      // twenty minutes away and must fall inside the bounds.
      expect(String(params.start) <= '2026-05-25 14:20:00').toBe(true);
      expect(String(params.end) >= '2026-05-25 14:20:00').toBe(true);
      // ...and one at 13:20, already an hour past, must not.
      expect(String(params.start) > '2026-05-25 13:20:00').toBe(true);
      jest.useRealTimers();
    });
  });

  describe('reminder body', () => {
    it('should name the class type, which requires joining the relation', async () => {
      const cls = classInWindow();
      const userId = uuid();
      stubQuery([cls]);

      bookingRepo.find.mockResolvedValue([{ userId, status: 'booked' }]);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        notificationPreferences: { class_reminders: true },
      });

      await scheduler.sendReminders();

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'CrossFit in 30 minutes' }),
      );
    });
  });

  describe('de-duplication', () => {
    it('should mark a class as reminded once it has been processed', async () => {
      const cls = classInWindow();
      const userId = uuid();
      stubQuery([cls]);

      bookingRepo.find.mockResolvedValue([{ userId, status: 'booked' }]);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        notificationPreferences: { class_reminders: true },
      });

      await scheduler.sendReminders();

      expect(classRepo.update).toHaveBeenCalledWith(cls.id, {
        reminderSentAt: expect.any(Date),
      });
    });

    it('should mark a class with no booked athletes so it is not rescanned', async () => {
      const cls = classInWindow();
      stubQuery([cls]);
      bookingRepo.find.mockResolvedValue([]);

      await scheduler.sendReminders();

      expect(classRepo.update).toHaveBeenCalledWith(cls.id, {
        reminderSentAt: expect.any(Date),
      });
    });
  });
});
