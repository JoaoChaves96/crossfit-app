import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ChangeCoachStatusCommand } from '../change-coach-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ChangeCoachStatusResponseDto } from '../dto/change-coach-status-response.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';

/**
 * ChangeCoachStatusHandler: Orchestrates coach status changes
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Update GymStaffEntity status (active/inactive)
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: ChangeCoachStatus command specification
 */
@CommandHandler(ChangeCoachStatusCommand)
export class ChangeCoachStatusHandler implements ICommandHandler<ChangeCoachStatusCommand> {
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
  ) {}

  async execute(
    command: ChangeCoachStatusCommand,
  ): Promise<ChangeCoachStatusResponseDto> {
    // Precondition 1: Verify user is gym owner
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: Verify GymStaff entry exists for the coach
    const gymStaff = await this.gymStaffRepository.findOne({
      where: {
        userId: command.coachUserId,
        gymId: command.gymId,
        role: 'coach',
      },
    });
    if (!gymStaff) {
      throw new NotFoundException('Coach is not assigned to this gym');
    }

    // State Change: Update GymStaff status
    gymStaff.status = command.status;

    // Persist
    const updated = await this.gymStaffRepository.save(gymStaff);

    // Map to response DTO
    return this.mapToResponseDto(updated);
  }

  private mapToResponseDto(
    gymStaff: GymStaffEntity,
  ): ChangeCoachStatusResponseDto {
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
