import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { InviteService } from '../../../domain/invite/invite.service';
import {
  CoachAlreadyStaffError,
  CoachInvitePendingError,
} from '../../../domain/invite/invite.errors';
import { InviteCoachResponseDto } from '../dto/invite-coach-response.dto';

/**
 * InviteCoachHandler: owner-authorized entry point for a coach invite.
 *
 * It no longer creates anything itself. It used to create a `pending` user with
 * a random 32-byte password nobody held and an ACTIVE gym_staff row on the
 * spot — so an invited coach without an account could never log in, and an
 * owner could make any registered user staff without their consent. Both are
 * now the invite subsystem's job: a coach-role token the invitee accepts.
 *
 * What stays here is authorization, which the generic invite endpoint cannot
 * express: creating a COACH is owner-only.
 */
@CommandHandler(InviteCoachCommand)
export class InviteCoachHandler implements ICommandHandler<InviteCoachCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(InviteService) private readonly inviteService: InviteService,
  ) {}

  async execute(command: InviteCoachCommand): Promise<InviteCoachResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    try {
      const invite = await this.inviteService.createInvite(
        command.gymId,
        command.userId,
        command.coachEmail,
        'coach',
      );

      return {
        inviteToken: invite.inviteToken,
        inviteLink: invite.inviteLink,
        expiresAt: invite.expiresAt,
        inviteeEmail: invite.inviteeEmail,
        role: 'coach',
      };
    } catch (err) {
      if (
        err instanceof CoachAlreadyStaffError ||
        err instanceof CoachInvitePendingError
      ) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
