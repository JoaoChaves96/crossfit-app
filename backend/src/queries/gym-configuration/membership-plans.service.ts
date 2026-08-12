import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MembershipPlanEntity } from '../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { MembershipPlanItemDto } from './dto/membership-plan-item.dto';
import { GetMembershipPlansResponseDto } from './dto/get-membership-plans-response.dto';

@Injectable()
export class MembershipPlansQueryService {
  constructor(
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  /**
   * Owner-facing plan list. Includes archived plans so the owner can see what
   * existing subscribers are still on.
   */
  async getPlansByGym(gymId: string): Promise<GetMembershipPlansResponseDto> {
    const entities = await this.membershipPlanRepository.find({
      where: { gymId },
      order: { createdAt: 'DESC' },
    });

    if (entities.length === 0) {
      return { plans: [] };
    }

    const subscriberCounts = await this.countActiveSubscribers(
      entities.map((entity) => entity.id),
    );

    const plans: MembershipPlanItemDto[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      pricing: entity.pricing,
      billingCycle: entity.billingCycle,
      classTypes: entity.classTypes ?? [],
      status: entity.status,
      subscriberCount: subscriberCounts.get(entity.id) ?? 0,
    }));

    return { plans };
  }

  private async countActiveSubscribers(
    planIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.athleteMembershipPlanRepository.find({
      where: { status: 'active', membershipPlanId: In(planIds) },
      select: ['membershipPlanId'],
    });

    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(
        row.membershipPlanId,
        (counts.get(row.membershipPlanId) ?? 0) + 1,
      );
    }

    return counts;
  }
}
