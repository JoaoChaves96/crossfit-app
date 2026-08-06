import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateRecurringClassesHandler } from './create-recurring-classes.handler';
import { CreateRecurringClassesCommand } from '../create-recurring-classes.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassSeriesRepository } from '../../../repositories/class-series.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';

// A fixed "now" so the 2026 test dates split deterministically into past/future.
// Handler reads current time via `new Date()`; we fake it with jest timers.
const NOW = new Date('2026-08-01T09:00:00.000Z');

describe('CreateRecurringClassesHandler', () => {
  let handler: CreateRecurringClassesHandler;
  let classRepository: ClassRepository;
  let seriesRepository: ClassSeriesRepository;
  let gymService: GymService;
  let gymStaffService: GymStaffService;
  let spaceService: SpaceService;
  let classTypeService: ClassTypeService;

  const gymId = 'gym-1';
  const userId = 'owner-1';

  const baseDto = {
    classTypeId: 'ct-1',
    coachUserId: 'coach-1',
    spaceId: 'space-1',
    weekdays: [1, 3, 5], // Mon/Wed/Fri
    scheduledTime: '08:00',
    startDate: '2026-08-03', // Monday
    endDate: '2026-08-14',
  };

  const okPreconditions = () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
    jest
      .spyOn(gymService, 'getGymById')
      .mockResolvedValue({ status: 'active' } as any);
    jest
      .spyOn(classTypeService, 'getClassTypeById')
      .mockResolvedValue({ gymId } as any);
    jest
      .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
      .mockResolvedValue({ role: 'coach', status: 'active' } as any);
    jest
      .spyOn(spaceService, 'getSpaceById')
      .mockResolvedValue({ gymId, baseCapacity: 30 } as any);
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRecurringClassesHandler,
        {
          provide: ClassRepository,
          useValue: {
            saveMany: jest.fn((c) => Promise.resolve(c)),
            findMatchingOccurrences: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ClassSeriesRepository,
          useValue: { save: jest.fn((s) => Promise.resolve(s)) },
        },
        { provide: GymService, useValue: { getGymById: jest.fn() } },
        {
          provide: GymStaffService,
          useValue: {
            isGymOwner: jest.fn(),
            getGymStaffByUserAndGym: jest.fn(),
          },
        },
        { provide: SpaceService, useValue: { getSpaceById: jest.fn() } },
        { provide: ClassTypeService, useValue: { getClassTypeById: jest.fn() } },
      ],
    }).compile();

    handler = module.get(CreateRecurringClassesHandler);
    classRepository = module.get(ClassRepository);
    seriesRepository = module.get(ClassSeriesRepository);
    gymService = module.get(GymService);
    gymStaffService = module.get(GymStaffService);
    spaceService = module.get(SpaceService);
    classTypeService = module.get(ClassTypeService);
  });

  afterEach(() => jest.useRealTimers());

  it('creates one class per matching occurrence and persists the series', async () => {
    okPreconditions();
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );
    // Mon/Wed/Fri across 08-03..08-14 = 6 occurrences, all future.
    expect(result.created).toBe(6);
    expect(result.skippedPast).toBe(0);
    expect(result.skippedDuplicate).toBe(0);
    expect(result.seriesId).toBeTruthy();
    expect(seriesRepository.save).toHaveBeenCalledTimes(1);
    const saved = (classRepository.saveMany as jest.Mock).mock.calls[0][0];
    expect(saved).toHaveLength(6);
    expect(saved.every((c: any) => c.state === 'published')).toBe(true);
    expect(saved.every((c: any) => c.seriesId === result.seriesId)).toBe(true);
    expect(saved.every((c: any) => c.capacity === 30)).toBe(true); // space base capacity
    // Series stores the raw nullable capacity: null means "use space base at generation".
    const savedSeries = (seriesRepository.save as jest.Mock).mock.calls[0][0];
    expect(savedSeries.capacity).toBeNull();
  });

  it('persists explicit capacity on the series and resolves it onto classes', async () => {
    okPreconditions();
    const dto = { ...baseDto, capacity: 15 };
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    expect(result.created).toBe(6);
    const savedSeries = (seriesRepository.save as jest.Mock).mock.calls[0][0];
    expect(savedSeries.capacity).toBe(15);
    const savedClasses = (classRepository.saveMany as jest.Mock).mock.calls[0][0];
    expect(savedClasses.every((c: any) => c.capacity === 15)).toBe(true);
  });

  it('skips past occurrences and reports them', async () => {
    okPreconditions();
    // startDate before NOW: 07-27 Mon .. 08-07 Fri. Occurrences before 08-01 09:00 are past.
    const dto = { ...baseDto, startDate: '2026-07-27', endDate: '2026-08-07' };
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    // Mon/Wed/Fri: 07-27,07-29,07-31 (past) + 08-03,08-05,08-07 (future) = 3 created, 3 skipped past.
    expect(result.created).toBe(3);
    expect(result.skippedPast).toBe(3);
  });

  it('skips exact duplicates and reports them', async () => {
    okPreconditions();
    (
      classRepository.findMatchingOccurrences as jest.Mock
    ).mockResolvedValueOnce([{ scheduledDate: '2026-08-05' }]);
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );
    expect(result.created).toBe(5);
    expect(result.skippedDuplicate).toBe(1);
  });

  it('returns created:0 and null seriesId when everything is skipped, persisting no series', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-07-06', endDate: '2026-07-10' }; // all past
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    expect(result.created).toBe(0);
    expect(result.seriesId).toBeNull();
    expect(seriesRepository.save).not.toHaveBeenCalled();
    expect(classRepository.saveMany).not.toHaveBeenCalled();
  });

  it('rejects a range exceeding 6 months', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-08-03', endDate: '2027-03-01' };
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, dto as any)),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects endDate before startDate', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-08-14', endDate: '2026-08-03' };
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, dto as any)),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws Forbidden if not gym owner', async () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, baseDto as any)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFound if class type not found', async () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
    jest
      .spyOn(gymService, 'getGymById')
      .mockResolvedValue({ status: 'active' } as any);
    jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue(null);
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, baseDto as any)),
    ).rejects.toThrow(NotFoundException);
  });
});
