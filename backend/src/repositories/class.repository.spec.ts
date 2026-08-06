import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
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
