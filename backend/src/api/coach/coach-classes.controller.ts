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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetCoachClassesResponseDto } from '../../queries/class/dto/get-coach-classes-response.dto';

@Controller('/api/gyms/:gymId/coach/classes')
@ApiTags('Coach Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, GymStatusGuard)
export class CoachClassesController {
  constructor(private readonly classScheduleService: ClassScheduleService) {}

  /**
   * Get classes assigned to the authenticated coach in this gym.
   *
   * Authorization is enforced at guard level (coach role) and at service
   * level: only an active coach in this gym whose userId matches the
   * requesting user can see results. No cross-gym or cross-coach access.
   */
  @Get()
  @Role('coach')
  @ApiOperation({
    summary: 'Get classes assigned to the authenticated coach',
    description:
      'Retrieve all non-archived classes assigned to the requesting coach in the given gym. ' +
      'Scoped by gymId and coachId — no cross-gym or cross-coach access. Coaches only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'List of classes assigned to the coach',
    type: GetCoachClassesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Coach role required',
  })
  async getCoachClasses(
    @Param('gymId') gymId: string,
    @CurrentUser() userId: string,
  ): Promise<GetCoachClassesResponseDto> {
    return this.classScheduleService.getCoachClasses(gymId, userId);
  }
}
