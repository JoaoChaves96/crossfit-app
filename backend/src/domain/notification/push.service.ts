import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly notificationService: NotificationService) {}

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.notificationService.getUserPushTokens(userId);
    if (tokens.length === 0) {
      return;
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data,
      sound: 'default' as const,
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.logger.warn(`Expo Push API returned ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }
  }
}
