import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetGymMembershipStatusCommand } from '../set-gym-membership-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { GymMembershipStatusResponseDto } from '../dto/gym-membership-status-response.dto';

/**
 * SetGymMembershipStatusHandler: suspend or resume a member.
 *
 * Deliberately does NOT touch the plan row — the plan keeps ticking while the
 * member is suspended, which is why the members read model puts 'inactive'
 * ahead of plan health when deriving membershipStatus.
 */
@CommandHandler(SetGymMembershipStatusCommand)
export class SetGymMembershipStatusHandler
  implements ICommandHandler<SetGymMembershipStatusCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
  ) {}

  async execute(
    command: SetGymMembershipStatusCommand,
  ): Promise<GymMembershipStatusResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    membership.status = command.status;

    const saved = await this.gymMembershipRepository.save(membership);

    return {
      id: saved.id,
      gymId: saved.gymId,
      userId: saved.userId,
      status: saved.status,
      joinedAt: saved.joinedAt,
    };
  }
}
