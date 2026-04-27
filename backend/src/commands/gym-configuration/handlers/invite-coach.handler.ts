import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { InviteCoachResponseDto } from '../dto/invite-coach-response.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../../../domain/user/entities/user.entity';
import { v4 as uuid } from 'uuid';

/**
 * InviteCoachHandler: Orchestrates coach invitations
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create GymStaffEntity with role = coach
 * - Send invitation email (implementation-specific; deferred for MVP)
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: InviteCoach command specification
 */
@CommandHandler(InviteCoachCommand)
export class InviteCoachHandler implements ICommandHandler<InviteCoachCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: InviteCoachCommand): Promise<InviteCoachResponseDto> {
    // Run all checks and writes inside a single transaction so that:
    // - Auth checks are repeated under the transactional connection, closing
    //   the TOCTOU window where a concurrent gym deactivation could occur
    //   between a pre-transaction check and the transactional write.
    // - A failure during gym_staff creation rolls back any newly-created user
    //   row, preventing orphaned records.
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const userRepository = manager.getRepository(UserEntity);
      const gymStaffRepository = manager.getRepository(GymStaffEntity);

      // Precondition 1: Verify user is gym owner (inside transaction to prevent TOCTOU)
      const isOwner = await this.gymStaffService.isGymOwner(
        command.userId,
        command.gymId,
      );
      if (!isOwner) {
        throw new ForbiddenException('User is not a gym owner for this gym');
      }

      // Precondition 2: Verify gym exists and is active (inside transaction to prevent TOCTOU)
      const gym = await this.gymService.getGymById(command.gymId);
      if (!gym) {
        throw new NotFoundException('Gym not found');
      }
      if (gym.status !== 'active') {
        throw new BadRequestException('Gym is not active');
      }

      // Precondition 3: Verify coach email is valid (basic email format check done by DTO validator)
      // Find existing user or create a new one for the invited coach
      let coachUser = await userRepository.findOne({
        where: { email: command.coachEmail },
      });
      if (!coachUser) {
        const newUser = new UserEntity();
        newUser.id = uuid();
        newUser.email = command.coachEmail;
        // Placeholder name until user completes profile setup.
        // Intentionally non-unique — user must update their actual name.
        newUser.name = 'Coach';
        newUser.passwordHash = null;
        newUser.socialLoginId = null;
        newUser.status = 'pending';
        coachUser = await userRepository.save(newUser);
      }

      // Precondition 4: Verify coach is not already a GymStaff member
      const existingStaff = await gymStaffRepository.findOne({
        where: {
          userId: coachUser.id,
          gymId: command.gymId,
        },
      });
      if (existingStaff) {
        throw new BadRequestException('Coach is already assigned to this gym');
      }

      // State Change: Create GymStaffEntity
      const gymStaff = new GymStaffEntity();
      gymStaff.id = uuid();
      gymStaff.gymId = command.gymId;
      gymStaff.userId = coachUser.id;
      gymStaff.role = 'coach';
      gymStaff.status = 'active';
      gymStaff.assignedAt = new Date();

      // Persist
      const saved = await gymStaffRepository.save(gymStaff);

      // TODO: Send invitation email (implementation-specific; deferred for MVP)
      // emailService.sendCoachInvitation(coachUser.email, gym.name)

      return this.mapToResponseDto(saved);
    });
  }

  private mapToResponseDto(gymStaff: GymStaffEntity): InviteCoachResponseDto {
    return {
      id: gymStaff.id,
      gymId: gymStaff.gymId,
      userId: gymStaff.userId,
      role: gymStaff.role,
      status: gymStaff.status,
      assignedAt: gymStaff.assignedAt,
    };
  }
}
