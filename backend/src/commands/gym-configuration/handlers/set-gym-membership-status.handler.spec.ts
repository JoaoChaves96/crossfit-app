import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetGymMembershipStatusHandler } from './set-gym-membership-status.handler';
import { SetGymMembershipStatusCommand } from '../set-gym-membership-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';

function buildMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gm-1',
    gymId: 'gym-1',
    userId: 'user-1',
    status: 'active',
    joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    ...overrides,
  } as unknown as GymMembershipEntity;
}

describe('SetGymMembershipStatusHandler', () => {
  let handler: SetGymMembershipStatusHandler;
  const isGymOwner = jest.fn();
  const findOne = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    [isGymOwner, findOne, save].forEach((m) => m.mockReset());
    isGymOwner.mockResolvedValue(true);
    save.mockImplementation((entity) => Promise.resolve(entity));

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetGymMembershipStatusHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne, save },
        },
      ],
    }).compile();

    handler = moduleRef.get(SetGymMembershipStatusHandler);
  });

  function command(status: 'active' | 'inactive') {
    return new SetGymMembershipStatusCommand(
      'owner-1',
      'gym-1',
      'gm-1',
      status,
    );
  }

  it('suspends an active member', async () => {
    const membership = buildMembership();
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('inactive'));

    expect(membership.status).toBe('inactive');
    expect(save).toHaveBeenCalledWith(membership);
    expect(result).toEqual({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'inactive',
      joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    });
  });

  it('resumes a suspended member', async () => {
    const membership = buildMembership({ status: 'inactive' });
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('active'));

    expect(result.status).toBe('active');
  });

  it('is idempotent when the status already matches', async () => {
    const membership = buildMembership();
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('active'));

    expect(result.status).toBe('active');
    expect(save).toHaveBeenCalledWith(membership);
  });

  it('403s when the caller is not an owner of the gym', async () => {
    findOne.mockResolvedValue(buildMembership());
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403s when the membership belongs to another gym', async () => {
    findOne.mockResolvedValue(buildMembership({ gymId: 'other-gym' }));

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
