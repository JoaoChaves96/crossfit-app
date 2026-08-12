import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { PurchaseMembershipPlanCommand } from '../purchase-membership-plan.command';
import { GymService } from '../../../domain/gym/gym.service';
import { PurchaseMembershipPlanResponseDto } from '../dto/purchase-membership-plan-response.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { addCycle } from '../../../domain/athlete-membership-plan/billing-cycle';
import { v4 as uuid } from 'uuid';

/**
 * PurchaseMembershipPlanHandler: Orchestrates membership plan purchase
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create AthleteMembershipPlanEntity with proper initial state
 * - Expire old plan if exists
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: PurchaseMembershipPlan command specification
 */
@CommandHandler(PurchaseMembershipPlanCommand)
export class PurchaseMembershipPlanHandler implements ICommandHandler<PurchaseMembershipPlanCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  async execute(
    command: PurchaseMembershipPlanCommand,
  ): Promise<PurchaseMembershipPlanResponseDto> {
    // Precondition 1: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    // Precondition 2: Verify athlete has active GymMembership for the gym
    const gymMembership = await this.gymMembershipRepository.findOne({
      where: {
        gymId: command.gymId,
        userId: command.userId,
        status: 'active',
      },
    });
    if (!gymMembership) {
      throw new NotFoundException(
        'Athlete does not have active membership in this gym',
      );
    }

    // Precondition 3: Verify membership plan exists, is active, and belongs to gym
    const plan = await this.membershipPlanRepository.findOne({
      where: {
        id: command.membershipPlanId,
        gymId: command.gymId,
        status: 'active',
      },
    });
    if (!plan) {
      throw new NotFoundException('Membership plan not found or is not active');
    }

    // ATOMIC TRANSACTION: Expire old plan and create new plan
    // Guarantees only ONE active plan per athlete + gym at any time
    const saved = await this.dataSource.transaction(async (manager) => {
      // 1. Expire all existing active plans for this athlete + gym
      await manager.update(
        AthleteMembershipPlanEntity,
        {
          gymMembershipId: gymMembership.id,
          status: 'active',
        },
        {
          status: 'expired',
        },
      );

      // 2. Create new AthleteMembershipPlan with status = active
      const athletePlan = new AthleteMembershipPlanEntity();
      athletePlan.id = uuid();
      athletePlan.gymMembershipId = gymMembership.id;
      athletePlan.membershipPlanId = command.membershipPlanId;
      athletePlan.status = 'active';
      athletePlan.startedAt = new Date();

      // One billing cycle out, via the shared clamped UTC arithmetic (a local
      // unclamped copy here used to skip February for a month-end purchase).
      athletePlan.expiresAt = addCycle(athletePlan.startedAt, plan.billingCycle);

      // Persist within transaction
      return manager.save(AthleteMembershipPlanEntity, athletePlan);
    });

    // Map to response DTO
    return this.mapToResponseDto(saved);
  }


  private mapToResponseDto(
    athletePlan: AthleteMembershipPlanEntity,
  ): PurchaseMembershipPlanResponseDto {
    return {
      id: athletePlan.id,
      gymMembershipId: athletePlan.gymMembershipId,
      membershipPlanId: athletePlan.membershipPlanId,
      status: athletePlan.status,
      startedAt: athletePlan.startedAt,
      expiresAt: athletePlan.expiresAt,
    };
  }
}
