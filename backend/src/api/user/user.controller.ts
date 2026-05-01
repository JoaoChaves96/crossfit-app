import { Controller, Get, UseGuards } from '@nestjs/common';
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

@Controller('/api/me')
@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userBookingsService: UserBookingsService) {}

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
  @Role('athlete')
  @UserScoped()
  @ApiOperation({
    summary: 'Get authenticated user bookings',
    description:
      'Retrieve all active bookings for the authenticated athlete. Crosses all gyms (user-scoped endpoint).',
  })
  @ApiResponse({
    status: 200,
    description: 'User bookings returned',
    type: GetUserBookingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete role required',
  })
  async getUserBookings(
    @CurrentUser() userId: string,
  ): Promise<GetUserBookingsResponseDto> {
    return this.userBookingsService.getUserBookings(userId);
  }
}
