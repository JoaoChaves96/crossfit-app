import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { GymMemberItemDto } from './dto/gym-member-item.dto';
import { GetGymMembersResponseDto } from './dto/get-gym-members-response.dto';

/** A plan lapsing within this window is surfaced as "expiring". */
const EXPIRING_SOON_DAYS = 7;

@Injectable()
export class GymMembersQueryService {
  constructor(
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  /**
   * Owner-facing member list. Returns suspended members too — the owner needs
   * to see them in order to resume them.
   */
  async getMembersByGym(gymId: string): Promise<GetGymMembersResponseDto> {
    const memberships = await this.gymMembershipRepository.find({
      where: { gymId },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });

    if (memberships.length === 0) {
      return { members: [] };
    }

    const activePlans = await this.loadActivePlans(
      memberships.map((membership) => membership.id),
    );

    const now = new Date();

    const members: GymMemberItemDto[] = memberships.map((membership) => {
      const plan = activePlans.get(membership.id) ?? null;

      return {
        id: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        status: membership.status,
        joinedAt: membership.joinedAt,
        planId: plan?.membershipPlanId ?? null,
        planName: plan?.membershipPlan?.name ?? null,
        expiresAt: plan?.expiresAt ?? null,
        membershipStatus: this.deriveMembershipStatus(membership, plan, now),
        autoRoll: plan?.autoRoll ?? false,
        autoRollCount: plan?.autoRollCount ?? 0,
      };
    });

    return { members };
  }

  /**
   * GymMembershipEntity.membershipPlans is the unfiltered history and contains
   * expired rows, so query the active rows directly instead.
   */
  private async loadActivePlans(
    gymMembershipIds: string[],
  ): Promise<Map<string, AthleteMembershipPlanEntity>> {
    const rows = await this.athleteMembershipPlanRepository.find({
      where: { status: 'active', gymMembershipId: In(gymMembershipIds) },
      relations: ['membershipPlan'],
    });

    return new Map(rows.map((row) => [row.gymMembershipId, row]));
  }

  /**
   * Suspension wins over plan health; a missing or lapsed plan reads as
   * expired; a non-null expiry inside the warning window reads as expiring.
   * A null expiry is unlimited and always reads as active.
   */
  private deriveMembershipStatus(
    membership: GymMembershipEntity,
    plan: AthleteMembershipPlanEntity | null,
    now: Date,
  ): GymMemberItemDto['membershipStatus'] {
    if (membership.status === 'inactive') return 'inactive';
    if (!plan) return 'expired';
    if (plan.expiresAt === null) return 'active';

    const expiresAt = new Date(plan.expiresAt).getTime();
    if (expiresAt <= now.getTime()) return 'expired';

    const warningWindowEnd =
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

    return expiresAt <= warningWindowEnd ? 'expiring' : 'active';
  }
}
