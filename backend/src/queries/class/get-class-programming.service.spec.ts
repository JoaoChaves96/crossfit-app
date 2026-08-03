import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetClassProgrammingService } from './get-class-programming.service';
import { ClassRepository } from '../../repositories/class.repository';
import { ProgrammingRepository } from '../../repositories/programming.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';

describe('GetClassProgrammingService', () => {
  let service: GetClassProgrammingService;
  let classRepository: { getClassById: jest.Mock };
  let programmingRepository: { getProgrammingByClassId: jest.Mock };
  let gymStaffService: { isGymOwner: jest.Mock; isCoach: jest.Mock };
  let gymMembershipRepository: { hasActiveMembershipInGym: jest.Mock };

  const gymId = 'gym-1';
  const classId = 'class-1';
  const userId = 'user-1';
  const coachUserId = 'coach-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetClassProgrammingService,
        { provide: ClassRepository, useValue: { getClassById: jest.fn() } },
        {
          provide: ProgrammingRepository,
          useValue: { getProgrammingByClassId: jest.fn() },
        },
        {
          provide: GymStaffService,
          useValue: { isGymOwner: jest.fn(), isCoach: jest.fn() },
        },
        {
          provide: GymMembershipRepository,
          useValue: { hasActiveMembershipInGym: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(GetClassProgrammingService);
    classRepository = module.get(ClassRepository);
    programmingRepository = module.get(ProgrammingRepository);
    gymStaffService = module.get(GymStaffService);
    gymMembershipRepository = module.get(GymMembershipRepository);
  });

  function mockClass(overrides = {}) {
    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId,
      coachUserId,
      loggable: true,
      ...overrides,
    });
  }

  it('allows an athlete with active membership to view programming', async () => {
    mockClass();
    gymStaffService.isGymOwner.mockResolvedValue(false);
    gymStaffService.isCoach.mockResolvedValue(false);
    gymMembershipRepository.hasActiveMembershipInGym.mockResolvedValue(true);
    programmingRepository.getProgrammingByClassId.mockResolvedValue({
      content: 'WOD',
      lastModifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await service.getClassProgramming(gymId, classId, userId);

    expect(gymMembershipRepository.hasActiveMembershipInGym).toHaveBeenCalledWith(
      userId,
      gymId,
    );
    expect(response.content).toBe('WOD');
    expect(response.loggable).toBe(true);
  });

  it('rejects a non-member from another gym with 403', async () => {
    mockClass();
    gymStaffService.isGymOwner.mockResolvedValue(false);
    gymStaffService.isCoach.mockResolvedValue(false);
    gymMembershipRepository.hasActiveMembershipInGym.mockResolvedValue(false);

    await expect(
      service.getClassProgramming(gymId, classId, userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      programmingRepository.getProgrammingByClassId,
    ).not.toHaveBeenCalled();
  });

  it('still allows the gym owner', async () => {
    mockClass();
    gymStaffService.isGymOwner.mockResolvedValue(true);
    gymMembershipRepository.hasActiveMembershipInGym.mockResolvedValue(false);
    programmingRepository.getProgrammingByClassId.mockResolvedValue(null);

    const response = await service.getClassProgramming(gymId, classId, userId);

    expect(response.content).toBeNull();
  });

  it('throws NotFound when class does not belong to the gym', async () => {
    classRepository.getClassById.mockResolvedValue(null);

    await expect(
      service.getClassProgramming(gymId, classId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
