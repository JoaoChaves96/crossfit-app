import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateMembershipPlanCommand } from '../update-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { UpdateMembershipPlanResponseDto } from '../dto/update-membership-plan-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import { ClassEntity } from '../../../domain/class/entities/class.entity';

/**
 * UpdateMembershipPlanHandler: Orchestrates membership plan updates
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Update MembershipPlanEntity with provided fields
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: UpdateMembershipPlan command specification
 */
@CommandHandler(UpdateMembershipPlanCommand)
export class UpdateMembershipPlanHandler implements ICommandHandler<UpdateMembershipPlanCommand> {
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  async execute(
    command: UpdateMembershipPlanCommand,
  ): Promise<UpdateMembershipPlanResponseDto> {
    // Precondition 1: Verify plan exists
    const plan = await this.membershipPlanRepository.findOne({
      where: { id: command.membershipPlanId },
    });
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Precondition 1b: SECURITY FIX #1 - Verify plan belongs to the requested gym
    if (plan.gymId !== command.gymId) {
      throw new ForbiddenException('Plan does not belong to this gym');
    }

    // Precondition 2: Verify plan is not archived
    if (plan.status === 'archived') {
      throw new BadRequestException('Cannot update archived membership plan');
    }

    // Precondition 3: Verify user is gym owner for the plan's gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 4: If name changed, verify uniqueness
    if (command.name !== undefined && command.name !== plan.name) {
      const existingPlans = await this.membershipPlanRepository.find({
        where: { gymId: plan.gymId },
      });
      const nameExists = existingPlans.some(
        (p) => p.name === command.name && p.id !== command.membershipPlanId,
      );
      if (nameExists) {
        throw new BadRequestException(
          'Membership plan with this name already exists in this gym',
        );
      }
    }

    // Precondition 5: If pricing changed, verify > 0
    if (command.pricing !== undefined && command.pricing <= 0) {
      throw new BadRequestException('Pricing must be greater than 0');
    }

    // Precondition 6: If classTypes changed, verify all exist and belong to gym
    if (command.classTypes !== undefined) {
      const classTypes = await this.classTypeService.getClassTypesByGym(
        plan.gymId,
      );
      for (const classTypeId of command.classTypes) {
        const classType = classTypes.find((ct) => ct.id === classTypeId);
        if (!classType) {
          throw new NotFoundException(
            `Class type ${classTypeId} not found or does not belong to this gym`,
          );
        }
      }

      // SECURITY FIX #3: Check for booking conflicts when removing class types
      const removedClassTypes = plan.classTypes.filter(
        (ct) => !command.classTypes!.includes(ct),
      );
      if (removedClassTypes.length > 0) {
        // Find classes of removed types in this gym and check for active bookings
        const classesWithRemovedTypes = await this.classRepository.find({
          where: {
            gymId: command.gymId,
            classTypeId: In(removedClassTypes),
          },
        });

        if (classesWithRemovedTypes.length > 0) {
          const classIdsToCheck = classesWithRemovedTypes.map((c) => c.id);
          const conflictingBookings = await this.bookingRepository.find({
            where: {
              classId: In(classIdsToCheck),
              status: 'booked',
            },
          });

          if (conflictingBookings.length > 0) {
            throw new BadRequestException(
              'Cannot remove class types that have active athlete bookings. Remove all athlete bookings before updating the plan.',
            );
          }
        }
      }
    }

    // State Change: Update with provided fields only
    if (command.name !== undefined) {
      plan.name = command.name;
    }
    if (command.pricing !== undefined) {
      plan.pricing = command.pricing;
    }
    if (command.billingCycle !== undefined) {
      plan.billingCycle = command.billingCycle;
    }
    if (command.classTypes !== undefined) {
      plan.classTypes = command.classTypes;
    }

    // Persist
    const updated = await this.membershipPlanRepository.save(plan);

    // Map to response DTO
    return this.mapToResponseDto(updated);
  }

  private mapToResponseDto(
    plan: MembershipPlanEntity,
  ): UpdateMembershipPlanResponseDto {
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
