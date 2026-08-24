import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { ClassRepository } from './class.repository';
import { ClassEntity } from '../domain/class/entities/class.entity';

describe('ClassRepository.findMatchingOccurrences', () => {
  let repo: ClassRepository;
  const find = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassRepository,
        { provide: getRepositoryToken(ClassEntity), useValue: { find } },
      ],
    }).compile();
    repo = moduleRef.get(ClassRepository);
    find.mockReset();
  });

  it('queries non-deleted classes tenant-scoped by all shared fields, dates, and time', async () => {
    find.mockResolvedValueOnce([{ scheduledDate: '2026-08-03' }]);
    const dates = ['2026-08-03', '2026-08-05'];
    const result = await repo.findMatchingOccurrences({
      gymId: 'g1',
      classTypeId: 'ct1',
      coachUserId: 'c1',
      spaceId: 's1',
      dates,
      scheduledTime: '08:00',
    });

    expect(find).toHaveBeenCalledTimes(1);
    // Tenant isolation + soft-delete + exact-match invariants must all be in
    // the WHERE clause; a regression dropping any of these must fail here.
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gymId: 'g1',
          classTypeId: 'ct1',
          coachUserId: 'c1',
          spaceId: 's1',
          scheduledTime: '08:00',
          scheduledDate: In(dates),
          deletedAt: IsNull(),
        }),
      }),
    );

    // FindOperators (In/IsNull) must be present and of the right shape.
    const where = (find.mock.calls[0][0] as any).where;
    expect(where.deletedAt).toBeDefined();
    expect(where.deletedAt._type).toBe('isNull');
    expect(where.scheduledDate).toBeDefined();
    expect(where.scheduledDate._type).toBe('in');
    expect(where.scheduledDate._value).toEqual(dates);

    expect(result).toEqual([{ scheduledDate: '2026-08-03' }]);
  });

  it('short-circuits on empty dates without querying', async () => {
    const result = await repo.findMatchingOccurrences({
      gymId: 'g1',
      classTypeId: 'ct1',
      coachUserId: 'c1',
      spaceId: 's1',
      dates: [],
      scheduledTime: '08:00',
    });
    expect(result).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});

/**
 * The date range must narrow in SQL, not in JS: the whole point of the range is
 * that rows outside the window are never read, because each row read costs an
 * extra booking-count query downstream. So these assertions are about the WHERE
 * clause, not about the returned array.
 *
 * Bounds are passed through as bare 'YYYY-MM-DD' strings and compared against a
 * `date` column. They must never be routed through `new Date()` on the way — a
 * calendar day re-parsed as an instant lands on UTC midnight, which west of UTC
 * reads as the previous day and would silently shift the window by one.
 */
describe('ClassRepository.getClassesByGym', () => {
  let repo: ClassRepository;
  const find = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassRepository,
        { provide: getRepositoryToken(ClassEntity), useValue: { find } },
      ],
    }).compile();
    repo = moduleRef.get(ClassRepository);
    find.mockReset();
    find.mockResolvedValue([]);
  });

  it('leaves scheduledDate unconstrained when no range is given', async () => {
    await repo.getClassesByGym('g1');

    expect(find).toHaveBeenCalledWith({
      where: { gymId: 'g1', deletedAt: IsNull() },
      order: { scheduledDate: 'ASC', scheduledTime: 'ASC' },
    });
    const where = (find.mock.calls[0][0] as any).where;
    expect(where.scheduledDate).toBeUndefined();
  });

  it('treats an empty range object the same as no range at all', async () => {
    await repo.getClassesByGym('g1', {});

    const where = (find.mock.calls[0][0] as any).where;
    expect(where.scheduledDate).toBeUndefined();
  });

  it('brackets scheduledDate with Between when both bounds are given', async () => {
    await repo.getClassesByGym('g1', {
      startDate: '2026-08-10',
      endDate: '2026-08-16',
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gymId: 'g1',
          deletedAt: IsNull(),
          scheduledDate: Between('2026-08-10', '2026-08-16'),
        }),
      }),
    );

    // Both bounds are INCLUSIVE — Between is, and the owner's visible week
    // relies on it: a class on either edge day must appear.
    const where = (find.mock.calls[0][0] as any).where;
    expect(where.scheduledDate._type).toBe('between');
    expect(where.scheduledDate._value).toEqual(['2026-08-10', '2026-08-16']);
  });

  it('constrains only the lower bound for a start-only range', async () => {
    await repo.getClassesByGym('g1', { startDate: '2026-08-10' });

    const where = (find.mock.calls[0][0] as any).where;
    expect(where.scheduledDate._type).toBe('moreThanOrEqual');
    expect(where.scheduledDate._value).toBe('2026-08-10');
    expect(where.scheduledDate).toEqual(MoreThanOrEqual('2026-08-10'));
  });

  it('constrains only the upper bound for an end-only range', async () => {
    await repo.getClassesByGym('g1', { endDate: '2026-08-16' });

    const where = (find.mock.calls[0][0] as any).where;
    expect(where.scheduledDate._type).toBe('lessThanOrEqual');
    expect(where.scheduledDate._value).toBe('2026-08-16');
    expect(where.scheduledDate).toEqual(LessThanOrEqual('2026-08-16'));
  });

  it('keeps tenant scoping and soft-delete filtering under every range shape', async () => {
    const ranges = [
      undefined,
      {},
      { startDate: '2026-08-10' },
      { endDate: '2026-08-16' },
      { startDate: '2026-08-10', endDate: '2026-08-16' },
    ];

    for (const range of ranges) {
      find.mockClear();
      await repo.getClassesByGym('g1', range);
      const where = (find.mock.calls[0][0] as any).where;
      expect(where.gymId).toBe('g1');
      expect(where.deletedAt._type).toBe('isNull');
    }
  });
});
