# Notifications Epic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app notification feed + Expo push notifications so athletes receive timely updates about bookings, waitlist promotions, class changes, and upcoming classes.

**Architecture:** Event-driven via `@nestjs/event-emitter` (EventEmitter2). Domain handlers emit events → `NotificationListener` creates DB records + dispatches push via Expo Push API. Scheduler cron handles reminders. Frontend: bell icon with badge + flat notification list screen.

**Tech Stack:** NestJS, TypeORM, @nestjs/event-emitter, @nestjs/schedule, expo-notifications, Expo Push API

---

## File Structure

### Backend — New files

| File | Responsibility |
|---|---|
| `backend/src/domain/notification/entities/notification.entity.ts` | Notification DB entity |
| `backend/src/domain/notification/entities/push-token.entity.ts` | Push token DB entity |
| `backend/src/domain/notification/notification.module.ts` | Module registration |
| `backend/src/domain/notification/notification.service.ts` | Create, query, mark-read logic |
| `backend/src/domain/notification/notification.listener.ts` | Event subscriptions → create notifications |
| `backend/src/domain/notification/push.service.ts` | Expo Push API integration |
| `backend/src/domain/notification/notification-reminder.scheduler.ts` | Cron for class reminders |
| `backend/src/domain/notification/events/` | Event class definitions |
| `backend/src/api/notification/notification.controller.ts` | REST endpoints |
| `backend/src/api/notification/dto/` | Request/response DTOs |
| `backend/src/migrations/TIMESTAMP-CreateNotificationTables.ts` | DB migration |

### Backend — Modified files

| File | Change |
|---|---|
| `backend/src/config/database.config.ts` | Register new entities |
| `backend/src/app.module.ts` | Import EventEmitterModule.forRoot() |
| `backend/src/http/http.module.ts` | Import NotificationModule, register controller |
| `backend/src/domain/user/entities/user.entity.ts` | Add `notificationPreferences` jsonb column |
| `backend/src/commands/class/handlers/book-class.handler.ts` | Emit `booking.created` event |
| `backend/src/commands/class/handlers/cancel-booking.handler.ts` | Emit `waitlist.promoted` event |
| `backend/src/commands/class/handlers/edit-class.handler.ts` | Emit `class.modified` event |
| `backend/src/commands/class/handlers/delete-class.handler.ts` | Emit `class.cancelled` event |

### Frontend — New files

| File | Responsibility |
|---|---|
| `frontend/hooks/useNotifications.ts` | Fetch notifications, mark read, unread count |
| `frontend/hooks/usePushToken.ts` | Register Expo push token on app start |
| `frontend/app/notifications.tsx` | Notifications list screen |
| `frontend/app/notifications.styles.ts` | Styles for notifications screen |
| `frontend/components/NotificationBell.tsx` | Bell icon + badge, used in headers |

### Frontend — Modified files

| File | Change |
|---|---|
| `frontend/app/(tabs)/_layout.tsx` | Add NotificationBell to header |
| `frontend/app/(tabs)/profile.tsx` | Add notification preferences toggles |
| `frontend/package.json` | Add `expo-notifications`, `expo-device` |

---

## Task 1: Backend — Install EventEmitter2 + Create Notification Entities + Migration

**Files:**
- Create: `backend/src/domain/notification/entities/notification.entity.ts`
- Create: `backend/src/domain/notification/entities/push-token.entity.ts`
- Create: `backend/src/migrations/1748044800000-CreateNotificationTables.ts`
- Modify: `backend/src/config/database.config.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/domain/user/entities/user.entity.ts`

- [ ] **Step 1: Install @nestjs/event-emitter**

```bash
cd backend && npm install @nestjs/event-emitter
```

- [ ] **Step 2: Create NotificationEntity**

```typescript
// backend/src/domain/notification/entities/notification.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'createdAt'])
@Index(['gymId'])
export class NotificationEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  gymId: string;

  @Column({
    type: 'varchar',
    enum: [
      'booking_confirmed',
      'waitlist_promoted',
      'class_cancelled',
      'class_changed',
      'class_reminder',
    ],
  })
  type:
    | 'booking_confirmed'
    | 'waitlist_promoted'
    | 'class_cancelled'
    | 'class_changed'
    | 'class_reminder';

  @Column('varchar')
  title: string;

  @Column('varchar')
  body: string;

  @Column('jsonb', { default: {} })
  data: Record<string, string>;

  @Column('boolean', { default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 3: Create PushTokenEntity**

```typescript
// backend/src/domain/notification/entities/push-token.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class PushTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar')
  token: string;

  @Column({
    type: 'varchar',
    enum: ['ios', 'android', 'web'],
  })
  platform: 'ios' | 'android' | 'web';

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 4: Add notificationPreferences to UserEntity**

Add this column to `backend/src/domain/user/entities/user.entity.ts`:

```typescript
@Column('jsonb', {
  default: {
    booking_confirmations: true,
    waitlist_updates: true,
    class_changes: true,
    class_reminders: true,
  },
})
notificationPreferences: {
  booking_confirmations: boolean;
  waitlist_updates: boolean;
  class_changes: boolean;
  class_reminders: boolean;
};
```

- [ ] **Step 5: Create migration**

```typescript
// backend/src/migrations/1748044800000-CreateNotificationTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1748044800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL,
        "gymId" UUID NOT NULL,
        "type" VARCHAR NOT NULL,
        "title" VARCHAR NOT NULL,
        "body" VARCHAR NOT NULL,
        "data" JSONB NOT NULL DEFAULT '{}',
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId_read" ON "notifications" ("userId", "read")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_gymId" ON "notifications" ("gymId")`);

    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL,
        "token" VARCHAR NOT NULL,
        "platform" VARCHAR NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_push_tokens_userId" ON "push_tokens" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_push_tokens_token" ON "push_tokens" ("token")`);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB NOT NULL DEFAULT '{"booking_confirmations":true,"waitlist_updates":true,"class_changes":true,"class_reminders":true}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "notificationPreferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
```

- [ ] **Step 6: Register entities in database.config.ts**

Add imports and entries to the `entities` array:

```typescript
import { NotificationEntity } from '../domain/notification/entities/notification.entity';
import { PushTokenEntity } from '../domain/notification/entities/push-token.entity';

// In entities array:
NotificationEntity,
PushTokenEntity,
```

- [ ] **Step 7: Import EventEmitterModule in app.module.ts**

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

// In imports array:
EventEmitterModule.forRoot(),
```

- [ ] **Step 8: Verify — backend compiles**

```bash
cd backend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(notifications): add entities, migration, and EventEmitter2 setup"
```

---

## Task 2: Backend — NotificationService + NotificationController

**Files:**
- Create: `backend/src/domain/notification/notification.module.ts`
- Create: `backend/src/domain/notification/notification.service.ts`
- Create: `backend/src/api/notification/notification.controller.ts`
- Create: `backend/src/api/notification/dto/notification-response.dto.ts`
- Create: `backend/src/api/notification/dto/register-push-token.dto.ts`
- Modify: `backend/src/http/http.module.ts`
- Test: `backend/src/domain/notification/notification.service.spec.ts`

- [ ] **Step 1: Write failing test for NotificationService**

```typescript
// backend/src/domain/notification/notification.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { v4 as uuid } from 'uuid';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepo: any;
  let pushTokenRepo: any;

  beforeEach(async () => {
    notificationRepo = {
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };
    pushTokenRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: notificationRepo },
        { provide: getRepositoryToken(PushTokenEntity), useValue: pushTokenRepo },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const params = {
        userId: uuid(),
        gymId: uuid(),
        type: 'booking_confirmed' as const,
        title: 'Booking Confirmed',
        body: 'CrossFit at 07:00',
        data: { classId: uuid() },
      };
      notificationRepo.save.mockResolvedValue({ id: uuid(), ...params, read: false });

      const result = await service.createNotification(params);

      expect(notificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: params.userId,
        gymId: params.gymId,
        type: params.type,
        title: params.title,
        body: params.body,
        read: false,
      }));
      expect(result).toBeDefined();
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications for a user', async () => {
      const userId = uuid();
      notificationRepo.find.mockResolvedValue([]);

      const result = await service.getUserNotifications(userId, 1, 20);

      expect(notificationRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      }));
      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should set read = true for the notification', async () => {
      const notifId = uuid();
      const userId = uuid();
      notificationRepo.findOne.mockResolvedValue({ id: notifId, userId, read: false });
      notificationRepo.save.mockResolvedValue({ id: notifId, userId, read: true });

      await service.markAsRead(notifId, userId);

      expect(notificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: notifId, read: true }));
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      const userId = uuid();

      await service.markAllAsRead(userId);

      expect(notificationRepo.update).toHaveBeenCalledWith(
        { userId, read: false },
        { read: true },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const userId = uuid();
      notificationRepo.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(notificationRepo.count).toHaveBeenCalledWith({ where: { userId, read: false } });
    });
  });

  describe('registerPushToken', () => {
    it('should upsert a push token', async () => {
      const userId = uuid();
      const token = 'ExponentPushToken[abc123]';
      pushTokenRepo.findOne.mockResolvedValue(null);
      pushTokenRepo.save.mockResolvedValue({ id: uuid(), userId, token, platform: 'ios' });

      await service.registerPushToken(userId, token, 'ios');

      expect(pushTokenRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        token,
        platform: 'ios',
      }));
    });

    it('should not duplicate if token already exists for user', async () => {
      const userId = uuid();
      const token = 'ExponentPushToken[abc123]';
      pushTokenRepo.findOne.mockResolvedValue({ id: uuid(), userId, token, platform: 'ios' });

      await service.registerPushToken(userId, token, 'ios');

      expect(pushTokenRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserPushTokens', () => {
    it('should return all tokens for a user', async () => {
      const userId = uuid();
      const tokens = [{ token: 'ExponentPushToken[abc]', platform: 'ios' }];
      pushTokenRepo.find.mockResolvedValue(tokens);

      const result = await service.getUserPushTokens(userId);

      expect(result).toEqual(tokens);
      expect(pushTokenRepo.find).toHaveBeenCalledWith({ where: { userId } });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/domain/notification/notification.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './notification.service'`

- [ ] **Step 3: Implement NotificationService**

```typescript
// backend/src/domain/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { v4 as uuid } from 'uuid';
import { notFound, forbidden } from '../../http/exceptions';

export interface CreateNotificationParams {
  userId: string;
  gymId: string;
  type: NotificationEntity['type'];
  title: string;
  body: string;
  data: Record<string, string>;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(PushTokenEntity)
    private readonly pushTokenRepo: Repository<PushTokenEntity>,
  ) {}

  async createNotification(params: CreateNotificationParams): Promise<NotificationEntity> {
    const notification = new NotificationEntity();
    notification.id = uuid();
    notification.userId = params.userId;
    notification.gymId = params.gymId;
    notification.type = params.type;
    notification.title = params.title;
    notification.body = params.body;
    notification.data = params.data;
    notification.read = false;

    return this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: string, page: number, limit: number): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, read: false } });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw notFound('Notification not found');
    }
    if (notification.userId !== userId) {
      throw forbidden('Notification does not belong to this user');
    }
    notification.read = true;
    await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, read: false },
      { read: true },
    );
  }

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    const existing = await this.pushTokenRepo.findOne({
      where: { token },
    });
    if (existing) {
      return;
    }
    const pushToken = new PushTokenEntity();
    pushToken.id = uuid();
    pushToken.userId = userId;
    pushToken.token = token;
    pushToken.platform = platform;
    await this.pushTokenRepo.save(pushToken);
  }

  async getUserPushTokens(userId: string): Promise<PushTokenEntity[]> {
    return this.pushTokenRepo.find({ where: { userId } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest src/domain/notification/notification.service.spec.ts --no-coverage
```

Expected: All 7 tests PASS.

- [ ] **Step 4b: Update UserProfileDto and UpdateUserProfileDto to include notificationPreferences**

The `GET /api/me` response (via `GetUserProfileService`) and `PATCH /api/me` handler must include `notificationPreferences`. Add the field to `UserProfileDto` in `backend/src/queries/user/dto/user-profile.dto.ts` and ensure `UpdateUserProfileCommand` + handler can accept and persist it.

```typescript
// Add to UserProfileDto:
@ApiProperty({
  description: 'Notification preferences',
  example: { booking_confirmations: true, waitlist_updates: true, class_changes: true, class_reminders: true },
})
notificationPreferences: {
  booking_confirmations: boolean;
  waitlist_updates: boolean;
  class_changes: boolean;
  class_reminders: boolean;
};
```

Add to `UpdateUserProfileDto`:

```typescript
@ApiProperty({ required: false, description: 'Notification preferences' })
@IsOptional()
notificationPreferences?: {
  booking_confirmations: boolean;
  waitlist_updates: boolean;
  class_changes: boolean;
  class_reminders: boolean;
};
```

Update the profile service and handler to read/write this field.

- [ ] **Step 5: Create DTOs**

```typescript
// backend/src/api/notification/dto/notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ enum: ['booking_confirmed', 'waitlist_promoted', 'class_cancelled', 'class_changed', 'class_reminder'] })
  type: string;

  @ApiProperty({ description: 'Short display title' })
  title: string;

  @ApiProperty({ description: 'Detail text' })
  body: string;

  @ApiProperty({ description: 'Navigation payload', example: { classId: 'uuid' } })
  data: Record<string, string>;

  @ApiProperty({ description: 'Whether the notification has been read' })
  read: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class GetNotificationsResponseDto {
  @ApiProperty({ type: [NotificationItemDto] })
  notifications: NotificationItemDto[];

  @ApiProperty({ description: 'Number of unread notifications' })
  unreadCount: number;
}
```

```typescript
// backend/src/api/notification/dto/register-push-token.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Expo push token', example: 'ExponentPushToken[xxx]' })
  @IsString()
  token: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'], description: 'Device platform' })
  @IsEnum(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';
}
```

- [ ] **Step 6: Create NotificationController**

```typescript
// backend/src/api/notification/notification.controller.ts
import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { UserScoped } from '../../auth/decorators/user-scoped.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from '../../domain/notification/notification.service';
import { GetNotificationsResponseDto, NotificationItemDto } from './dto/notification-response.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('/api/me/notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({ summary: 'Get notifications for authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications returned', type: GetNotificationsResponseDto })
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<GetNotificationsResponseDto> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const [notifications, unreadCount] = await Promise.all([
      this.notificationService.getUserNotifications(userId, pageNum, limitNum),
      this.notificationService.getUnreadCount(userId),
    ]);

    return {
      notifications: notifications.map(this.mapToDto),
      unreadCount,
    };
  }

  @Patch('/:id/read')
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() userId: string,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(notificationId, userId);
    return { success: true };
  }

  @Patch('/read-all')
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser() userId: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  private mapToDto(notification: any): NotificationItemDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt,
    };
  }
}
```

- [ ] **Step 7: Create PushTokenController (separate or add to notification controller)**

Add to `NotificationController` (at the bottom, before the private method):

```typescript
@Post('/push-token')
@Role(['athlete', 'owner', 'coach'])
@UserScoped()
@ApiOperation({ summary: 'Register a push notification token' })
@ApiResponse({ status: 201, description: 'Token registered' })
async registerPushToken(
  @CurrentUser() userId: string,
  @Body() dto: RegisterPushTokenDto,
): Promise<{ success: boolean }> {
  await this.notificationService.registerPushToken(userId, dto.token, dto.platform);
  return { success: true };
}
```

Note: The endpoint path will be `POST /api/me/notifications/push-token`.

- [ ] **Step 8: Create NotificationModule**

```typescript
// backend/src/domain/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, PushTokenEntity]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

- [ ] **Step 9: Wire into HttpModule**

In `backend/src/http/http.module.ts`, add:

```typescript
import { NotificationModule } from '../domain/notification/notification.module';
import { NotificationController } from '../api/notification/notification.controller';

// In imports array:
NotificationModule,

// In controllers array:
NotificationController,
```

- [ ] **Step 10: Verify — backend compiles and tests pass**

```bash
cd backend && npm run build && npx jest src/domain/notification/ --no-coverage
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat(notifications): add NotificationService, controller, and endpoints"
```

---

## Task 3: Backend — PushService (Expo Push API)

**Files:**
- Create: `backend/src/domain/notification/push.service.ts`
- Test: `backend/src/domain/notification/push.service.spec.ts`

- [ ] **Step 1: Write failing test for PushService**

```typescript
// backend/src/domain/notification/push.service.spec.ts
import { Test } from '@nestjs/testing';
import { PushService } from './push.service';
import { NotificationService } from './notification.service';

// Mock global fetch
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
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });

      await service.sendPushToUser(userId, 'Test Title', 'Test Body', { classId: 'c1' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('should not call fetch if user has no tokens', async () => {
      notificationService.getUserPushTokens.mockResolvedValue([]);

      await service.sendPushToUser('user-1', 'Title', 'Body', {});

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/domain/notification/push.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './push.service'`

- [ ] **Step 3: Implement PushService**

```typescript
// backend/src/domain/notification/push.service.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest src/domain/notification/push.service.spec.ts --no-coverage
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Register PushService in NotificationModule**

```typescript
// In notification.module.ts, add:
import { PushService } from './push.service';

// In providers array:
PushService,

// In exports array:
PushService,
```

- [ ] **Step 6: Verify build**

```bash
cd backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(notifications): add PushService for Expo Push API"
```

---

## Task 4: Backend — Event Definitions + NotificationListener

**Files:**
- Create: `backend/src/domain/notification/events/booking-created.event.ts`
- Create: `backend/src/domain/notification/events/waitlist-promoted.event.ts`
- Create: `backend/src/domain/notification/events/class-modified.event.ts`
- Create: `backend/src/domain/notification/events/class-cancelled.event.ts`
- Create: `backend/src/domain/notification/notification.listener.ts`
- Modify: `backend/src/domain/notification/notification.module.ts`
- Test: `backend/src/domain/notification/notification.listener.spec.ts`

- [ ] **Step 1: Create event classes**

```typescript
// backend/src/domain/notification/events/booking-created.event.ts
export class BookingCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly scheduledDate: string,
    public readonly scheduledTime: string,
  ) {}
}
```

```typescript
// backend/src/domain/notification/events/waitlist-promoted.event.ts
export class WaitlistPromotedEvent {
  constructor(
    public readonly userId: string,
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly scheduledDate: string,
    public readonly scheduledTime: string,
  ) {}
}
```

```typescript
// backend/src/domain/notification/events/class-modified.event.ts
export class ClassModifiedEvent {
  constructor(
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly changes: string,
    public readonly bookedUserIds: string[],
  ) {}
}
```

```typescript
// backend/src/domain/notification/events/class-cancelled.event.ts
export class ClassCancelledEvent {
  constructor(
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly scheduledDate: string,
    public readonly scheduledTime: string,
    public readonly bookedUserIds: string[],
  ) {}
}
```

- [ ] **Step 2: Write failing test for NotificationListener**

```typescript
// backend/src/domain/notification/notification.listener.spec.ts
import { Test } from '@nestjs/testing';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { BookingCreatedEvent } from './events/booking-created.event';
import { WaitlistPromotedEvent } from './events/waitlist-promoted.event';
import { ClassCancelledEvent } from './events/class-cancelled.event';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { v4 as uuid } from 'uuid';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationService: any;
  let pushService: any;
  let userRepo: any;

  beforeEach(async () => {
    notificationService = {
      createNotification: jest.fn(),
    };
    pushService = {
      sendPushToUser: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };

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
        uuid(), uuid(), uuid(), 'CrossFit', '2026-05-25', '07:00',
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
        uuid(), uuid(), uuid(), 'CrossFit', '2026-05-25', '07:00',
      );
      userRepo.findOne.mockResolvedValue({
        id: event.userId,
        notificationPreferences: { booking_confirmations: false },
      });

      await listener.handleBookingCreated(event);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(pushService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('handleClassCancelled', () => {
    it('should notify all booked athletes', async () => {
      const userIds = [uuid(), uuid()];
      const event = new ClassCancelledEvent(
        uuid(), uuid(), 'CrossFit', '2026-05-25', '07:00', userIds,
      );
      userRepo.findOne.mockResolvedValue({
        notificationPreferences: { class_changes: true },
      });

      await listener.handleClassCancelled(event);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(pushService.sendPushToUser).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && npx jest src/domain/notification/notification.listener.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './notification.listener'`

- [ ] **Step 4: Implement NotificationListener**

```typescript
// backend/src/domain/notification/notification.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { UserEntity } from '../user/entities/user.entity';
import { BookingCreatedEvent } from './events/booking-created.event';
import { WaitlistPromotedEvent } from './events/waitlist-promoted.event';
import { ClassModifiedEvent } from './events/class-modified.event';
import { ClassCancelledEvent } from './events/class-cancelled.event';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: event.userId } });
    if (!user || !user.notificationPreferences?.booking_confirmations) {
      return;
    }

    const title = 'Booking Confirmed';
    const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
    const data = { classId: event.classId };

    await this.notificationService.createNotification({
      userId: event.userId,
      gymId: event.gymId,
      type: 'booking_confirmed',
      title,
      body,
      data,
    });

    await this.pushService.sendPushToUser(event.userId, title, body, data);
  }

  @OnEvent('waitlist.promoted')
  async handleWaitlistPromoted(event: WaitlistPromotedEvent): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: event.userId } });
    if (!user || !user.notificationPreferences?.waitlist_updates) {
      return;
    }

    const title = "You're In!";
    const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
    const data = { classId: event.classId };

    await this.notificationService.createNotification({
      userId: event.userId,
      gymId: event.gymId,
      type: 'waitlist_promoted',
      title,
      body,
      data,
    });

    await this.pushService.sendPushToUser(event.userId, title, body, data);
  }

  @OnEvent('class.modified')
  async handleClassModified(event: ClassModifiedEvent): Promise<void> {
    for (const userId of event.bookedUserIds) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.notificationPreferences?.class_changes) {
        continue;
      }

      const title = 'Class Updated';
      const body = `${event.classTypeName} — ${event.changes}`;
      const data = { classId: event.classId };

      await this.notificationService.createNotification({
        userId,
        gymId: event.gymId,
        type: 'class_changed',
        title,
        body,
        data,
      });

      await this.pushService.sendPushToUser(userId, title, body, data);
    }
  }

  @OnEvent('class.cancelled')
  async handleClassCancelled(event: ClassCancelledEvent): Promise<void> {
    for (const userId of event.bookedUserIds) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.notificationPreferences?.class_changes) {
        continue;
      }

      const title = 'Class Cancelled';
      const body = `${event.classTypeName} at ${event.scheduledTime} on ${event.scheduledDate}`;
      const data = { classId: event.classId };

      await this.notificationService.createNotification({
        userId,
        gymId: event.gymId,
        type: 'class_cancelled',
        title,
        body,
        data,
      });

      await this.pushService.sendPushToUser(userId, title, body, data);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest src/domain/notification/notification.listener.spec.ts --no-coverage
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Register listener in NotificationModule**

Add to `notification.module.ts`:

```typescript
import { NotificationListener } from './notification.listener';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';

// Update imports array:
TypeOrmModule.forFeature([NotificationEntity, PushTokenEntity, UserEntity]),

// Add to providers:
NotificationListener,
```

- [ ] **Step 7: Verify build**

```bash
cd backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(notifications): add event definitions and NotificationListener"
```

---

## Task 5: Backend — Emit Events from Existing Handlers

**Files:**
- Modify: `backend/src/commands/class/handlers/book-class.handler.ts`
- Modify: `backend/src/commands/class/handlers/cancel-booking.handler.ts`
- Modify: `backend/src/commands/class/handlers/edit-class.handler.ts`
- Modify: `backend/src/commands/class/handlers/delete-class.handler.ts`

- [ ] **Step 1: Add EventEmitter2 to BookClassHandler and emit booking.created**

Inject `EventEmitter2` and emit after successful booking (not waitlisting):

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingCreatedEvent } from '../../../domain/notification/events/booking-created.event';

// In constructor:
private readonly eventEmitter: EventEmitter2,

// After saving booking, before return (only when status is 'booked'):
if (savedBooking.status === 'booked') {
  this.eventEmitter.emit(
    'booking.created',
    new BookingCreatedEvent(
      command.userId,
      command.gymId,
      command.classId,
      classEntity.classType?.name || 'Class',
      classEntity.scheduledDate instanceof Date
        ? classEntity.scheduledDate.toISOString().slice(0, 10)
        : String(classEntity.scheduledDate).slice(0, 10),
      classEntity.scheduledTime,
    ),
  );
}
```

- [ ] **Step 2: Add event emission to CancelBookingHandler for waitlist promotion**

After `promoteFirstWaitlistedBooking` successfully promotes an athlete, emit `waitlist.promoted`:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WaitlistPromotedEvent } from '../../../domain/notification/events/waitlist-promoted.event';

// In constructor:
private readonly eventEmitter: EventEmitter2,

// Modify promoteFirstWaitlistedBooking to return the promoted userId (or null):
// After promotion succeeds:
this.eventEmitter.emit(
  'waitlist.promoted',
  new WaitlistPromotedEvent(
    firstWaitlisted.userId,
    classEntity.gymId,
    classId,
    classEntity.classType?.name || 'Class',
    classEntity.scheduledDate instanceof Date
      ? classEntity.scheduledDate.toISOString().slice(0, 10)
      : String(classEntity.scheduledDate).slice(0, 10),
    classEntity.scheduledTime,
  ),
);
```

Note: The handler needs to load the classEntity to get gymId and class type name. It already has `classEntity` in scope from the execute method — pass it to `promoteFirstWaitlistedBooking`.

- [ ] **Step 3: Add event emission to EditClassHandler for material changes**

After saving the edited class, check if material fields changed and emit:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassModifiedEvent } from '../../../domain/notification/events/class-modified.event';

// In constructor:
private readonly eventEmitter: EventEmitter2,

// Before saving, capture original values:
const originalDate = cls.scheduledDate;
const originalTime = cls.scheduledTime;
const originalSpaceId = cls.spaceId;

// After saving, check for material changes:
const changes: string[] = [];
if (command.scheduledDate !== undefined) changes.push('date changed');
if (command.scheduledTime !== undefined) changes.push('time changed');
if (command.spaceId !== undefined) changes.push('location changed');

if (changes.length > 0) {
  const bookedBookings = await this.bookingRepository.getBookedBookingsByClass(saved.id);
  const bookedUserIds = bookedBookings.map(b => b.userId);

  if (bookedUserIds.length > 0) {
    this.eventEmitter.emit(
      'class.modified',
      new ClassModifiedEvent(
        command.gymId,
        saved.id,
        saved.classType?.name || 'Class',
        changes.join(', '),
        bookedUserIds,
      ),
    );
  }
}
```

Note: `bookingRepository.getBookedBookingsByClass` may need to be added if it doesn't exist — check existing methods. If not present, use `bookingRepository` with a `find({ where: { classId, status: 'booked' } })` pattern.

- [ ] **Step 4: Add event emission to DeleteClassHandler for cancellation**

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassCancelledEvent } from '../../../domain/notification/events/class-cancelled.event';

// In constructor:
private readonly eventEmitter: EventEmitter2,

// Before soft-delete, get booked athletes and emit:
const bookedBookings = await this.bookingRepository.find({
  where: { classId: command.classId, status: 'booked' },
});
const waitlistedBookings = await this.bookingRepository.find({
  where: { classId: command.classId, status: 'waitlisted' },
});
const allAffectedUserIds = [...bookedBookings, ...waitlistedBookings].map(b => b.userId);

if (allAffectedUserIds.length > 0) {
  this.eventEmitter.emit(
    'class.cancelled',
    new ClassCancelledEvent(
      command.gymId,
      command.classId,
      classEntity.classType?.name || 'Class',
      classEntity.scheduledDate instanceof Date
        ? classEntity.scheduledDate.toISOString().slice(0, 10)
        : String(classEntity.scheduledDate).slice(0, 10),
      classEntity.scheduledTime,
      allAffectedUserIds,
    ),
  );
}
```

- [ ] **Step 5: Verify — existing tests still pass**

```bash
cd backend && npx jest --no-coverage
```

Expected: All existing tests pass. (Event emission is fire-and-forget; existing handler tests mock or ignore the emitter.)

Note: Existing handler specs may need `EventEmitter2` added to their mock providers. Add: `{ provide: EventEmitter2, useValue: { emit: jest.fn() } }`.

- [ ] **Step 6: Verify build**

```bash
cd backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(notifications): emit domain events from booking, cancel, edit, delete handlers"
```

---

## Task 6: Backend — Reminder Scheduler

**Files:**
- Create: `backend/src/domain/notification/notification-reminder.scheduler.ts`
- Test: `backend/src/domain/notification/notification-reminder.scheduler.spec.ts`
- Modify: `backend/src/domain/notification/notification.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// backend/src/domain/notification/notification-reminder.scheduler.spec.ts
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
        { id: classId, gymId, classType: { name: 'CrossFit' }, scheduledTime: '07:00', scheduledDate: new Date('2026-05-25') },
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
      userId, 'Starting Soon', expect.any(String), expect.objectContaining({ classId }),
    );
  });

  it('should skip users with class_reminders disabled', async () => {
    const classId = uuid();
    const userId = uuid();

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: classId, gymId: uuid(), classType: { name: 'CrossFit' }, scheduledTime: '07:00', scheduledDate: new Date('2026-05-25') },
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
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/domain/notification/notification-reminder.scheduler.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './notification-reminder.scheduler'`

- [ ] **Step 3: Implement NotificationReminderScheduler**

```typescript
// backend/src/domain/notification/notification-reminder.scheduler.ts
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
    const reminderWindowStart = new Date(now.getTime() + (REMINDER_MINUTES_BEFORE - 1) * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000);

    const classes = await this.classRepo
      .createQueryBuilder('class')
      .where('class.state IN (:...states)', { states: ['published', 'booking_closed'] })
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
        const user = await this.userRepo.findOne({ where: { id: booking.userId } });
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest src/domain/notification/notification-reminder.scheduler.spec.ts --no-coverage
```

Expected: Both tests PASS.

- [ ] **Step 5: Register scheduler in NotificationModule**

```typescript
import { NotificationReminderScheduler } from './notification-reminder.scheduler';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';

// Update TypeOrmModule.forFeature:
TypeOrmModule.forFeature([NotificationEntity, PushTokenEntity, UserEntity, ClassEntity, BookingEntity]),

// Add to providers:
NotificationReminderScheduler,
```

- [ ] **Step 6: Verify build + all tests**

```bash
cd backend && npm run build && npx jest --no-coverage
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(notifications): add class reminder scheduler"
```

---

## Task 7: Frontend — UX Design (Notification Screens)

**Agent:** ux-designer

**Prompt inputs:**
- EPIC FILE: `epics/NOTIFICATIONS_EPIC.md`
- SCREENS TO DESIGN: `Notifications List`, `Notification Bell (header component)`
- STYLE REFERENCE: `designs/athlete-screens.pen`
- ROLE FILE: `designs/athlete-screens.pen`

**Screens to design:**

1. **Notifications List** — Full screen with:
   - Header: "Notifications" title + "Mark all read" text button
   - List items: type icon (left) + title (bold if unread) + body (gray) + relative timestamp (right)
   - Empty state: bell icon + "No notifications yet" text

2. **Notification Bell** — Header component showing:
   - Bell icon
   - Red badge with count (hidden when 0)

- [ ] **Step 1: Dispatch ux-designer agent with above inputs**
- [ ] **Step 2: Verify frames exist in `designs/athlete-screens.pen`**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "design(notifications): add Notifications List and Bell frames to athlete-screens.pen"
```

---

## Task 8: Frontend — Push Token Registration + Notifications Hook

**Files:**
- Create: `frontend/hooks/useNotifications.ts`
- Create: `frontend/hooks/usePushToken.ts`
- Modify: `frontend/package.json` (add expo-notifications, expo-device)
- Test: `frontend/__tests__/useNotifications.test.tsx`

- [ ] **Step 1: Install expo-notifications and expo-device**

```bash
cd frontend && npx expo install expo-notifications expo-device
```

- [ ] **Step 2: Write failing test for useNotifications**

```typescript
// frontend/__tests__/useNotifications.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../hooks/useNotifications';

// Mock useApiClient
jest.mock('../hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: jest.fn().mockResolvedValue({
      notifications: [
        { id: '1', type: 'booking_confirmed', title: 'Booking Confirmed', body: 'CrossFit at 07:00', data: { classId: 'c1' }, read: false, createdAt: '2026-05-23T10:00:00Z' },
      ],
      unreadCount: 1,
    }),
    patch: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

describe('useNotifications', () => {
  it('should fetch notifications and unread count', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.unreadCount).toBe(1);
    });
  });

  it('should mark a notification as read', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await result.current.markAsRead('1');
    // After marking read, unread count should update on next fetch
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd frontend && npx jest __tests__/useNotifications.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../hooks/useNotifications'`

- [ ] **Step 4: Implement useNotifications**

```typescript
// frontend/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const api = useApiClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/me/notifications');
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await api.patch(`/api/me/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    await api.patch('/api/me/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [api]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend && npx jest __tests__/useNotifications.test.tsx --no-coverage
```

Expected: Tests PASS.

- [ ] **Step 6: Implement usePushToken**

```typescript
// frontend/hooks/usePushToken.ts
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useApiClient } from './useApiClient';

export function usePushToken() {
  const api = useApiClient();

  useEffect(() => {
    async function register() {
      if (!Device.isDevice) {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      await api.post('/api/me/notifications/push-token', {
        token: tokenData.data,
        platform,
      });
    }

    register();
  }, [api]);
}
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(notifications): add useNotifications and usePushToken hooks"
```

---

## Task 9: Frontend — Notifications Screen + Bell Icon

**Files:**
- Create: `frontend/app/notifications.tsx`
- Create: `frontend/app/notifications.styles.ts`
- Create: `frontend/components/NotificationBell.tsx`
- Modify: `frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create NotificationBell component**

```typescript
// frontend/components/NotificationBell.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNotifications } from '@/hooks/useNotifications';
import { AppColors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      testID="notification-bell"
      style={styles.container}
    >
      <IconSymbol size={24} name="bell.fill" color={AppColors.text} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: AppColors.error,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: {
    color: AppColors.white,
    fontSize: FontSizes.xxs,
    fontWeight: '700',
  },
});
```

Note: Adjust token names (`AppColors.error`, `AppColors.white`, `Spacing.xxs`, `FontSizes.xxs`, `BorderRadius.full`) based on what actually exists in `frontend/constants/theme.ts`. Add tokens if needed.

- [ ] **Step 2: Create Notifications screen**

Implement `frontend/app/notifications.tsx` and `frontend/app/notifications.styles.ts` based on the Pencil design from Task 7. The screen should:
- Fetch notifications via `useNotifications()` hook
- Render a FlatList of notification items
- Show loading/empty states
- Tap item → `markAsRead(id)` + navigate based on `item.data.classId`
- Header has "Mark all read" button

- [ ] **Step 3: Add NotificationBell to tab layout header**

In `frontend/app/(tabs)/_layout.tsx`, add the bell to `screenOptions.headerRight`:

```typescript
import { NotificationBell } from '@/components/NotificationBell';

// In screenOptions:
headerRight: () => <NotificationBell />,
```

- [ ] **Step 4: Register push token on app start**

In `frontend/app/(tabs)/_layout.tsx` or the root layout, add:

```typescript
import { usePushToken } from '@/hooks/usePushToken';

// Inside the component:
usePushToken();
```

- [ ] **Step 5: Verify — app compiles and runs**

```bash
cd frontend && npx expo start --web
```

Expected: App loads, bell icon visible in header, tapping it navigates to notifications screen.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(notifications): add Notifications screen and bell icon to tab header"
```

---

## Task 10: Frontend — Notification Preferences in Profile

**Files:**
- Modify: `frontend/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add notification preferences section to profile screen**

Below the existing profile fields, add a "Notifications" section with 4 toggle switches:
- Booking confirmations (on/off)
- Waitlist updates (on/off)
- Class changes (on/off)
- Class reminders (on/off)

Each toggle calls `PATCH /api/me` with the updated `notificationPreferences` object.

Fetch current preferences from `GET /api/me` (which should now include `notificationPreferences` in the response).

- [ ] **Step 2: Update UserProfileDto to include notificationPreferences**

This requires the backend to include `notificationPreferences` in the `GET /api/me` response and accept it in `PATCH /api/me`. Verify this is included in the user profile service — if not, add it as a sub-task.

- [ ] **Step 3: Regenerate API types**

```bash
cd frontend && npm run generate:api-types
```

- [ ] **Step 4: Verify — preferences toggle and persist**

Manually test: toggle a preference, refresh the page, confirm it persists.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(notifications): add notification preferences toggles to profile"
```

---

## Execution Order & Dependencies

```
Task 1 (entities + migration + EventEmitter)
  └─→ Task 2 (service + controller)
       └─→ Task 3 (push service)
            └─→ Task 4 (listener)
                 └─→ Task 5 (emit from handlers)
                      └─→ Task 6 (reminder scheduler)

Task 7 (UX design) — can run in parallel with Tasks 1-6

Task 8 (frontend hooks) — depends on Task 2 (backend endpoints exist)
  └─→ Task 9 (screen + bell) — depends on Task 7 (designs) + Task 8 (hooks)
       └─→ Task 10 (preferences) — depends on Task 9
```

**Parallelization opportunities:**
- Tasks 1-6 (backend) can all run before any frontend work
- Task 7 (UX design) can run in parallel with backend tasks
- Tasks 8-10 must be sequential and depend on backend completion
