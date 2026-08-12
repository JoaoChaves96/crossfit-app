import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetMembershipAutoRollCommand } from '../set-membership-auto-roll.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * SetMembershipAutoRollHandler: flip a member's auto-renew on or off.
 *
 * autoRollCount counts renewals since auto-renew was last switched ON, so
 * turning it on resets the counter; turning it off leaves the history intact.
 */
@CommandHandler(SetMembershipAutoRollCommand)
export class SetMembershipAutoRollHandler
  implements ICommandHandler<SetMembershipAutoRollCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  async execute(
    command: SetMembershipAutoRollCommand,
  ): Promise<AthleteMembershipResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    const plan = await this.athleteMembershipPlanRepository.findOne({
      where: { gymMembershipId: command.gymMembershipId, status: 'active' },
      relations: ['membershipPlan'],
    });
    if (!plan) {
      throw new NotFoundException('Member has no active membership plan');
    }

    plan.autoRoll = command.autoRoll;
    if (command.autoRoll) {
      plan.autoRollCount = 0;
    }

    const saved = await this.athleteMembershipPlanRepository.save(plan);

    return {
      id: saved.id,
      gymMembershipId: saved.gymMembershipId,
      membershipPlanId: saved.membershipPlanId,
      planName: saved.membershipPlan?.name ?? null,
      status: saved.status,
      startedAt: saved.startedAt,
      expiresAt: saved.expiresAt,
      autoRoll: saved.autoRoll,
      autoRollCount: saved.autoRollCount,
    };
  }
}
