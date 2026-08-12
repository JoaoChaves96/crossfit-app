import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { CreateRecurringClassesHandler } from './create-recurring-classes.handler';
import { CreateRecurringClassesCommand } from '../create-recurring-classes.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { ClassSeriesEntity } from '../../../domain/class-series/entities/class-series.entity';

// A fixed "now" so the 2026 test dates split deterministically into past/future.
// Handler reads current time via `new Date()`; we fake it with jest timers.
const NOW = new Date('2026-08-01T09:00:00.000Z');

describe('CreateRecurringClassesHandler', () => {
  let handler: CreateRecurringClassesHandler;
  let classRepository: ClassRepository;
  let gymService: GymService;
  let gymStaffService: GymStaffService;
  let spaceService: SpaceService;
  let classTypeService: ClassTypeService;

  // Records everything persisted through the transaction manager so tests can
  // assert on the series row and the class rows independently.
  let managerSave: jest.Mock;

  const gymId = 'gym-1';
  const userId = 'owner-1';

  // Pull the single ClassSeriesEntity saved through the manager.
  const savedSeries = (): any =>
    managerSave.mock.calls.find((c) => c[0] === ClassSeriesEntity)?.[1];
  // Pull the ClassEntity[] saved through the manager.
  const savedClasses = (): any[] =>
    managerSave.mock.calls.find((c) => c[0] === ClassEntity)?.[1] ?? [];

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

    // Fake transactional manager: save(Entity, obj) records the call and
    // resolves to obj. transaction(cb) runs cb with this manager so the two
    // saves share one atomic scope.
    managerSave = jest.fn((_entity, obj) => Promise.resolve(obj));
    const dataSource = {
      transaction: jest.fn((cb: (m: any) => Promise<unknown>) =>
        cb({ save: managerSave }),
      ),
    };

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
        { provide: DataSource, useValue: dataSource },
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
    expect(savedSeries()).toBeDefined();
    const saved = savedClasses();
    expect(saved).toHaveLength(6);
    expect(saved.every((c: any) => c.state === 'published')).toBe(true);
    expect(saved.every((c: any) => c.seriesId === result.seriesId)).toBe(true);
    expect(saved.every((c: any) => c.capacity === 30)).toBe(true); // space base capacity
    // Series stores the raw nullable capacity: null means "use space base at generation".
    expect(savedSeries().capacity).toBeNull();
  });

  /**
   * `scheduledDate`, `startDate` and `endDate` are all `@Column('date')`, and
   * TypeORM runs `DateUtils.mixedDateToDateString` (LOCAL getters) on the way to
   * such a column. A `Date` built from a bare day is UTC midnight, so west of UTC
   * every generated occurrence and both series bounds landed one day EARLY.
   * Asserting through that same function is the closest a unit test gets to the
   * column. Zone pinned to America/New_York by test/jest-tz.setup.ts.
   */
  it('persists every occurrence and both series bounds on the requested days', async () => {
    expect(new Date().getTimezoneOffset()).not.toBe(0); // else nothing to catch

    okPreconditions();
    await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );

    const persisted = savedClasses().map((c: any) =>
      DateUtils.mixedDateToDateString(c.scheduledDate),
    );
    expect(persisted).toEqual([
      '2026-08-03',
      '2026-08-05',
      '2026-08-07',
      '2026-08-10',
      '2026-08-12',
      '2026-08-14',
    ]);

    expect(
      DateUtils.mixedDateToDateString(savedSeries().startDate),
    ).toBe(baseDto.startDate);
    expect(DateUtils.mixedDateToDateString(savedSeries().endDate)).toBe(
      baseDto.endDate,
    );
  });

  it('persists explicit capacity on the series and resolves it onto classes', async () => {
    okPreconditions();
    const dto = { ...baseDto, capacity: 15 };
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    expect(result.created).toBe(6);
    expect(savedSeries().capacity).toBe(15);
    expect(savedClasses().every((c: any) => c.capacity === 15)).toBe(true);
  });

  it('persists series and classes atomically in one transaction', async () => {
    okPreconditions();
    await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );
    // Both writes happen inside a single transaction scope.
    expect(managerSave).toHaveBeenCalledWith(ClassSeriesEntity, expect.anything());
    expect(managerSave).toHaveBeenCalledWith(ClassEntity, expect.any(Array));
  });

  it('propagates and does not swallow a failure inside the transaction', async () => {
    okPreconditions();
    // Class save rejects → the whole transaction (and execute) must reject,
    // so no orphan series is left behind by the handler.
    managerSave.mockImplementation((entity, obj) =>
      entity === ClassEntity
        ? Promise.reject(new Error('classes write failed'))
        : Promise.resolve(obj),
    );
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, baseDto as any)),
    ).rejects.toThrow('classes write failed');
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
    expect(managerSave).not.toHaveBeenCalled();
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

  it('accepts an active owner as the assigned coach', async () => {
    // Owners coach their own classes (DECISIONS.md, "Owners as Coaches"), so a
    // solo box can schedule a whole recurring series with no coach on staff.
    okPreconditions();
    jest
      .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
      .mockResolvedValue({ role: 'owner', status: 'active' } as any);

    await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );

    expect(savedClasses().length).toBeGreaterThan(0);
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
