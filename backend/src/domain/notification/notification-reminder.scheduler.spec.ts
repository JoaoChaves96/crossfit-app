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

  beforeEach(async () => {
    notificationService = { createNotification: jest.fn() };
    pushService = { sendPushToUser: jest.fn() };
    classRepo = { createQueryBuilder: jest.fn() };
    bookingRepo = { find: jest.fn() };
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
    const classId = uuid();
    const gymId = uuid();
    const userId = uuid();

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: classId,
          gymId,
          classType: { name: 'CrossFit' },
          scheduledTime: '07:00',
          scheduledDate: new Date('2026-05-25'),
        },
      ]),
    };
    classRepo.createQueryBuilder.mockReturnValue(qb);

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
      expect.objectContaining({ classId }),
    );
  });

  it('should skip users with class_reminders disabled', async () => {
    const classId = uuid();
    const userId = uuid();

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: classId,
          gymId: uuid(),
          classType: { name: 'CrossFit' },
          scheduledTime: '07:00',
          scheduledDate: new Date('2026-05-25'),
        },
      ]),
    };
    classRepo.createQueryBuilder.mockReturnValue(qb);

    bookingRepo.find.mockResolvedValue([{ userId, status: 'booked' }]);
    userRepo.findOne.mockResolvedValue({
      id: userId,
      notificationPreferences: { class_reminders: false },
    });

    await scheduler.sendReminders();

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('should not send reminders when no classes are in the window', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    classRepo.createQueryBuilder.mockReturnValue(qb);

    await scheduler.sendReminders();

    expect(notificationService.createNotification).not.toHaveBeenCalled();
    expect(pushService.sendPushToUser).not.toHaveBeenCalled();
  });
});
