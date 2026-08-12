import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtendMembershipCommand } from '../extend-membership.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * ExtendMembershipHandler: an owner pushes a member's plan expiry to a new date.
 *
 * Reviving matters here: extending a lapsed plan flips its status back to
 * active, which is what makes the member's classes visible again.
 */
@CommandHandler(ExtendMembershipCommand)
export class ExtendMembershipHandler
  implements ICommandHandler<ExtendMembershipCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  async execute(
    command: ExtendMembershipCommand,
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
      throw new ForbiddenException(
        'Membership does not belong to this gym',
      );
    }

    // Precondition 3: the target date is a real date in the future
    const expiresAt = new Date(command.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt is not a valid date');
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    // Precondition 4: the member has a plan row to extend
    const plan = await this.athleteMembershipPlanRepository.findOne({
      where: { gymMembershipId: command.gymMembershipId },
      relations: ['membershipPlan'],
      order: { startedAt: 'DESC' },
    });
    if (!plan) {
      throw new NotFoundException('Member has no membership plan to extend');
    }

    // State change: push the expiry out, revive the row if it had lapsed, and
    // clear the unconfirmed-renewal counter — an explicit extension IS the
    // owner confirming this membership, which is what autoRollCount tracks.
    plan.expiresAt = expiresAt;
    plan.status = 'active';
    plan.autoRollCount = 0;

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
