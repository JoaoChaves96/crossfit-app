import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Put,
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
import { AssignMembershipPlanCommand } from '../../commands/gym-configuration/assign-membership-plan.command';
import { AssignMembershipPlanRequestDto } from './dto/assign-membership-plan-request.dto';
import { SetGymMembershipStatusCommand } from '../../commands/gym-configuration/set-gym-membership-status.command';
import { SetMembershipAutoRollCommand } from '../../commands/gym-configuration/set-membership-auto-roll.command';
import { GymMembershipStatusResponseDto } from '../../commands/gym-configuration/dto/gym-membership-status-response.dto';
import { SetGymMembershipStatusRequestDto } from './dto/set-gym-membership-status-request.dto';
import { SetMembershipAutoRollRequestDto } from './dto/set-membership-auto-roll-request.dto';

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

  /**
   * Put a member on a membership plan (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Plan exists, is active, and belongs to this gym
   *
   * **Postconditions:**
   * - Any previous active plan row for the member is expired
   * - A new active plan row exists with auto-renew on and an expiry one
   *   billing cycle out
   */
  @Put('/:membershipId/membership/plan')
  @Role('owner')
  @ApiOperation({
    summary: 'Assign a membership plan to a member',
    description:
      'Moves the member onto the given active plan, expiring their previous plan atomically. Archived plans are rejected. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: AssignMembershipPlanRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Plan assigned',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'membershipPlanId missing or malformed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or active plan not found' })
  async assignMembershipPlan(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: AssignMembershipPlanRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new AssignMembershipPlanCommand(
        userId,
        gymId,
        membershipId,
        body.membershipPlanId,
      ),
    );
  }

  /**
   * Suspend or resume a member (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   *
   * **Postconditions:**
   * - The membership status is the requested value; the member's plan is untouched
   */
  @Patch('/:membershipId/status')
  @Role('owner')
  @ApiOperation({
    summary: 'Suspend or resume a member',
    description:
      'Sets the gym membership status. Suspending blocks the member without altering their plan. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: SetGymMembershipStatusRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Membership status updated',
    type: GymMembershipStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'status missing or not one of active|inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async setMembershipStatus(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: SetGymMembershipStatusRequestDto,
    @CurrentUser() userId: string,
  ): Promise<GymMembershipStatusResponseDto> {
    return this.commandBus.execute(
      new SetGymMembershipStatusCommand(
        userId,
        gymId,
        membershipId,
        body.status,
      ),
    );
  }

  /**
   * Toggle a member's plan auto-renew (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Member has an active plan
   *
   * **Postconditions:**
   * - The plan's autoRoll is the requested value; turning it on resets autoRollCount to 0
   */
  @Patch('/:membershipId/membership/auto-roll')
  @Role('owner')
  @ApiOperation({
    summary: 'Toggle a member’s plan auto-renew',
    description:
      'Turns auto-renew on or off for the member’s active plan. Turning it on resets the renewal count. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: SetMembershipAutoRollRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Auto-renew updated',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'autoRoll missing or not a boolean' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or active plan not found' })
  async setMembershipAutoRoll(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: SetMembershipAutoRollRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new SetMembershipAutoRollCommand(
        userId,
        gymId,
        membershipId,
        body.autoRoll,
      ),
    );
  }
}
