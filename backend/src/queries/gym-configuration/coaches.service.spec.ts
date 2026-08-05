import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { CoachesQueryService } from './coaches.service';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { ClassEntity } from '../../domain/class/entities/class.entity';
import { ClassTypeEntity } from '../../domain/class-type/entities/class-type.entity';

describe('CoachesQueryService', () => {
  let service: CoachesQueryService;
  let gymStaffRepository: { find: jest.Mock };
  let userRepository: { findOne: jest.Mock };
  let classRepository: { find: jest.Mock };
  let classTypeRepository: { find: jest.Mock };

  const gymId = 'gym-1';
  const otherGymId = 'gym-2';
  const coachUserId = 'coach-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachesQueryService,
        {
          provide: getRepositoryToken(GymStaffEntity),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClassEntity),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClassTypeEntity),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CoachesQueryService);
    gymStaffRepository = module.get(getRepositoryToken(GymStaffEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    classRepository = module.get(getRepositoryToken(ClassEntity));
    classTypeRepository = module.get(getRepositoryToken(ClassTypeEntity));

    gymStaffRepository.find.mockResolvedValue([
      {
        id: 'staff-1',
        gymId,
        userId: coachUserId,
        role: 'coach',
        status: 'active',
        assignedAt: new Date('2024-01-15T10:00:00.000Z'),
      },
    ]);

    userRepository.findOne.mockResolvedValue({
      id: coachUserId,
      name: 'Carlos Silva',
      email: 'coach@example.com',
    });

    classTypeRepository.find.mockResolvedValue([
      { id: 'ct-crossfit', gymId, name: 'CrossFit WOD' },
      { id: 'ct-gymnastics', gymId, name: 'Gymnastics' },
    ]);
  });

  // Emulates the gymId + deletedAt IS NULL scoping the real query enforces,
  // so cross-gym and soft-deleted classes never reach the service logic.
  function scopedClasses(all: Partial<ClassEntity>[]) {
    classRepository.find.mockImplementation(({ where }) => {
      expect(where).toEqual({ gymId, deletedAt: IsNull() });
      return Promise.resolve(
        all.filter((c) => c.gymId === gymId && c.deletedAt == null),
      );
    });
  }

  it('de-duplicates multiple classes of the same type into a single name', async () => {
    scopedClasses([
      { gymId, coachUserId, classTypeId: 'ct-crossfit', deletedAt: null },
      { gymId, coachUserId, classTypeId: 'ct-crossfit', deletedAt: null },
      { gymId, coachUserId, classTypeId: 'ct-crossfit', deletedAt: null },
    ]);

    const { coaches } = await service.getCoachesByGym(gymId);

    expect(coaches[0].classesAssigned).toEqual(['CrossFit WOD']);
  });

  it('returns both type names sorted alphabetically for two types', async () => {
    scopedClasses([
      { gymId, coachUserId, classTypeId: 'ct-gymnastics', deletedAt: null },
      { gymId, coachUserId, classTypeId: 'ct-crossfit', deletedAt: null },
    ]);

    const { coaches } = await service.getCoachesByGym(gymId);

    expect(coaches[0].classesAssigned).toEqual(['CrossFit WOD', 'Gymnastics']);
  });

  it('returns an empty array for a coach with no classes', async () => {
    scopedClasses([]);

    const { coaches } = await service.getCoachesByGym(gymId);

    expect(coaches[0].classesAssigned).toEqual([]);
  });

  it('excludes classes from another gym and soft-deleted classes', async () => {
    scopedClasses([
      // counted
      { gymId, coachUserId, classTypeId: 'ct-crossfit', deletedAt: null },
      // another gym -> excluded by query scope
      {
        gymId: otherGymId,
        coachUserId,
        classTypeId: 'ct-gymnastics',
        deletedAt: null,
      },
      // soft-deleted -> excluded by query scope
      {
        gymId,
        coachUserId,
        classTypeId: 'ct-gymnastics',
        deletedAt: new Date('2024-02-01T00:00:00.000Z'),
      },
    ]);

    const { coaches } = await service.getCoachesByGym(gymId);

    expect(coaches[0].classesAssigned).toEqual(['CrossFit WOD']);
  });
});
