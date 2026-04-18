import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ArchiveMembershipPlanCommand } from '../archive-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ArchiveMembershipPlanResponseDto } from '../dto/archive-membership-plan-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';

/**
 * ArchiveMembershipPlanHandler: Orchestrates membership plan archiving
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Archive MembershipPlanEntity (set status = archived)
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: ArchiveMembershipPlan command specification
 */
@CommandHandler(ArchiveMembershipPlanCommand)
export class ArchiveMembershipPlanHandler implements ICommandHandler<ArchiveMembershipPlanCommand> {
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
  ) {}

  async execute(
    command: ArchiveMembershipPlanCommand,
  ): Promise<ArchiveMembershipPlanResponseDto> {
    // Precondition 1: Verify plan exists
    const plan = await this.membershipPlanRepository.findOne({
      where: { id: command.membershipPlanId },
    });
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Precondition 1b: SECURITY FIX #1 - Verify plan belongs to the requested gym
    if (plan.gymId !== command.gymId) {
      throw new ForbiddenException('Plan does not belong to this gym');
    }

    // Precondition 2: Verify plan is not already archived
    if (plan.status === 'archived') {
      throw new BadRequestException('Membership plan is already archived');
    }

    // Precondition 3: Verify user is gym owner for the plan's gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // State Change: Archive the plan (set status = archived)
    plan.status = 'archived';

    // Persist
    const archived = await this.membershipPlanRepository.save(plan);

    // Map to response DTO
    return this.mapToResponseDto(archived);
  }

  private mapToResponseDto(
    plan: MembershipPlanEntity,
  ): ArchiveMembershipPlanResponseDto {
    return {
      id: plan.id,
      gymId: plan.gymId,
      name: plan.name,
      pricing: plan.pricing,
      billingCycle: plan.billingCycle,
      classTypes: plan.classTypes,
      status: plan.status,
      createdAt: plan.createdAt,
    };
  }
}
