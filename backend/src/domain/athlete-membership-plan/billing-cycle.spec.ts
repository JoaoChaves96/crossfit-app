import {
  MAX_CATCH_UP_CYCLES,
  addCycle,
  advanceToFutureCycle,
  effectiveExpiresAt,
} from './billing-cycle';

/**
 * The shared cycle arithmetic. These cases are the ones the duplicated,
 * unclamped copies got wrong (RULING B) plus the request-time derivation that
 * closes the between-ticks hole for auto-roll members.
 */
describe('addCycle', () => {
  it('advances a mid-month monthly cycle by one calendar month', () => {
    expect(addCycle(new Date('2026-08-11T10:00:00.000Z'), 'monthly')).toEqual(
      new Date('2026-09-11T10:00:00.000Z'),
    );
  });

  it('clamps Jan 31 to Feb 28 rather than overflowing into March', () => {
    expect(addCycle(new Date('2027-01-31T10:00:00.000Z'), 'monthly')).toEqual(
      new Date('2027-02-28T10:00:00.000Z'),
    );
  });

  it('clamps Jan 31 to Feb 29 in a leap year', () => {
    expect(addCycle(new Date('2028-01-31T10:00:00.000Z'), 'monthly')).toEqual(
      new Date('2028-02-29T10:00:00.000Z'),
    );
  });

  it('clamps Aug 31 to Sep 30 rather than overflowing into October', () => {
    expect(addCycle(new Date('2027-08-31T10:00:00.000Z'), 'monthly')).toEqual(
      new Date('2027-09-30T10:00:00.000Z'),
    );
  });

  it('rolls December over into January of the next year', () => {
    expect(addCycle(new Date('2026-12-31T10:00:00.000Z'), 'monthly')).toEqual(
      new Date('2027-01-31T10:00:00.000Z'),
    );
  });

  it('advances an annual cycle by a year', () => {
    expect(addCycle(new Date('2026-08-11T10:00:00.000Z'), 'annual')).toEqual(
      new Date('2027-08-11T10:00:00.000Z'),
    );
  });

  it('clamps an annual Feb 29 to Feb 28 of the following common year', () => {
    expect(addCycle(new Date('2028-02-29T10:00:00.000Z'), 'annual')).toEqual(
      new Date('2029-02-28T10:00:00.000Z'),
    );
  });

  it('preserves the time of day on the UTC calendar', () => {
    expect(
      addCycle(new Date('2026-08-11T23:45:12.345Z'), 'monthly'),
    ).toEqual(new Date('2026-09-11T23:45:12.345Z'));
  });

  it('never skips a month across a full year of month-end rolls', () => {
    // The failure mode the unclamped copy had: each overflow both moved the
    // billing day and dropped a month. Walking Jan 31 forward twelve times
    // must visit twelve distinct consecutive months.
    let cursor = new Date('2027-01-31T00:00:00.000Z');
    const months: number[] = [];

    for (let i = 0; i < 12; i += 1) {
      cursor = addCycle(cursor, 'monthly');
      months.push(cursor.getUTCMonth());
    }

    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]);
  });
});

describe('advanceToFutureCycle', () => {
  it('advances a single cycle when one is enough', () => {
    expect(
      advanceToFutureCycle(
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-11T10:00:00.000Z'),
        'monthly',
      ),
    ).toEqual({
      outcome: 'advanced',
      next: new Date('2026-09-01T00:00:00.000Z'),
      cycles: 1,
    });
  });

  it('consumes as many cycles as needed to reach the first future one', () => {
    expect(
      advanceToFutureCycle(
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-08-11T10:00:00.000Z'),
        'monthly',
      ),
    ).toEqual({
      outcome: 'advanced',
      next: new Date('2026-09-01T00:00:00.000Z'),
      cycles: 4,
    });
  });

  it('leaves an already-future date untouched and consumes no cycles', () => {
    expect(
      advanceToFutureCycle(
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-08-11T10:00:00.000Z'),
        'monthly',
      ),
    ).toEqual({
      outcome: 'advanced',
      next: new Date('2026-09-01T00:00:00.000Z'),
      cycles: 0,
    });
  });

  it('caps a plan overdue beyond MAX_CATCH_UP_CYCLES', () => {
    const now = new Date('2026-08-11T10:00:00.000Z');
    const from = new Date(now);
    from.setUTCFullYear(from.getUTCFullYear() - 21); // > 240 monthly cycles

    expect(advanceToFutureCycle(from, now, 'monthly')).toEqual({
      outcome: 'capped',
    });
    expect(MAX_CATCH_UP_CYCLES).toBe(240);
  });
});

describe('effectiveExpiresAt', () => {
  const now = new Date('2026-08-11T10:00:00.000Z');

  it('leaves an unlimited plan unlimited', () => {
    expect(
      effectiveExpiresAt(
        { expiresAt: null, autoRoll: true, billingCycle: 'monthly' },
        now,
      ),
    ).toBeNull();
  });

  it('leaves an unlimited plan unlimited even without auto-roll', () => {
    expect(
      effectiveExpiresAt(
        { expiresAt: null, autoRoll: false, billingCycle: 'monthly' },
        now,
      ),
    ).toBeNull();
  });

  it('returns a still-future expiry unchanged', () => {
    const expiresAt = new Date('2026-09-01T00:00:00.000Z');

    expect(
      effectiveExpiresAt({ expiresAt, autoRoll: true, billingCycle: 'monthly' }, now),
    ).toEqual(expiresAt);
  });

  it('rolls a just-lapsed auto-roll plan forward one cycle', () => {
    // The F2 case: the hourly scheduler has not ticked yet.
    const expiresAt = new Date(now.getTime() - 60 * 1000);

    expect(
      effectiveExpiresAt({ expiresAt, autoRoll: true, billingCycle: 'monthly' }, now),
    ).toEqual(addCycle(expiresAt, 'monthly'));
  });

  it('derives the first FUTURE cycle for a plan overdue by several cycles', () => {
    const result = effectiveExpiresAt(
      {
        expiresAt: new Date('2026-05-01T00:00:00.000Z'),
        autoRoll: true,
        billingCycle: 'monthly',
      },
      now,
    );

    // Not 2026-06-01, which is one cycle past the stale date and still past.
    expect(result).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(result!.getTime()).toBeGreaterThan(now.getTime());
  });

  it('leaves a lapsed plan lapsed when auto-roll is off', () => {
    const expiresAt = new Date(now.getTime() - 60 * 1000);

    expect(
      effectiveExpiresAt(
        { expiresAt, autoRoll: false, billingCycle: 'monthly' },
        now,
      ),
    ).toEqual(expiresAt);
  });

  it('leaves an absurdly overdue auto-roll plan lapsed rather than granting 20 years', () => {
    const expiresAt = new Date('2000-01-01T00:00:00.000Z');

    expect(
      effectiveExpiresAt({ expiresAt, autoRoll: true, billingCycle: 'monthly' }, now),
    ).toEqual(expiresAt);
  });

  it('clamps the derived expiry at month end', () => {
    expect(
      effectiveExpiresAt(
        {
          expiresAt: new Date('2027-01-31T09:00:00.000Z'),
          autoRoll: true,
          billingCycle: 'monthly',
        },
        new Date('2027-01-31T10:00:00.000Z'),
      ),
    ).toEqual(new Date('2027-02-28T09:00:00.000Z'));
  });
});
