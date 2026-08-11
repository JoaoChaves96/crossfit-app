import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { AthleteMembershipPlanEntity } from '../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

/**
 * AthleteMembershipPlanRepository: Pure persistence layer for athlete membership plans
 *
 * Responsibilities:
 * - Persist AthleteMembershipPlanEntity instances
 * - Query/retrieve AthleteMembershipPlanEntity instances
 * - Validate existence and status
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide initial state or timestamps
 */
@Injectable()
export class AthleteMembershipPlanRepository {
  constructor(
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  /**
   * Persist an AthleteMembershipPlanEntity to the database
   */
  async save(
    athleteMembershipPlanEntity: AthleteMembershipPlanEntity,
  ): Promise<AthleteMembershipPlanEntity> {
    return this.athleteMembershipPlanRepository.save(
      athleteMembershipPlanEntity,
    );
  }

  /**
   * Retrieve an athlete membership plan by ID
   */
  async getAthleteMembershipPlanById(
    planId: string,
  ): Promise<AthleteMembershipPlanEntity | null> {
    return this.athleteMembershipPlanRepository.findOne({
      where: { id: planId },
      relations: ['membershipPlan'],
    });
  }

  /**
   * Retrieve active athlete membership plan for a gym membership
   */
  async getActivePlanByGymMembership(
    gymMembershipId: string,
  ): Promise<AthleteMembershipPlanEntity | null> {
    return this.athleteMembershipPlanRepository.findOne({
      where: {
        gymMembershipId,
        status: 'active',
      },
      relations: ['membershipPlan'],
    });
  }

  /**
   * Retrieve all athlete membership plans for a gym membership (active or expired)
   */
  async getAllPlansByGymMembership(
    gymMembershipId: string,
  ): Promise<AthleteMembershipPlanEntity[]> {
    return this.athleteMembershipPlanRepository.find({
      where: { gymMembershipId },
      relations: ['membershipPlan'],
    });
  }

  /**
   * Retrieve every active plan whose expiry has arrived.
   * Rows with a null expiresAt are unlimited and are never returned.
   */
  async findDueForRenewal(now: Date): Promise<AthleteMembershipPlanEntity[]> {
    return this.athleteMembershipPlanRepository.find({
      where: {
        status: 'active',
        expiresAt: LessThanOrEqual(now),
      },
      relations: ['membershipPlan'],
    });
  }

  /**
   * Check if a plan is still active (not expired)
   */
  async isPlanActive(planId: string): Promise<boolean> {
    const plan = await this.athleteMembershipPlanRepository.findOne({
      where: { id: planId, status: 'active' },
    });
    return !!plan;
  }
}
