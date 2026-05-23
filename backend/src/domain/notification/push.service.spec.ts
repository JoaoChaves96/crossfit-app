import { Test } from '@nestjs/testing';
import { PushService } from './push.service';
import { NotificationService } from './notification.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PushService', () => {
  let service: PushService;
  let notificationService: any;

  beforeEach(async () => {
    notificationService = {
      getUserPushTokens: jest.fn(),
    };
    mockFetch.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(PushService);
  });

  describe('sendPushToUser', () => {
    it('should send push notifications to all user tokens', async () => {
      const userId = 'user-1';
      const tokens = [
        { token: 'ExponentPushToken[aaa]', platform: 'ios' },
        { token: 'ExponentPushToken[bbb]', platform: 'android' },
      ];
      notificationService.getUserPushTokens.mockResolvedValue(tokens);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.sendPushToUser(userId, 'Test Title', 'Test Body', {
        classId: 'c1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should send correct message payload', async () => {
      const tokens = [{ token: 'ExponentPushToken[aaa]', platform: 'ios' }];
      notificationService.getUserPushTokens.mockResolvedValue(tokens);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.sendPushToUser('user-1', 'Title', 'Body', {
        classId: 'c1',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual([
        {
          to: 'ExponentPushToken[aaa]',
          title: 'Title',
          body: 'Body',
          data: { classId: 'c1' },
          sound: 'default',
        },
      ]);
    });

    it('should not call fetch if user has no tokens', async () => {
      notificationService.getUserPushTokens.mockResolvedValue([]);

      await service.sendPushToUser('user-1', 'Title', 'Body', {});

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not throw if fetch fails', async () => {
      const tokens = [{ token: 'ExponentPushToken[aaa]', platform: 'ios' }];
      notificationService.getUserPushTokens.mockResolvedValue(tokens);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendPushToUser('user-1', 'Title', 'Body', {}),
      ).resolves.not.toThrow();
    });

    it('should not throw if response is not ok', async () => {
      const tokens = [{ token: 'ExponentPushToken[aaa]', platform: 'ios' }];
      notificationService.getUserPushTokens.mockResolvedValue(tokens);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(
        service.sendPushToUser('user-1', 'Title', 'Body', {}),
      ).resolves.not.toThrow();
    });
  });
});
