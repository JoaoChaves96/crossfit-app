import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { InviteEntity, InviteRole } from './entities/invite.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { InviteResponseDto } from '../../api/invite/dto/invite-response.dto';
import { InviteListItemDto } from '../../api/invite/dto/invite-list-item.dto';
import { RevokeInviteResponseDto } from '../../api/invite/dto/revoke-invite-response.dto';
import { ValidateInviteResponseDto } from '../../api/invite/dto/validate-invite-response.dto';
import { AcceptInviteResponseDto } from '../../api/invite/dto/accept-invite-response.dto';
import { AuthService } from '../auth/auth.service';
import {
  AthleteAlreadyMemberError,
  CoachAlreadyStaffError,
  CoachInvitePendingError,
  GymNotFoundError,
  InviteAlreadyAcceptedError,
  InviteAlreadyRevokedError,
  InviteeNotRegisteredError,
  InviteExpiredError,
  InviteNotFoundError,
  InviteNotForCallerError,
  InviteRevokedError,
} from './invite.errors';

const INVITE_EXPIRY_DAYS = 7;
const TOKEN_BYTE_LENGTH = 32;

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(InviteEntity)
    private readonly inviteRepository: Repository<InviteEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  async createInvite(
    gymId: string,
    createdByUserId: string,
    inviteeEmail: string,
    role: InviteRole = 'athlete',
  ): Promise<InviteResponseDto> {
    // Verify gym exists
    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: gymId },
    });
    if (!gym) {
      throw new GymNotFoundError(gymId);
    }

    if (role === 'coach') {
      await this.assertCoachInvitable(gymId, inviteeEmail);
    }

    const inviteToken = randomBytes(TOKEN_BYTE_LENGTH)
      .toString('base64url')
      .slice(0, 43);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = new InviteEntity();
    invite.id = uuid();
    invite.gymId = gymId;
    invite.createdByUserId = createdByUserId;
    invite.inviteeEmail = inviteeEmail;
    invite.inviteToken = inviteToken;
    invite.expiresAt = expiresAt;
    invite.status = 'pending';
    invite.acceptedAt = null;
    invite.acceptedByUserId = null;
    invite.role = role;

    await this.inviteRepository.save(invite);

    const frontendUrl =
      process.env.FRONTEND_URL || 'https://app.crossfitbox.com';
    const inviteLink = `${frontendUrl}/invite/${inviteToken}`;

    await this.sendInviteEmail(inviteeEmail, gym.name, inviteLink);

    return {
      inviteToken,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      inviteeEmail,
      role,
    };
  }

  /**
   * Coach-specific preconditions.
   *
   * Any gym_staff row blocks, not just an active one: a deactivated coach is
   * brought back through the coach-status endpoint, not re-invited, and
   * re-inviting them would collide on acceptance anyway.
   *
   * A live pending invite also blocks, so an impatient owner cannot mint a
   * second link; they revoke the first or copy it from the invite list. An
   * expired pending row does not block — that is the legitimate re-invite.
   */
  private async assertCoachInvitable(
    gymId: string,
    inviteeEmail: string,
  ): Promise<void> {
    const existingUser = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email: inviteeEmail } });

    if (existingUser) {
      const existingStaff = await this.dataSource
        .getRepository(GymStaffEntity)
        .findOne({ where: { gymId, userId: existingUser.id } });
      if (existingStaff) {
        throw new CoachAlreadyStaffError(gymId);
      }
    }

    // Every pending row, not an arbitrary one: `findOne` here would pick a row
    // by no particular order, so with two pending rows for the same pair — a
    // race between two owner requests, or a row predating the single-live-invite
    // rule — it could land on the expired one and admit a second live invite.
    const pending = await this.inviteRepository.find({
      where: { gymId, inviteeEmail, role: 'coach', status: 'pending' },
    });
    const now = new Date();
    if (pending.some((invite) => now <= invite.expiresAt)) {
      throw new CoachInvitePendingError(inviteeEmail);
    }
  }

  async validateInvite(inviteToken: string): Promise<ValidateInviteResponseDto> {
    const invite = await this.inviteRepository.findOne({
      where: { inviteToken },
    });

    if (!invite) {
      throw new InviteNotFoundError(inviteToken);
    }

    const resolvedStatus = this.resolveStatus(invite);

    if (resolvedStatus !== invite.status && resolvedStatus === 'expired') {
      await this.inviteRepository.update(invite.id, { status: 'expired' });
    }

    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: invite.gymId },
    });

    const inviter = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: invite.createdByUserId },
    });

    const inviterStaff = await this.dataSource
      .getRepository(GymStaffEntity)
      .findOne({
        where: { gymId: invite.gymId, userId: invite.createdByUserId },
      });

    return {
      gymId: invite.gymId,
      gymName: gym?.name || '',
      gymLocation: gym?.location || '',
      inviteeEmail: invite.inviteeEmail,
      inviterName: inviter?.name || 'A gym staff member',
      inviterRole: inviterStaff?.role || 'owner',
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      status: resolvedStatus,
    };
  }

  /**
   * Accept an invite as the authenticated caller.
   *
   * `currentUserId` is required and comes from the verified JWT: the route
   * mounts JwtAuthGuard precisely so that this method never has to guess who is
   * accepting. Resolving the invitee from the invite's email instead — as this
   * used to — meant an unauthenticated caller holding any invite link got back
   * a JWT signed for whoever owns that address.
   */
  async acceptInvite(
    inviteToken: string,
    currentUserId: string,
  ): Promise<AcceptInviteResponseDto> {
    const invite = await this.inviteRepository.findOne({
      where: { inviteToken },
    });

    if (!invite) {
      throw new InviteNotFoundError(inviteToken);
    }

    const resolvedStatus = this.resolveStatus(invite);

    if (resolvedStatus === 'expired') {
      await this.inviteRepository.update(invite.id, { status: 'expired' });
      throw new InviteExpiredError(inviteToken);
    }

    if (resolvedStatus === 'revoked') {
      throw new InviteRevokedError(inviteToken);
    }

    if (resolvedStatus === 'accepted') {
      throw new InviteAlreadyAcceptedError(inviteToken);
    }

    // No caller, no acceptance. An empty id would reach TypeORM as an empty
    // `where` and match an arbitrary user, so it is refused here rather than
    // resolved.
    if (!currentUserId) {
      throw new InviteNotForCallerError();
    }

    const invitee: UserEntity | null = await this.dataSource.manager.findOne(
      UserEntity,
      { where: { id: currentUserId } },
    );

    if (!invitee) {
      throw new InviteeNotRegisteredError(invite.inviteeEmail);
    }

    // The invite names an address, not an account, and the caller names an
    // account: only if they agree is this the invited person. Compared
    // case-insensitively because emails are stored exactly as typed, and
    // "Nia@example.com" accepting an invite addressed to "nia@example.com" is
    // the same person.
    if (invitee.email.toLowerCase() !== invite.inviteeEmail.toLowerCase()) {
      throw new InviteNotForCallerError();
    }

    // Each role has its own "already attached" shape: a coach collides on
    // gym_staff, an athlete on gym_membership. Checking the wrong one would
    // let a coach be added twice.
    if (invite.role === 'coach') {
      const existingStaff = await this.dataSource
        .getRepository(GymStaffEntity)
        .findOne({ where: { gymId: invite.gymId, userId: invitee.id } });
      if (existingStaff) {
        throw new CoachAlreadyStaffError(invite.gymId);
      }
    } else {
      const existingMembership = await this.gymMembershipRepository.findOne({
        where: { gymId: invite.gymId, userId: invitee.id },
      });
      if (existingMembership) {
        throw new AthleteAlreadyMemberError(invite.gymId);
      }
    }

    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: invite.gymId },
    });

    await this.dataSource.transaction(async (manager) => {
      if (invite.role === 'coach') {
        const staff = new GymStaffEntity();
        staff.id = uuid();
        staff.gymId = invite.gymId;
        staff.userId = invitee!.id;
        staff.role = 'coach';
        staff.status = 'active';
        staff.assignedAt = new Date();

        await manager.save(GymStaffEntity, staff);
      } else {
        const membership = new GymMembershipEntity();
        membership.id = uuid();
        membership.gymId = invite.gymId;
        membership.userId = invitee!.id;
        membership.status = 'active';

        await manager.save(GymMembershipEntity, membership);
      }

      await manager.update(InviteEntity, invite.id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: invitee!.id,
      });
    });

    // The JWT carries gymId and role as claims fixed at sign time, so without
    // this the invitee keeps whatever context they had — `gymId: null` for a
    // fresh registration — and every gym-scoped request 403s until they log in
    // again. Same reason CreateGymHandler re-issues.
    //
    // For the gym just accepted, not the default one: issueTokenForUser resolves
    // the caller's *oldest* attachment, so a coach already staffed at another
    // gym would be handed a token naming that gym while the client stores this
    // one — reads look right and the first write 403s on GymOwnershipGuard.
    // This must stay after the transaction: issueTokenForGym resolves the role
    // from the staff/membership row, which only exists once it is committed.
    const token = await this.authService.issueTokenForGym(
      invitee.id,
      invite.gymId,
    );

    return {
      gym: { id: gym?.id ?? invite.gymId, name: gym?.name ?? '' },
      user: { id: invitee.id, email: invitee.email },
      role: invite.role,
      token,
      message:
        invite.role === 'coach'
          ? 'Successfully joined gym as coach'
          : 'Successfully joined gym',
    };
  }

  async listInvites(
    gymId: string,
    role?: InviteRole,
  ): Promise<InviteListItemDto[]> {
    const invites = await this.inviteRepository.find({
      where: role ? { gymId, role } : { gymId },
      order: { createdAt: 'DESC' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      inviteeEmail: invite.inviteeEmail,
      inviteToken: invite.inviteToken,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    }));
  }

  async revokeInvite(
    gymId: string,
    token: string,
  ): Promise<RevokeInviteResponseDto> {
    const invite = await this.inviteRepository.findOne({
      where: { gymId, inviteToken: token },
    });

    if (!invite) {
      throw new InviteNotFoundError(token);
    }

    if (invite.status === 'accepted') {
      throw new InviteAlreadyAcceptedError(token);
    }

    if (invite.status === 'revoked') {
      throw new InviteAlreadyRevokedError(token);
    }

    await this.inviteRepository.update(invite.id, { status: 'revoked' });

    return { message: 'Invite revoked' };
  }

  private resolveStatus(
    invite: InviteEntity,
  ): 'pending' | 'accepted' | 'expired' | 'revoked' {
    if (invite.status === 'accepted' || invite.status === 'revoked') {
      return invite.status;
    }
    if (new Date() > invite.expiresAt) {
      return 'expired';
    }
    return invite.status;
  }

  private async sendInviteEmail(
    inviteeEmail: string,
    gymName: string,
    inviteLink: string,
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[InviteService] DEV EMAIL — To: ${inviteeEmail} | Subject: You're invited to ${gymName}! | Link: ${inviteLink}`,
      );
      return;
    }

    // Production: integrate AWS SES or equivalent here
    console.warn(
      '[InviteService] Production email delivery not yet configured. Invite link:',
      inviteLink,
    );
  }
}
