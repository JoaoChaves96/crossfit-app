import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepo: Record<string, jest.Mock>;
  let pushTokenRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    notificationRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    pushTokenRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(PushTokenEntity),
          useValue: pushTokenRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const params = {
        userId: 'user-1',
        gymId: 'gym-1',
        type: 'booking_confirmed' as const,
        title: 'Booking Confirmed',
        body: 'Your class is booked',
        data: { classId: 'class-1' },
      };

      notificationRepo.save.mockResolvedValue({ id: 'notif-1', ...params });

      const result = await service.createNotification(params);

      expect(notificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          gymId: 'gym-1',
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          body: 'Your class is booked',
          data: { classId: 'class-1' },
          read: false,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const notifications = [
        { id: 'n1', userId: 'user-1', read: false, createdAt: new Date() },
        { id: 'n2', userId: 'user-1', read: true, createdAt: new Date() },
      ];
      notificationRepo.findAndCount.mockResolvedValue([notifications, 2]);

      const result = await service.getUserNotifications('user-1', {
        page: 1,
        limit: 20,
      });

      expect(notificationRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle pagination offset correctly', async () => {
      notificationRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1', { page: 3, limit: 10 });

      expect(notificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = {
        id: 'n1',
        userId: 'user-1',
        read: false,
      };
      notificationRepo.findOne.mockResolvedValue(notification);
      notificationRepo.save.mockResolvedValue({ ...notification, read: true });

      await service.markAsRead('n1', 'user-1');

      expect(notificationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'user-1' },
      });
      expect(notificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'n1', read: true }),
      );
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      notificationRepo.update.mockResolvedValue({ affected: 5 });

      await service.markAllAsRead('user-1');

      expect(notificationRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', read: false },
        { read: true },
      );
    });
  });

  describe('clearRead', () => {
    it('should delete all read notifications for user and return the count', async () => {
      notificationRepo.delete.mockResolvedValue({ affected: 4 });

      const result = await service.clearRead('user-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        read: true,
      });
      expect(result).toEqual({ deletedCount: 4 });
    });

    it('should return zero when nothing was deleted', async () => {
      notificationRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.clearRead('user-1');

      expect(result).toEqual({ deletedCount: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      notificationRepo.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(notificationRepo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
      expect(result).toBe(3);
    });
  });

  describe('registerPushToken', () => {
    it('should register a new push token', async () => {
      pushTokenRepo.findOne.mockResolvedValue(null);
      pushTokenRepo.save.mockResolvedValue({
        id: 'pt-1',
        userId: 'user-1',
        token: 'ExponentPushToken[xxx]',
        platform: 'ios',
      });

      const result = await service.registerPushToken(
        'user-1',
        'ExponentPushToken[xxx]',
        'ios',
      );

      expect(pushTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          token: 'ExponentPushToken[xxx]',
          platform: 'ios',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ token: 'ExponentPushToken[xxx]' }),
      );
    });

    it('should return existing token if already registered', async () => {
      const existing = {
        id: 'pt-1',
        userId: 'user-1',
        token: 'ExponentPushToken[xxx]',
        platform: 'ios',
      };
      pushTokenRepo.findOne.mockResolvedValue(existing);

      const result = await service.registerPushToken(
        'user-1',
        'ExponentPushToken[xxx]',
        'ios',
      );

      expect(pushTokenRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('getUserPushTokens', () => {
    it('should return all push tokens for a user', async () => {
      const tokens = [
        { id: 'pt-1', userId: 'user-1', token: 'tok1', platform: 'ios' },
        { id: 'pt-2', userId: 'user-1', token: 'tok2', platform: 'android' },
      ];
      pushTokenRepo.find.mockResolvedValue(tokens);

      const result = await service.getUserPushTokens('user-1');

      expect(pushTokenRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
