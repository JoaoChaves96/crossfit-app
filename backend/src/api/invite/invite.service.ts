import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { InviteEntity } from '../../domain/invite/entities/invite.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteListItemDto } from './dto/invite-list-item.dto';
import { RevokeInviteResponseDto } from './dto/revoke-invite-response.dto';
import { ValidateInviteResponseDto } from './dto/validate-invite-response.dto';
import { AcceptInviteResponseDto } from './dto/accept-invite-response.dto';
import {
  AthleteAlreadyMemberError,
  AthleteNotRegisteredError,
  GymNotFoundError,
  InviteAlreadyAcceptedError,
  InviteAlreadyRevokedError,
  InviteExpiredError,
  InviteNotFoundError,
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
  ) {}

  async createInvite(
    gymId: string,
    createdByUserId: string,
    inviteeEmail: string,
  ): Promise<InviteResponseDto> {
    // Verify gym exists
    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: gymId },
    });
    if (!gym) {
      throw new GymNotFoundError(gymId);
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
    };
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

    return {
      gymId: invite.gymId,
      gymName: gym?.name || '',
      gymLocation: gym?.location || '',
      inviteeEmail: invite.inviteeEmail,
      expiresAt: invite.expiresAt.toISOString(),
      status: resolvedStatus,
    };
  }

  async acceptInvite(
    inviteToken: string,
    currentUserId?: string,
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

    let athlete: UserEntity | null = null;

    if (currentUserId) {
      athlete = await this.dataSource.manager.findOne(UserEntity, {
        where: { id: currentUserId },
      });
    } else {
      athlete = await this.dataSource.manager.findOne(UserEntity, {
        where: { email: invite.inviteeEmail },
      });
    }

    if (!athlete) {
      throw new AthleteNotRegisteredError(invite.inviteeEmail);
    }

    const existingMembership = await this.gymMembershipRepository.findOne({
      where: { gymId: invite.gymId, userId: athlete.id },
    });
    if (existingMembership) {
      throw new AthleteAlreadyMemberError(invite.gymId);
    }

    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: invite.gymId },
    });

    await this.dataSource.transaction(async (manager) => {
      const membership = new GymMembershipEntity();
      membership.id = uuid();
      membership.gymId = invite.gymId;
      membership.userId = athlete!.id;
      membership.status = 'active';

      await manager.save(GymMembershipEntity, membership);

      await manager.update(InviteEntity, invite.id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: athlete!.id,
      });
    });

    return {
      gym: { id: gym?.id ?? invite.gymId, name: gym?.name ?? '' },
      athlete: { id: athlete.id, email: athlete.email },
      message: 'Successfully joined gym',
    };
  }

  async listInvites(gymId: string): Promise<InviteListItemDto[]> {
    const invites = await this.inviteRepository.find({
      where: { gymId },
      order: { createdAt: 'DESC' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      inviteeEmail: invite.inviteeEmail,
      inviteToken: invite.inviteToken,
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
