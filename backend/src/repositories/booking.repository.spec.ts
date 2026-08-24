import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingRepository } from './booking.repository';
import { BookingEntity } from '../domain/booking/entities/booking.entity';

/**
 * The grouped booked-count read replaces one count query per class. The whole
 * value of the method is in its WHERE and GROUP BY, so these assertions are
 * about the query that gets built, not only about the returned map:
 *
 * - `status = 'booked'` is what makes the number mean "spots taken". Waitlisted
 *   and cancelled rows exist on the same class and must never be counted; losing
 *   this filter overstates capacity everywhere a schedule is rendered.
 * - `classId IN (...)` is what keeps the aggregate to the rows the caller already
 *   fetched. The caller's list is itself gym-scoped, so this filter is the only
 *   thing carrying that scoping into the count.
 * - `GROUP BY classId` is what makes it ONE query instead of N.
 */
describe('BookingRepository.countBookedBookingsByClasses', () => {
  let repo: BookingRepository;

  /**
   * The clause recorders are typed rather than bare `jest.fn()`s: the assertions
   * below read `mock.calls`, and an untyped mock hands back `any`, which turns
   * every one of those reads into an unchecked access.
   */
  type ClauseArgs = [sql: string, params?: Record<string, unknown>];

  const getRawMany = jest.fn();
  const select = jest.fn();
  const addSelect = jest.fn();
  const where = jest.fn<unknown, ClauseArgs>();
  const andWhere = jest.fn<unknown, ClauseArgs>();
  const groupBy = jest.fn<unknown, ClauseArgs>();
  const createQueryBuilder = jest.fn();

  // A chainable builder stub: every method returns the same object, so the
  // production code's fluent chain works and each call is recorded.
  const builder = {
    select,
    addSelect,
    where,
    andWhere,
    groupBy,
    getRawMany,
  };

  beforeEach(async () => {
    [
      getRawMany,
      select,
      addSelect,
      where,
      andWhere,
      groupBy,
      createQueryBuilder,
    ].forEach((m) => m.mockReset());

    select.mockReturnValue(builder);
    addSelect.mockReturnValue(builder);
    where.mockReturnValue(builder);
    andWhere.mockReturnValue(builder);
    groupBy.mockReturnValue(builder);
    getRawMany.mockResolvedValue([]);
    createQueryBuilder.mockReturnValue(builder);

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingRepository,
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: { createQueryBuilder },
        },
      ],
    }).compile();
    repo = moduleRef.get(BookingRepository);
  });

  it('issues exactly one grouped query for many classes', async () => {
    getRawMany.mockResolvedValueOnce([
      { classId: 'c1', count: '3' },
      { classId: 'c2', count: '1' },
    ]);

    const result = await repo.countBookedBookingsByClasses(['c1', 'c2', 'c3']);

    // One query for three classes. This is the anti-N+1 assertion.
    expect(createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(getRawMany).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledTimes(1);

    expect(result.get('c1')).toBe(3);
    expect(result.get('c2')).toBe(1);
  });

  it('restricts the aggregate to the class ids it was given', async () => {
    await repo.countBookedBookingsByClasses(['c1', 'c2']);

    const idClause = where.mock.calls.find(([sql]) => sql.includes('classId'));
    expect(idClause).toBeDefined();
    expect(idClause?.[1]).toEqual({ classIds: ['c1', 'c2'] });
  });

  it("counts only bookings with status 'booked'", async () => {
    await repo.countBookedBookingsByClasses(['c1']);

    const clauses = [...where.mock.calls, ...andWhere.mock.calls];
    const statusClause = clauses.find(([sql]) => sql.includes('status'));
    expect(statusClause).toBeDefined();
    expect(statusClause?.[1]).toEqual({ status: 'booked' });
  });

  it('groups by classId so each class gets its own row', async () => {
    await repo.countBookedBookingsByClasses(['c1']);

    expect(groupBy.mock.calls[0][0]).toContain('classId');
  });

  it('omits classes with no booked bookings rather than reporting them as 0', async () => {
    // A class with no bookings produces no GROUP BY row at all. Callers must
    // default a missing key to 0 — the map deliberately does not pad itself,
    // so a caller that forgets would surface as undefined, not a silent 0.
    getRawMany.mockResolvedValueOnce([{ classId: 'c2', count: '2' }]);

    const result = await repo.countBookedBookingsByClasses(['c1', 'c2']);

    expect(result.has('c1')).toBe(false);
    expect(result.get('c2')).toBe(2);
  });

  it('coerces the driver count to a number', async () => {
    // pg returns COUNT(*) as a string. Returned unconverted, `bookedCount`
    // serialises as "3" and every capacity comparison in the app breaks.
    getRawMany.mockResolvedValueOnce([{ classId: 'c1', count: '3' }]);

    const result = await repo.countBookedBookingsByClasses(['c1']);

    expect(result.get('c1')).toBe(3);
    expect(typeof result.get('c1')).toBe('number');
  });

  it('short-circuits on an empty id list without querying', async () => {
    // An empty `IN ()` is a syntax error in Postgres, and there is nothing to
    // ask for anyway.
    const result = await repo.countBookedBookingsByClasses([]);

    expect(result.size).toBe(0);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});
