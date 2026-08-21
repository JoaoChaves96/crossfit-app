import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InviteCoachHandler } from './invite-coach.handler';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { InviteService } from '../../../domain/invite/invite.service';
import { CoachAlreadyStaffError, CoachInvitePendingError } from '../../../domain/invite/invite.errors';

describe('InviteCoachHandler', () => {
  let handler: InviteCoachHandler;
  let gymService: { getGymById: jest.Mock };
  let gymStaffService: { isGymOwner: jest.Mock };
  let inviteService: { createInvite: jest.Mock };

  const OWNER_ID = 'owner-user-123';
  const GYM_ID = 'gym-123';
  const COACH_EMAIL = 'newcoach@example.com';
  const command = new InviteCoachCommand(OWNER_ID, GYM_ID, COACH_EMAIL);

  const activeGym = { id: GYM_ID, status: 'active' };
  const createdInvite = {
    inviteToken: 'tok-abc',
    inviteLink: 'http://localhost:8081/invite/tok-abc',
    expiresAt: '2026-08-20T00:00:00.000Z',
    inviteeEmail: COACH_EMAIL,
    role: 'coach' as const,
    delivery: 'sent' as const,
  };

  beforeEach(async () => {
    gymService = { getGymById: jest.fn().mockResolvedValue(activeGym) };
    gymStaffService = { isGymOwner: jest.fn().mockResolvedValue(true) };
    inviteService = { createInvite: jest.fn().mockResolvedValue(createdInvite) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteCoachHandler,
        { provide: GymService, useValue: gymService },
        { provide: GymStaffService, useValue: gymStaffService },
        { provide: InviteService, useValue: inviteService },
      ],
    }).compile();

    handler = module.get(InviteCoachHandler);
  });

  it('creates a coach-role invite and returns the link', async () => {
    const result = await handler.execute(command);

    expect(inviteService.createInvite).toHaveBeenCalledWith(GYM_ID, OWNER_ID, COACH_EMAIL, 'coach');
    expect(result).toEqual(createdInvite);
  });

  it('throws ForbiddenException when the caller is not the gym owner', async () => {
    gymStaffService.isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the gym does not exist', async () => {
    gymService.getGymById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the gym is not active', async () => {
    gymService.getGymById.mockResolvedValue({ id: GYM_ID, status: 'suspended' });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('maps CoachAlreadyStaffError to ConflictException', async () => {
    inviteService.createInvite.mockRejectedValue(new CoachAlreadyStaffError(GYM_ID));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('maps CoachInvitePendingError to ConflictException', async () => {
    inviteService.createInvite.mockRejectedValue(new CoachInvitePendingError(COACH_EMAIL));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('never creates a user or a gym_staff row itself', async () => {
    await handler.execute(command);

    // The handler has no DataSource dependency at all any more — constructing
    // it above without one is the assertion. This test documents why.
    expect(Object.keys(handler)).not.toContain('dataSource');
  });
});
