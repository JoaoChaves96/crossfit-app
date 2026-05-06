import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentGym } from '../../auth/decorators/current-gym.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GymMembersQueryService } from '../../queries/gym-configuration/gym-members.service';
import { GetGymMembersResponseDto } from '../../queries/gym-configuration/dto/get-gym-members-response.dto';

@Controller('/api/gyms/:gymId/members')
@ApiTags('Gym Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymMembersController {
  constructor(
    private readonly gymMembersQueryService: GymMembersQueryService,
  ) {}

  /**
   * List all active members for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns all active gym members with name, email, and join date, sorted by joinedAt DESC
   */
  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'List active members',
    description:
      'Returns all active members for the gym, sorted by join date descending. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Active members list returned',
    type: GetGymMembersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getMembers(
    @Param('gymId') gymId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<GetGymMembersResponseDto> {
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    return this.gymMembersQueryService.getMembersByGym(gymId);
  }
}
