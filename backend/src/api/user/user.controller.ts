import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { UserScoped } from '../../auth/decorators/user-scoped.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserBookingsService } from '../../queries/booking/user-bookings.service';
import { GetUserBookingsResponseDto } from '../../queries/booking/dto/get-user-bookings-response.dto';
import { GetUserProfileService } from '../../queries/user/get-user-profile.service';
import { UserProfileDto } from '../../queries/user/dto/user-profile.dto';
import { GetUserGymsService } from '../../queries/user/get-user-gyms.service';
import { GetUserGymsResponseDto } from '../../queries/user/dto/user-gyms-response.dto';
import { UpdateUserProfileDto } from '../../commands/user/dto/update-user-profile.dto';
import { UpdateUserProfileCommand } from '../../commands/user/update-user-profile.command';

@Controller('/api/me')
@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly userBookingsService: UserBookingsService,
    private readonly getUserProfileService: GetUserProfileService,
    private readonly getUserGymsService: GetUserGymsService,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Get authenticated user's active bookings
   *
   * **Access:** Athlete
   *
   * **Returns:**
   * - List of active bookings (status = booked or waitlisted)
   * - Excludes cancelled bookings
   * - Includes: booking id, classId, status
   * - Crosses all gyms (multi-gym support)
   */
  @Get('/bookings')
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({
    summary: 'Get authenticated user bookings',
    description:
      'Retrieve all active bookings for the authenticated user. Available to athletes, gym owners, and coaches. Crosses all gyms (user-scoped endpoint).',
  })
  @ApiResponse({
    status: 200,
    description: 'User bookings returned',
    type: GetUserBookingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async getUserBookings(
    @CurrentUser() userId: string,
  ): Promise<GetUserBookingsResponseDto> {
    return this.userBookingsService.getUserBookings(userId);
  }

  @Get('/gyms')
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({
    summary: "List the caller's gyms",
    description:
      'Every gym the authenticated user is actively attached to, as staff or as a member. Crosses all gyms (user-scoped endpoint); more than one entry is what makes the gym switcher appear.',
  })
  @ApiResponse({ status: 200, description: 'Gyms returned', type: GetUserGymsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserGyms(@CurrentUser() userId: string): Promise<GetUserGymsResponseDto> {
    return this.getUserGymsService.getGyms(userId);
  }

  @Get()
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description:
      'Returns the profile of the currently authenticated user (id, name, email, createdAt). Available to athletes, gym owners, and coaches.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile returned',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(@CurrentUser() userId: string): Promise<UserProfileDto> {
    return this.getUserProfileService.getProfile(userId);
  }

  @Patch()
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({
    summary: 'Update authenticated user profile',
    description:
      'Updates the profile of the currently authenticated user. Supports partial updates to name and notification preferences. Email is read-only and cannot be changed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile returned',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - name is required and must be non-empty',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    return this.commandBus.execute(
      new UpdateUserProfileCommand(
        userId,
        dto.name,
        dto.notificationPreferences,
      ),
    );
  }
}
