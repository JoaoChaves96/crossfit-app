import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GymOwnershipGuard } from '../../auth/guards/gym-ownership.guard';
import { Role } from '../../auth/decorators/role.decorator';
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
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class GymMembersController {
  constructor(
    private readonly gymMembersQueryService: GymMembersQueryService,
  ) {}

  /**
   * List all members for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns every gym member (suspended included) with their current plan,
   *   expiry and derived membership status, sorted by joinedAt DESC
   */
  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'List members',
    description:
      'Returns every member for the gym — suspended members included — each with their current plan, expiry date and derived membership status, sorted by join date descending. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Members list returned',
    type: GetGymMembersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getMembers(
    @Param('gymId') gymId: string,
  ): Promise<GetGymMembersResponseDto> {
    return this.gymMembersQueryService.getMembersByGym(gymId);
  }
}
