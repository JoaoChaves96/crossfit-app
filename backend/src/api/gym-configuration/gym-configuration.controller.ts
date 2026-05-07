import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  Inject,
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

// Space Commands
import { CreateSpaceCommand } from '../../commands/gym-configuration/create-space.command';
import { CreateSpaceDto } from '../../commands/gym-configuration/dto/create-space.dto';
import { CreateSpaceResponseDto } from '../../commands/gym-configuration/dto/create-space-response.dto';
import { UpdateSpaceCommand } from '../../commands/gym-configuration/update-space.command';
import { UpdateSpaceDto } from '../../commands/gym-configuration/dto/update-space.dto';
import { UpdateSpaceResponseDto } from '../../commands/gym-configuration/dto/update-space-response.dto';
import { DeleteSpaceCommand } from '../../commands/gym-configuration/delete-space.command';
import { DeleteSpaceResponseDto } from '../../commands/gym-configuration/dto/delete-space-response.dto';

// ClassType Commands
import { ConfigureClassTypesCommand } from '../../commands/gym-configuration/configure-class-types.command';
import { ConfigureClassTypesDto } from '../../commands/gym-configuration/dto/configure-class-types.dto';
import { ConfigureClassTypesResponseDto } from '../../commands/gym-configuration/dto/configure-class-types-response.dto';

// MembershipPlan Commands
import { CreateMembershipPlanCommand } from '../../commands/gym-configuration/create-membership-plan.command';
import { CreateMembershipPlanDto } from '../../commands/gym-configuration/dto/create-membership-plan.dto';
import { CreateMembershipPlanResponseDto } from '../../commands/gym-configuration/dto/create-membership-plan-response.dto';
import { UpdateMembershipPlanCommand } from '../../commands/gym-configuration/update-membership-plan.command';
import { UpdateMembershipPlanDto } from '../../commands/gym-configuration/dto/update-membership-plan.dto';
import { UpdateMembershipPlanResponseDto } from '../../commands/gym-configuration/dto/update-membership-plan-response.dto';
import { ArchiveMembershipPlanCommand } from '../../commands/gym-configuration/archive-membership-plan.command';
import { ArchiveMembershipPlanResponseDto } from '../../commands/gym-configuration/dto/archive-membership-plan-response.dto';
import { PurchaseMembershipPlanCommand } from '../../commands/gym-configuration/purchase-membership-plan.command';
import { PurchaseMembershipPlanDto } from '../../commands/gym-configuration/dto/purchase-membership-plan.dto';
import { PurchaseMembershipPlanResponseDto } from '../../commands/gym-configuration/dto/purchase-membership-plan-response.dto';

// Staff Commands
import { ManuallyAddMemberCommand } from '../../commands/gym-configuration/manually-add-member.command';
import { ManuallyAddMemberDto } from '../../commands/gym-configuration/dto/manually-add-member.dto';
import { ManuallyAddMemberResponseDto } from '../../commands/gym-configuration/dto/manually-add-member-response.dto';
import { InviteCoachCommand } from '../../commands/gym-configuration/invite-coach.command';
import { InviteCoachDto } from '../../commands/gym-configuration/dto/invite-coach.dto';
import { InviteCoachResponseDto } from '../../commands/gym-configuration/dto/invite-coach-response.dto';
import { ChangeCoachStatusCommand } from '../../commands/gym-configuration/change-coach-status.command';
import { ChangeCoachStatusResponseDto } from '../../commands/gym-configuration/dto/change-coach-status-response.dto';

// Coaches Query
import { CoachesQueryService } from '../../queries/gym-configuration/coaches.service';
import { GetCoachesResponseDto } from '../../queries/gym-configuration/dto/get-coaches-response.dto';

// ClassTypes Query
import { ClassTypesQueryService } from '../../queries/gym-configuration/class-types.service';
import { GetClassTypesResponseDto } from '../../queries/gym-configuration/dto/get-class-types-response.dto';

// Spaces Query
import { SpacesQueryService } from '../../queries/gym-configuration/spaces.service';
import { GetSpacesResponseDto } from '../../queries/gym-configuration/dto/get-spaces-response.dto';

@Controller('/api/gyms/:gymId/configuration')
@ApiTags('Gym Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class GymConfigurationController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly coachesQueryService: CoachesQueryService,
    private readonly classTypesQueryService: ClassTypesQueryService,
    private readonly spacesQueryService: SpacesQueryService,
  ) {}

  // ============= SPACES =============

  /**
   * List all spaces for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns all active (non-deleted) spaces for the gym
   */
  @Get('/spaces')
  @Role('owner')
  @ApiOperation({
    summary: 'List spaces',
    description:
      'Returns all active training spaces for the gym. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Spaces list returned',
    type: GetSpacesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getSpaces(
    @Param('gymId') gymId: string,
  ): Promise<GetSpacesResponseDto> {
    return this.spacesQueryService.getSpacesByGym(gymId);
  }

  /**
   * Create a space (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - Space name must be unique per gym
   * - Capacity must be > 0
   *
   * **Postconditions:**
   * - Space is created and available for class assignment
   */
  @Post('/spaces')
  @Role('owner')
  @ApiOperation({
    summary: 'Create a training space',
    description:
      'Define a physical training location in the gym. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateSpaceDto })
  @ApiResponse({
    status: 201,
    description: 'Space created',
    type: CreateSpaceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createSpace(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) createSpaceDto: CreateSpaceDto,
    @CurrentUser() userId: string,
  ): Promise<CreateSpaceResponseDto> {
    const command = new CreateSpaceCommand(
      userId,
      gymId,
      createSpaceDto.name,
      createSpaceDto.baseCapacity,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Update a space (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Space must exist and belong to gym
   * - If name changed, must be unique per gym
   * - If capacity changed, must be > 0
   *
   * **Postconditions:**
   * - Space is updated with new values
   * - Existing classes inherit new capacity (if not overridden)
   */
  @Patch('/spaces/:spaceId')
  @Role('owner')
  @ApiOperation({
    summary: 'Update a space',
    description: 'Modify space details. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'spaceId', description: 'Space ID' })
  @ApiBody({ type: UpdateSpaceDto })
  @ApiResponse({
    status: 200,
    description: 'Space updated',
    type: UpdateSpaceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async updateSpace(
    @Param('gymId') gymId: string,
    @Param('spaceId') spaceId: string,
    @Body(ValidationPipe) updateSpaceDto: UpdateSpaceDto,
    @CurrentUser() userId: string,
  ): Promise<UpdateSpaceResponseDto> {
    const command = new UpdateSpaceCommand(
      userId,
      spaceId,
      updateSpaceDto.name,
      updateSpaceDto.baseCapacity,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Delete a space (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Space must exist
   * - No active classes assigned to this space
   *
   * **Postconditions:**
   * - Space is soft-deleted (marked inactive)
   */
  @Delete('/spaces/:spaceId')
  @Role('owner')
  @ApiOperation({
    summary: 'Delete a space',
    description:
      'Remove a training space. Cannot delete spaces with active classes. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'spaceId', description: 'Space ID' })
  @ApiResponse({
    status: 200,
    description: 'Space deleted',
    type: DeleteSpaceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async deleteSpace(
    @Param('gymId') gymId: string,
    @Param('spaceId') spaceId: string,
    @CurrentUser() userId: string,
  ): Promise<DeleteSpaceResponseDto> {
    const command = new DeleteSpaceCommand(userId, spaceId);

    return this.commandBus.execute(command);
  }

  // ============= CLASS TYPES =============

  /**
   * List all class types for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns all active (non-deleted) class types for the gym
   */
  @Get('/class-types')
  @Role('owner')
  @ApiOperation({
    summary: 'List class types',
    description:
      'Returns all active class types for the gym. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Class types list returned',
    type: GetClassTypesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getClassTypes(
    @Param('gymId') gymId: string,
  ): Promise<GetClassTypesResponseDto> {
    return this.classTypesQueryService.getClassTypesByGym(gymId);
  }

  /**
   * Configure class types (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - For create: name must be unique per gym
   * - For delete: no active classes reference this class type
   *
   * **Postconditions:**
   * - ClassType is created, updated, or deleted (soft delete)
   */
  @Post('/class-types')
  @Role('owner')
  @ApiOperation({
    summary: 'Configure class types',
    description:
      'Create, update, or delete class types (e.g., CrossFit, Gymnastics). Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: ConfigureClassTypesDto })
  @ApiResponse({
    status: 201,
    description: 'Class type configured',
    type: ConfigureClassTypesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async configureClassTypes(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) configureClassTypesDto: ConfigureClassTypesDto,
    @CurrentUser() userId: string,
  ): Promise<ConfigureClassTypesResponseDto> {
    const command = new ConfigureClassTypesCommand(
      userId,
      gymId,
      configureClassTypesDto.operation,
      configureClassTypesDto.classTypeId,
      configureClassTypesDto.name,
      configureClassTypesDto.loggable,
      configureClassTypesDto.resultMetrics,
    );

    return this.commandBus.execute(command);
  }

  // ============= MEMBERSHIP PLANS =============

  /**
   * Create a membership plan (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - All class types must exist and belong to gym
   * - Pricing must be > 0
   * - Plan name must be unique per gym
   *
   * **Postconditions:**
   * - MembershipPlan is created with status = active
   * - Pricing and access control configured
   */
  @Post('/membership-plans')
  @Role('owner')
  @ApiOperation({
    summary: 'Create a membership plan',
    description:
      'Define a subscription tier with pricing and class access. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateMembershipPlanDto })
  @ApiResponse({
    status: 201,
    description: 'Membership plan created',
    type: CreateMembershipPlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createMembershipPlan(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) createMembershipPlanDto: CreateMembershipPlanDto,
    @CurrentUser() userId: string,
  ): Promise<CreateMembershipPlanResponseDto> {
    const command = new CreateMembershipPlanCommand(
      userId,
      gymId,
      createMembershipPlanDto.name,
      createMembershipPlanDto.pricing,
      createMembershipPlanDto.billingCycle,
      createMembershipPlanDto.classTypes,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Update a membership plan (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Plan must exist and not be archived
   * - If class types change, all must exist and belong to gym
   * - If pricing changed, must be > 0
   *
   * **Postconditions:**
   * - Plan is updated; changes apply to new athletes immediately
   * - Existing athletes' access is updated retroactively
   */
  @Patch('/membership-plans/:membershipPlanId')
  @Role('owner')
  @ApiOperation({
    summary: 'Update a membership plan',
    description:
      'Modify plan pricing, billing cycle, or class access. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipPlanId', description: 'Membership Plan ID' })
  @ApiBody({ type: UpdateMembershipPlanDto })
  @ApiResponse({
    status: 200,
    description: 'Membership plan updated',
    type: UpdateMembershipPlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async updateMembershipPlan(
    @Param('gymId') gymId: string,
    @Param('membershipPlanId') membershipPlanId: string,
    @Body(ValidationPipe) updateMembershipPlanDto: UpdateMembershipPlanDto,
    @CurrentUser() userId: string,
  ): Promise<UpdateMembershipPlanResponseDto> {
    const command = new UpdateMembershipPlanCommand(
      userId,
      gymId,
      membershipPlanId,
      updateMembershipPlanDto.name,
      updateMembershipPlanDto.pricing,
      updateMembershipPlanDto.billingCycle,
      updateMembershipPlanDto.classTypes,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Archive a membership plan (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Plan must exist and be active
   *
   * **Postconditions:**
   * - Plan status set to archived
   * - Existing athletes retain access until plan expiration
   * - New athletes cannot purchase archived plans
   */
  @Post('/membership-plans/:membershipPlanId/archive')
  @Role('owner')
  @ApiOperation({
    summary: 'Archive a membership plan',
    description:
      'Retire a plan. Existing athletes retain access; new athletes cannot purchase. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipPlanId', description: 'Membership Plan ID' })
  @ApiResponse({
    status: 201,
    description: 'Membership plan archived',
    type: ArchiveMembershipPlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async archiveMembershipPlan(
    @Param('gymId') gymId: string,
    @Param('membershipPlanId') membershipPlanId: string,
    @CurrentUser() userId: string,
  ): Promise<ArchiveMembershipPlanResponseDto> {
    const command = new ArchiveMembershipPlanCommand(
      userId,
      gymId,
      membershipPlanId,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Purchase a membership plan (Athlete)
   *
   * **Preconditions:**
   * - User must be authenticated as an athlete
   * - Athlete must have active GymMembership for gym
   * - Plan must exist, be active, and belong to gym
   *
   * **Postconditions:**
   * - AthleteMembershipPlan created with status = active
   * - Old plan (if exists) set to expired
   * - Athlete gains class visibility and booking access
   */
  @Post('/membership-plans/:membershipPlanId/purchase')
  @Role('athlete')
  @ApiOperation({
    summary: 'Purchase a membership plan',
    description: 'Subscribe to a plan to gain class access. Athletes only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipPlanId', description: 'Membership Plan ID' })
  @ApiBody({ type: PurchaseMembershipPlanDto })
  @ApiResponse({
    status: 201,
    description: 'Membership plan purchased',
    type: PurchaseMembershipPlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete role required',
  })
  async purchaseMembershipPlan(
    @Param('gymId') gymId: string,
    @Param('membershipPlanId') membershipPlanId: string,
    @Body(ValidationPipe) purchaseMembershipPlanDto: PurchaseMembershipPlanDto,
    @CurrentUser() userId: string,
  ): Promise<PurchaseMembershipPlanResponseDto> {
    // Verify membershipPlanId in path matches DTO (if provided)
    if (
      purchaseMembershipPlanDto.membershipPlanId &&
      purchaseMembershipPlanDto.membershipPlanId !== membershipPlanId
    ) {
      throw new Error('Membership plan ID mismatch');
    }

    const command = new PurchaseMembershipPlanCommand(
      userId,
      gymId,
      membershipPlanId,
    );

    return this.commandBus.execute(command);
  }

  // ============= STAFF MANAGEMENT =============

  /**
   * Manually add a member (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - Athlete must exist
   * - Athlete must not already be in gym
   * - If plan provided: plan must exist and belong to gym
   *
   * **Postconditions:**
   * - GymMembership created for athlete
   * - Optionally, AthleteMembershipPlan created if plan provided
   */
  @Post('/members')
  @Role('owner')
  @ApiOperation({
    summary: 'Manually add a member',
    description:
      'Enroll an athlete without requiring an invite code. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: ManuallyAddMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Member added',
    type: ManuallyAddMemberResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async manuallyAddMember(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) manuallyAddMemberDto: ManuallyAddMemberDto,
    @CurrentUser() userId: string,
  ): Promise<ManuallyAddMemberResponseDto> {
    const command = new ManuallyAddMemberCommand(
      userId,
      gymId,
      manuallyAddMemberDto.athleteUserId,
      manuallyAddMemberDto.membershipPlanId,
    );

    return this.commandBus.execute(command);
  }

  /**
   * List all coaches for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns all coaches (active and inactive) for the gym
   */
  @Get('/coaches')
  @Role('owner')
  @ApiOperation({
    summary: 'List coaches',
    description:
      'Returns all coaches (active and inactive) for the gym. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Coaches list returned',
    type: GetCoachesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getCoaches(
    @Param('gymId') gymId: string,
  ): Promise<GetCoachesResponseDto> {
    return this.coachesQueryService.getCoachesByGym(gymId);
  }

  /**
   * Invite a coach (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - Coach email must be valid
   * - Coach must not already be assigned to gym
   *
   * **Postconditions:**
   * - GymStaff entry created with role = coach
   * - Invitation email sent (async; implementation-specific)
   */
  @Post('/coaches')
  @Role('owner')
  @ApiOperation({
    summary: 'Invite a coach',
    description:
      'Send an invitation to a user to become a coach. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: InviteCoachDto })
  @ApiResponse({
    status: 201,
    description: 'Coach invited',
    type: InviteCoachResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async inviteCoach(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) inviteCoachDto: InviteCoachDto,
    @CurrentUser() userId: string,
  ): Promise<InviteCoachResponseDto> {
    const command = new InviteCoachCommand(
      userId,
      gymId,
      inviteCoachDto.coachEmail,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Change coach status (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - GymStaff entry must exist for the coach
   * - Coach cannot be the gym owner
   *
   * **Postconditions:**
   * - Coach status changed (active/inactive)
   * - Inactive coaches hidden from new assignments
   */
  @Patch('/coaches/:coachUserId')
  @Role('owner')
  @ApiOperation({
    summary: 'Change coach status',
    description:
      'Enable or disable a coach. Inactive coaches are hidden from new assignments. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'coachUserId', description: 'Coach User ID' })
  @ApiResponse({
    status: 200,
    description: 'Coach status updated',
    type: ChangeCoachStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async changeCoachStatus(
    @Param('gymId') gymId: string,
    @Param('coachUserId') coachUserId: string,
    @Body(ValidationPipe)
    changeCoachStatusDto: { status: 'active' | 'inactive' },
    @CurrentUser() userId: string,
  ): Promise<ChangeCoachStatusResponseDto> {
    const command = new ChangeCoachStatusCommand(
      userId,
      gymId,
      coachUserId,
      changeCoachStatusDto.status,
    );

    return this.commandBus.execute(command);
  }
}
