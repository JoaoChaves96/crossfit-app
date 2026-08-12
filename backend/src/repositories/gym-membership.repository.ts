import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymMembershipEntity } from '../domain/gym-membership/entities/gym-membership.entity';

/**
 * GymMembershipRepository: Pure persistence layer for gym memberships
 *
 * Responsibilities:
 * - Persist GymMembershipEntity instances
 * - Query/retrieve GymMembershipEntity instances
 * - Validate existence and status
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide initial state or timestamps
 */
@Injectable()
export class GymMembershipRepository {
  constructor(
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
  ) {}

  /**
   * Persist a GymMembershipEntity to the database
   */
  async save(
    gymMembershipEntity: GymMembershipEntity,
  ): Promise<GymMembershipEntity> {
    return this.gymMembershipRepository.save(gymMembershipEntity);
  }

  /**
   * Retrieve a gym membership by ID
   *
   * Does not load plan rows: a membership has a history of them and none of
   * them is authoritatively "the current plan". Callers needing the current
   * plan use AthleteMembershipPlanRepository.getActivePlanByGymMembership.
   */
  async getGymMembershipById(
    gymMembershipId: string,
  ): Promise<GymMembershipEntity | null> {
    return this.gymMembershipRepository.findOne({
      where: { id: gymMembershipId },
    });
  }

  /**
   * Retrieve active gym membership for a user in a specific gym
   *
   * Plan rows are deliberately not loaded — see getGymMembershipById.
   */
  async getActiveGymMembershipByUserAndGym(
    userId: string,
    gymId: string,
  ): Promise<GymMembershipEntity | null> {
    return this.gymMembershipRepository.findOne({
      where: {
        userId,
        gymId,
        status: 'active',
      },
    });
  }

  /**
   * Retrieve all active gym memberships for a user
   */
  async getActiveGymMembershipsByUser(
    userId: string,
  ): Promise<GymMembershipEntity[]> {
    return this.gymMembershipRepository.find({
      where: {
        userId,
        status: 'active',
      },
    });
  }

  /**
   * Retrieve all gym memberships for a specific gym
   */
  async getGymMembershipsByGym(gymId: string): Promise<GymMembershipEntity[]> {
    return this.gymMembershipRepository.find({
      where: { gymId },
    });
  }

  /**
   * Check if a user has active membership in a gym
   */
  async hasActiveMembershipInGym(
    userId: string,
    gymId: string,
  ): Promise<boolean> {
    const count = await this.gymMembershipRepository.count({
      where: {
        userId,
        gymId,
        status: 'active',
      },
    });
    return count > 0;
  }
}
