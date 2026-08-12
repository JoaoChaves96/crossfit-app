import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GymOwnershipGuard } from '../../auth/guards/gym-ownership.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GymMembersQueryService } from '../../queries/gym-configuration/gym-members.service';
import { GetGymMembersResponseDto } from '../../queries/gym-configuration/dto/get-gym-members-response.dto';
import { ExtendMembershipCommand } from '../../commands/gym-configuration/extend-membership.command';
import { AthleteMembershipResponseDto } from '../../commands/gym-configuration/dto/athlete-membership-response.dto';
import { ExtendMembershipRequestDto } from './dto/extend-membership-request.dto';

@Controller('/api/gyms/:gymId/members')
@ApiTags('Gym Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class GymMembersController {
  constructor(
    private readonly gymMembersQueryService: GymMembersQueryService,
    @Inject(CommandBus) private readonly commandBus: CommandBus,
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

  /**
   * Extend a member's plan expiry (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Target date is in the future
   * - Member has a membership plan row
   *
   * **Postconditions:**
   * - The plan's expiresAt is the requested date and its status is active
   */
  @Patch('/:membershipId/membership/expiry')
  @Role('owner')
  @ApiOperation({
    summary: 'Extend a member’s plan expiry',
    description:
      'Sets a new future expiry date on the member’s plan. A lapsed plan is revived. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: ExtendMembershipRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Membership extended',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'expiresAt missing or not in the future' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or membership plan not found' })
  async extendMembership(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: ExtendMembershipRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new ExtendMembershipCommand(
        userId,
        gymId,
        membershipId,
        new Date(body.expiresAt),
      ),
    );
  }
}
