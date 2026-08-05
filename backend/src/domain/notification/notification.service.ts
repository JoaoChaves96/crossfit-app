import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';

export interface CreateNotificationParams {
  userId: string;
  gymId: string;
  type: NotificationEntity['type'];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PaginatedNotifications {
  items: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(PushTokenEntity)
    private readonly pushTokenRepository: Repository<PushTokenEntity>,
  ) {}

  async createNotification(
    params: CreateNotificationParams,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      id: uuidv4(),
      userId: params.userId,
      gymId: params.gymId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      read: false,
    });

    return this.notificationRepository.save(notification);
  }

  async getUserNotifications(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<PaginatedNotifications> {
    const skip = (options.page - 1) * options.limit;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: options.limit,
    });

    return { items, total, page: options.page, limit: options.limit };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification ${notificationId} not found for user`,
      );
    }

    notification.read = true;
    await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );
  }

  async clearRead(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.notificationRepository.delete({
      userId,
      read: true,
    });
    return { deletedCount: result.affected ?? 0 };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: PushTokenEntity['platform'],
  ): Promise<PushTokenEntity> {
    const existing = await this.pushTokenRepository.findOne({
      where: { token },
    });

    if (existing) {
      return existing;
    }

    const pushToken = this.pushTokenRepository.create({
      id: uuidv4(),
      userId,
      token,
      platform,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async getUserPushTokens(userId: string): Promise<PushTokenEntity[]> {
    return this.pushTokenRepository.find({
      where: { userId },
    });
  }
}
