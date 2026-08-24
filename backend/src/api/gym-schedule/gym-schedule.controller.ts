import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GymStatusGuard } from '../../auth/guards/gym-status.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetClassScheduleResponseDto } from '../../queries/class/dto/get-class-schedule-response.dto';
import { GetGymScheduleQueryDto } from './dto/get-gym-schedule-query.dto';

@Controller('/api/gyms/:gymId/schedule')
@ApiTags('Gym Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, GymStatusGuard)
export class GymScheduleController {
  constructor(private readonly classScheduleService: ClassScheduleService) {}

  /**
   * Get classes in gym schedule for owner management (Gym Owner only)
   *
   * **Access:**
   * - Gym owner only
   * - No membership or plan filtering applied
   *
   * **Date range:**
   * - `startDate` / `endDate` are optional, inclusive calendar days (YYYY-MM-DD)
   * - Each bound is independent; omitting both returns the gym's whole schedule
   *
   * **Response:**
   * - Non-archived classes in the range, sorted by date/time
   * - Includes class type, coach, capacity, and booking count
   */
  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'Get gym schedule for owner',
    description:
      'Retrieve classes in the gym schedule for owner management, optionally narrowed to an inclusive startDate/endDate calendar-day range. Omitting both bounds returns the whole schedule. No membership filtering applied. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date',
    example: '2026-08-10',
    description:
      'Only return classes scheduled on or after this calendar day (inclusive, YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date',
    example: '2026-08-16',
    description:
      'Only return classes scheduled on or before this calendar day (inclusive, YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Gym schedule returned',
    type: GetClassScheduleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Malformed startDate/endDate, or startDate later than endDate',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getGymScheduleForOwner(
    @Param('gymId') gymId: string,
    @Query() query: GetGymScheduleQueryDto,
  ): Promise<GetClassScheduleResponseDto> {
    return this.classScheduleService.getClassScheduleForOwner(gymId, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
