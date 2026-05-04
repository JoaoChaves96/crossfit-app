import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { TrainingHistoryService } from '../../queries/training-history/training-history.service';
import { GetTrainingHistoryResponseDto } from '../../queries/training-history/dto/get-training-history-response.dto';

@Controller('/api/gyms/:gymId/athletes')
@ApiTags('Athletes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AthleteController {
  constructor(
    private readonly trainingHistoryService: TrainingHistoryService,
  ) {}

  /**
   * Get authenticated athlete's training history for a specific gym
   *
   * **Access:** Athlete with active membership in the gym
   *
   * **Returns:**
   * - Past attended classes where attendance.present = true
   * - Only classes in 'completed' or 'archived' state
   * - Ordered by scheduled date descending (most recent first)
   * - Includes the athlete's logged result for each class if one exists
   * - gymId isolation: only returns classes belonging to the specified gym
   */
  @Get('/me/history')
  @Role('athlete')
  @ApiOperation({
    summary: 'Get athlete training history',
    description:
      'Retrieve past attended classes for the authenticated athlete in the specified gym. Only includes classes where the athlete was marked present and the class is in completed or archived state. Results are ordered by scheduled date descending.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Training history returned',
    type: GetTrainingHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete role with active gym membership required',
  })
  async getTrainingHistory(
    @Param('gymId') gymId: string,
    @CurrentUser() userId: string,
  ): Promise<GetTrainingHistoryResponseDto> {
    return this.trainingHistoryService.getTrainingHistory(userId, gymId);
  }
}
