import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateMembershipPlanCommand } from '../create-membership-plan.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { CreateMembershipPlanResponseDto } from '../dto/create-membership-plan-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { v4 as uuid } from 'uuid';

/**
 * CreateMembershipPlanHandler: Orchestrates membership plan creation
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create MembershipPlanEntity with proper initial state
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: CreateMembershipPlan command specification
 */
@CommandHandler(CreateMembershipPlanCommand)
export class CreateMembershipPlanHandler implements ICommandHandler<CreateMembershipPlanCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
  ) {}

  async execute(
    command: CreateMembershipPlanCommand,
  ): Promise<CreateMembershipPlanResponseDto> {
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

    // Precondition 3: Verify all class_types exist and belong to the same gym
    const classTypes = await this.classTypeService.getClassTypesByGym(
      command.gymId,
    );
    for (const classTypeId of command.classTypes) {
      const classType = classTypes.find((ct) => ct.id === classTypeId);
      if (!classType) {
        throw new NotFoundException(
          `Class type ${classTypeId} not found or does not belong to this gym`,
        );
      }
    }

    // Precondition 4: Verify pricing > 0
    if (command.pricing <= 0) {
      throw new BadRequestException('Pricing must be greater than 0');
    }

    // Precondition 5: Verify name is unique per gym (optional but enforcing)
    const existingPlans = await this.membershipPlanRepository.find({
      where: { gymId: command.gymId },
    });
    const nameExists = existingPlans.some((p) => p.name === command.name);
    if (nameExists) {
      throw new BadRequestException(
        'Membership plan with this name already exists in this gym',
      );
    }

    // State Change: Create MembershipPlanEntity with status = active
    const plan = new MembershipPlanEntity();
    plan.id = uuid();
    plan.gymId = command.gymId;
    plan.name = command.name;
    plan.pricing = command.pricing;
    plan.billingCycle = command.billingCycle;
    plan.classTypes = command.classTypes;
    plan.status = 'active';
    plan.createdAt = new Date();

    // Persist
    const saved = await this.membershipPlanRepository.save(plan);

    // Map to response DTO
    return this.mapToResponseDto(saved);
  }

  private mapToResponseDto(
    plan: MembershipPlanEntity,
  ): CreateMembershipPlanResponseDto {
    return {
      id: plan.id,
      gymId: plan.gymId,
      name: plan.name,
      pricing: plan.pricing,
      billingCycle: plan.billingCycle,
      classTypes: plan.classTypes,
      status: plan.status,
      createdAt: plan.createdAt,
    };
  }
}
