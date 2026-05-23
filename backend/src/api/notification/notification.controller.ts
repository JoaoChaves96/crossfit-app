import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationService } from '../../domain/notification/notification.service';
import {
  GetNotificationsResponseDto,
  NotificationItemDto,
} from './dto/notification-response.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('/api/me/notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated notifications with unread count', type: GetNotificationsResponseDto })
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<GetNotificationsResponseDto> {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '20', 10) || 20));

    const [result, unreadCount] = await Promise.all([
      this.notificationService.getUserNotifications(userId, {
        page: pageNum,
        limit: limitNum,
      }),
      this.notificationService.getUnreadCount(userId),
    ]);

    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      unreadCount,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() userId: string,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(notificationId, userId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser() userId: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register an Expo push token for the current user' })
  @ApiResponse({ status: 201, description: 'Push token registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid push token or platform' })
  async registerPushToken(
    @CurrentUser() userId: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: RegisterPushTokenDto,
  ): Promise<{ id: string; token: string; platform: string }> {
    const result = await this.notificationService.registerPushToken(
      userId,
      dto.token,
      dto.platform,
    );
    return { id: result.id, token: result.token, platform: result.platform };
  }
}
