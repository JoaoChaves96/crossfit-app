import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GymStatusGuard } from '../../auth/guards/gym-status.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetClassScheduleResponseDto } from '../../queries/class/dto/get-class-schedule-response.dto';

@Controller('/api/gyms/:gymId/schedule')
@ApiTags('Gym Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, GymStatusGuard)
export class GymScheduleController {
  constructor(private readonly classScheduleService: ClassScheduleService) {}

  /**
   * Get all classes in gym schedule for owner management (Gym Owner only)
   *
   * **Access:**
   * - Gym owner only
   * - No membership or plan filtering applied
   *
   * **Response:**
   * - All non-archived classes sorted by date/time
   * - Includes class type, coach, capacity, and booking count
   */
  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'Get gym schedule for owner',
    description:
      'Retrieve all classes in gym schedule for owner management. No membership filtering applied. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Gym schedule returned',
    type: GetClassScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getGymScheduleForOwner(
    @Param('gymId') gymId: string,
  ): Promise<GetClassScheduleResponseDto> {
    return this.classScheduleService.getClassScheduleForOwner(gymId);
  }
}
