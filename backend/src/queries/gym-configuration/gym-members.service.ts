import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { effectiveExpiresAt } from '../../domain/athlete-membership-plan/billing-cycle';
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
      const expiresAt = plan === null ? null : this.effectiveExpiry(plan, now);

      return {
        id: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        status: membership.status,
        joinedAt: membership.joinedAt,
        planId: plan?.membershipPlanId ?? null,
        planName: plan?.membershipPlan?.name ?? null,
        expiresAt,
        membershipStatus: this.deriveMembershipStatus(
          membership,
          plan,
          expiresAt,
          now,
        ),
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
   * The expiry this member is actually judged against, matching what the
   * athlete's own schedule and booking guards derive.
   *
   * The owner's list must not disagree with them: an auto-roll member sits on a
   * stale past `expiresAt` for up to an hour once per billing cycle, and
   * reporting that raw value would show the owner "expired" for a member who is
   * booking classes normally. Derivation only — this read path never writes the
   * rolled date back. See `effectiveExpiresAt` for why that is safe.
   */
  private effectiveExpiry(
    plan: AthleteMembershipPlanEntity,
    now: Date,
  ): Date | null {
    return effectiveExpiresAt(
      {
        expiresAt: plan.expiresAt != null ? new Date(plan.expiresAt) : null,
        autoRoll: plan.autoRoll,
        billingCycle: plan.membershipPlan.billingCycle,
      },
      now,
    );
  }

  /**
   * Suspension wins over plan health; a missing or lapsed plan reads as
   * expired; a non-null expiry inside the warning window reads as expiring.
   * A null expiry is unlimited and always reads as active.
   *
   * Takes the already-derived `expiresAt` rather than reading `plan.expiresAt`,
   * so the status cannot contradict the expiry reported beside it.
   */
  private deriveMembershipStatus(
    membership: GymMembershipEntity,
    plan: AthleteMembershipPlanEntity | null,
    effectiveExpiry: Date | null,
    now: Date,
  ): GymMemberItemDto['membershipStatus'] {
    if (membership.status === 'inactive') return 'inactive';
    if (!plan) return 'expired';
    if (effectiveExpiry === null) return 'active';

    const expiresAt = effectiveExpiry.getTime();
    if (expiresAt <= now.getTime()) return 'expired';

    const warningWindowEnd =
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

    return expiresAt <= warningWindowEnd ? 'expiring' : 'active';
  }
}
