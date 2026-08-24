import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChangeCoachStatusHandler } from './change-coach-status.handler';
import { ChangeCoachStatusCommand } from '../change-coach-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';

function buildStaff(overrides: Record<string, unknown> = {}) {
  return {
    id: 'staff-1',
    gymId: 'gym-1',
    userId: 'coach-1',
    role: 'coach',
    status: 'active',
    assignedAt: new Date('2026-02-01T09:00:00.000Z'),
    ...overrides,
  } as unknown as GymStaffEntity;
}

describe('ChangeCoachStatusHandler', () => {
  let handler: ChangeCoachStatusHandler;
  const isGymOwner = jest.fn();
  const findOne = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    [isGymOwner, findOne, save].forEach((m) => m.mockReset());
    isGymOwner.mockResolvedValue(true);
    save.mockImplementation((entity) => Promise.resolve(entity));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChangeCoachStatusHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymStaffEntity),
          useValue: { findOne, save },
        },
      ],
    }).compile();

    handler = moduleRef.get(ChangeCoachStatusHandler);
  });

  function command(status: 'active' | 'inactive') {
    return new ChangeCoachStatusCommand('owner-1', 'gym-1', 'coach-1', status);
  }

  it('disables an active coach', async () => {
    const staff = buildStaff();
    findOne.mockResolvedValue(staff);

    const result = await handler.execute(command('inactive'));

    expect(staff.status).toBe('inactive');
    expect(save).toHaveBeenCalledWith(staff);
    expect(result).toEqual({
      id: 'staff-1',
      gymId: 'gym-1',
      userId: 'coach-1',
      role: 'coach',
      status: 'inactive',
      assignedAt: new Date('2026-02-01T09:00:00.000Z'),
    });
  });

  it('re-enables a disabled coach', async () => {
    findOne.mockResolvedValue(buildStaff({ status: 'inactive' }));

    const result = await handler.execute(command('active'));

    expect(result.status).toBe('active');
    expect(save).toHaveBeenCalled();
  });

  it('is idempotent when the coach already has the requested status', async () => {
    findOne.mockResolvedValue(buildStaff({ status: 'inactive' }));

    const result = await handler.execute(command('inactive'));

    expect(result.status).toBe('inactive');
    expect(save).toHaveBeenCalled();
  });

  it('403s when the caller is not an active owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);
    findOne.mockResolvedValue(buildStaff());

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('checks ownership before looking the coach up, so a non-owner learns nothing about who staffs the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(findOne).not.toHaveBeenCalled();
  });

  it('404s when no coach staff row exists for that user', async () => {
    findOne.mockResolvedValue(null);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      NotFoundException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("scopes the coach lookup to the command's gym, so another gym's staff row cannot be reached", async () => {
    findOne.mockResolvedValue(buildStaff());

    await handler.execute(command('inactive'));

    expect(findOne).toHaveBeenCalledWith({
      where: { userId: 'coach-1', gymId: 'gym-1', role: 'coach' },
    });
  });

  it("filters the lookup to role 'coach', so an owner cannot disable their own ownership and lock themselves out", async () => {
    findOne.mockResolvedValue(null);

    await expect(
      handler.execute(
        new ChangeCoachStatusCommand('owner-1', 'gym-1', 'owner-1', 'inactive'),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'coach' }),
      }),
    );
  });
});
