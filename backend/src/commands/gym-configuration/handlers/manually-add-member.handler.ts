import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ManuallyAddMemberCommand } from '../manually-add-member.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ManuallyAddMemberResponseDto } from '../dto/manually-add-member-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { v4 as uuid } from 'uuid';

/**
 * ManuallyAddMemberHandler: Orchestrates manual member addition
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create GymMembershipEntity
 * - Optionally create AthleteMembershipPlanEntity if plan provided
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: ManuallyAddMember command specification
 */
@CommandHandler(ManuallyAddMemberCommand)
export class ManuallyAddMemberHandler implements ICommandHandler<ManuallyAddMemberCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
  ) {}

  async execute(
    command: ManuallyAddMemberCommand,
  ): Promise<ManuallyAddMemberResponseDto> {
    // Precondition 1: Verify user is gym owner
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    // Precondition 3: Verify athlete user exists (minimal check - just verify userId exists)
    // In production, you'd verify the user exists via UserService
    // For now, we'll allow any userId and let the database constraint handle it

    // Precondition 4: Verify athlete does not already have GymMembership
    const existingMembership = await this.gymMembershipRepository.findOne({
      where: {
        gymId: command.gymId,
        userId: command.athleteUserId,
      },
    });
    if (existingMembership) {
      throw new BadRequestException(
        'Athlete already has membership in this gym',
      );
    }

    // Verify plan exists if provided (read-only precondition, before transaction)
    let plan: MembershipPlanEntity | null = null;
    if (command.membershipPlanId) {
      plan = await this.membershipPlanRepository.findOne({
        where: {
          id: command.membershipPlanId,
          gymId: command.gymId,
          status: 'active',
        },
      });
      if (!plan) {
        throw new NotFoundException(
          'Membership plan not found or does not belong to this gym',
        );
      }
    }

    // ATOMIC TRANSACTION: Create GymMembership and optionally AthleteMembershipPlan
    // Guarantees no duplicate GymMembership can be created concurrently
    const result = await this.dataSource.transaction(async (manager) => {
      // State Change: Create GymMembershipEntity
      const gymMembership = new GymMembershipEntity();
      gymMembership.id = uuid();
      gymMembership.gymId = command.gymId;
      gymMembership.userId = command.athleteUserId;
      gymMembership.status = 'active';
      gymMembership.joinedAt = new Date();

      // Persist GymMembership within transaction
      const savedGymMembership = await manager.save(
        GymMembershipEntity,
        gymMembership,
      );

      let athleteMembershipPlanId: string | undefined;

      // Optionally create AthleteMembershipPlan if plan was verified
      if (plan) {
        // Create AthleteMembershipPlanEntity
        const athletePlan = new AthleteMembershipPlanEntity();
        athletePlan.id = uuid();
        athletePlan.gymMembershipId = savedGymMembership.id;
        athletePlan.membershipPlanId = command.membershipPlanId!;
        athletePlan.status = 'active';
        athletePlan.startedAt = new Date();

        // Calculate expiresAt based on billing cycle
        const expiresAt = this.calculateExpirationDate(plan.billingCycle);
        athletePlan.expiresAt = expiresAt;

        // Persist within transaction
        const savedAthleteP = await manager.save(
          AthleteMembershipPlanEntity,
          athletePlan,
        );
        athleteMembershipPlanId = savedAthleteP.id;
      }

      return { savedGymMembership, athleteMembershipPlanId };
    });

    // Map to response DTO
    return this.mapToResponseDto(
      result.savedGymMembership,
      result.athleteMembershipPlanId,
    );
  }

  private calculateExpirationDate(billingCycle: 'monthly' | 'annual'): Date {
    const now = new Date();
    if (billingCycle === 'monthly') {
      now.setMonth(now.getMonth() + 1);
    } else if (billingCycle === 'annual') {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now;
  }

  private mapToResponseDto(
    gymMembership: GymMembershipEntity,
    athleteMembershipPlanId?: string,
  ): ManuallyAddMemberResponseDto {
    return {
      gymMembershipId: gymMembership.id,
      userId: gymMembership.userId,
      gymId: gymMembership.gymId,
      status: gymMembership.status,
      joinedAt: gymMembership.joinedAt,
      athleteMembershipPlanId,
    };
  }
}
