import { Test } from '@nestjs/testing';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { BookingCreatedEvent } from './events/booking-created.event';
import { WaitlistPromotedEvent } from './events/waitlist-promoted.event';
import { ClassCancelledEvent } from './events/class-cancelled.event';
import { ClassModifiedEvent } from './events/class-modified.event';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { v4 as uuid } from 'uuid';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationService: any;
  let pushService: any;
  let userRepo: any;

  beforeEach(async () => {
    notificationService = { createNotification: jest.fn() };
    pushService = { sendPushToUser: jest.fn() };
    userRepo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: PushService, useValue: pushService },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    listener = module.get(NotificationListener);
  });

  describe('handleBookingCreated', () => {
    it('should create notification and send push', async () => {
      const event = new BookingCreatedEvent(
        uuid(),
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
      );
      userRepo.findOne.mockResolvedValue({
        id: event.userId,
        notificationPreferences: { booking_confirmations: true },
      });

      await listener.handleBookingCreated(event);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: event.userId,
          type: 'booking_confirmed',
        }),
      );
      expect(pushService.sendPushToUser).toHaveBeenCalled();
    });

    it('should skip if user has booking_confirmations disabled', async () => {
      const event = new BookingCreatedEvent(
        uuid(),
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
      );
      userRepo.findOne.mockResolvedValue({
        id: event.userId,
        notificationPreferences: { booking_confirmations: false },
      });

      await listener.handleBookingCreated(event);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(pushService.sendPushToUser).not.toHaveBeenCalled();
    });

    it('should skip if user not found', async () => {
      const event = new BookingCreatedEvent(
        uuid(),
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
      );
      userRepo.findOne.mockResolvedValue(null);

      await listener.handleBookingCreated(event);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(pushService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('handleWaitlistPromoted', () => {
    it('should create notification and send push', async () => {
      const event = new WaitlistPromotedEvent(
        uuid(),
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
      );
      userRepo.findOne.mockResolvedValue({
        id: event.userId,
        notificationPreferences: { waitlist_updates: true },
      });

      await listener.handleWaitlistPromoted(event);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: event.userId,
          type: 'waitlist_promoted',
        }),
      );
      expect(pushService.sendPushToUser).toHaveBeenCalled();
    });

    it('should skip if user has waitlist_updates disabled', async () => {
      const event = new WaitlistPromotedEvent(
        uuid(),
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
      );
      userRepo.findOne.mockResolvedValue({
        id: event.userId,
        notificationPreferences: { waitlist_updates: false },
      });

      await listener.handleWaitlistPromoted(event);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(pushService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('handleClassModified', () => {
    it('should notify all booked athletes', async () => {
      const userIds = [uuid(), uuid()];
      const event = new ClassModifiedEvent(
        uuid(),
        uuid(),
        'CrossFit',
        'time changed',
        userIds,
      );
      userRepo.findOne.mockResolvedValue({
        notificationPreferences: { class_changes: true },
      });

      await listener.handleClassModified(event);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(pushService.sendPushToUser).toHaveBeenCalledTimes(2);
    });

    it('should skip users with class_changes disabled', async () => {
      const userIds = [uuid(), uuid()];
      const event = new ClassModifiedEvent(
        uuid(),
        uuid(),
        'CrossFit',
        'time changed',
        userIds,
      );
      userRepo.findOne
        .mockResolvedValueOnce({
          notificationPreferences: { class_changes: true },
        })
        .mockResolvedValueOnce({
          notificationPreferences: { class_changes: false },
        });

      await listener.handleClassModified(event);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
      expect(pushService.sendPushToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleClassCancelled', () => {
    it('should notify all booked athletes', async () => {
      const userIds = [uuid(), uuid()];
      const event = new ClassCancelledEvent(
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
        userIds,
      );
      userRepo.findOne.mockResolvedValue({
        notificationPreferences: { class_changes: true },
      });

      await listener.handleClassCancelled(event);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(pushService.sendPushToUser).toHaveBeenCalledTimes(2);
    });

    it('should skip users with class_changes disabled', async () => {
      const userIds = [uuid(), uuid()];
      const event = new ClassCancelledEvent(
        uuid(),
        uuid(),
        'CrossFit',
        '2026-05-25',
        '07:00',
        userIds,
      );
      userRepo.findOne.mockResolvedValue({
        notificationPreferences: { class_changes: false },
      });

      await listener.handleClassCancelled(event);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(pushService.sendPushToUser).not.toHaveBeenCalled();
    });
  });
});
