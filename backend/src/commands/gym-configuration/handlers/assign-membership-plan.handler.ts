import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { AssignMembershipPlanCommand } from '../assign-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * AssignMembershipPlanHandler: the owner-side twin of PurchaseMembershipPlan
 * (which stays athlete-only). Same atomic expire-then-create transaction, so a
 * member can never end up holding two active plan rows.
 *
 * Archived plans are rejected: existing subscribers keep theirs, but an
 * archived plan cannot be newly assigned.
 */
@CommandHandler(AssignMembershipPlanCommand)
export class AssignMembershipPlanHandler
  implements ICommandHandler<AssignMembershipPlanCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
  ) {}

  async execute(
    command: AssignMembershipPlanCommand,
  ): Promise<AthleteMembershipResponseDto> {
    // Precondition 1: caller owns this gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: the membership exists and belongs to this gym
    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    // Precondition 3: the plan exists, is active, and belongs to this gym
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

    // ATOMIC: expire the current plan, then create the new one
    const startedAt = new Date();

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.update(
        AthleteMembershipPlanEntity,
        { gymMembershipId: membership.id, status: 'active' },
        { status: 'expired' },
      );

      const athletePlan = new AthleteMembershipPlanEntity();
      athletePlan.id = uuid();
      athletePlan.gymMembershipId = membership.id;
      athletePlan.membershipPlanId = plan.id;
      athletePlan.status = 'active';
      athletePlan.startedAt = startedAt;
      athletePlan.expiresAt = this.calculateExpirationDate(
        startedAt,
        plan.billingCycle,
      );
      athletePlan.autoRoll = true;
      athletePlan.autoRollCount = 0;

      return manager.save(AthleteMembershipPlanEntity, athletePlan);
    });

    return {
      id: saved.id,
      gymMembershipId: saved.gymMembershipId,
      membershipPlanId: saved.membershipPlanId,
      planName: plan.name,
      status: saved.status,
      startedAt: saved.startedAt,
      expiresAt: saved.expiresAt,
      autoRoll: saved.autoRoll,
      autoRollCount: saved.autoRollCount,
    };
  }

  private calculateExpirationDate(
    from: Date,
    billingCycle: 'monthly' | 'annual',
  ): Date {
    const expiresAt = new Date(from);

    if (billingCycle === 'annual') {
      expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    } else {
      expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
    }

    return expiresAt;
  }
}
