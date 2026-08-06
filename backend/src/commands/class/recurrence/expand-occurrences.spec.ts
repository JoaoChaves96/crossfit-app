import { expandOccurrences } from './expand-occurrences';

describe('expandOccurrences', () => {
  it('returns each matching weekday across the range, inclusive', () => {
    // 2026-08-03 is a Monday. Mon/Wed/Fri = [1,3,5].
    const result = expandOccurrences({
      startDate: '2026-08-03',
      endDate: '2026-08-14',
      weekdays: [1, 3, 5],
    });
    expect(result).toEqual([
      '2026-08-03', // Mon
      '2026-08-05', // Wed
      '2026-08-07', // Fri
      '2026-08-10', // Mon
      '2026-08-12', // Wed
      '2026-08-14', // Fri
    ]);
  });

  it('includes the start date when it matches a weekday', () => {
    // 2026-08-03 is a Monday
    expect(
      expandOccurrences({ startDate: '2026-08-03', endDate: '2026-08-03', weekdays: [1] }),
    ).toEqual(['2026-08-03']);
  });

  it('returns empty when no day in range matches', () => {
    // 2026-08-03 Mon .. 2026-08-04 Tue, asking for Sunday only
    expect(
      expandOccurrences({ startDate: '2026-08-03', endDate: '2026-08-04', weekdays: [0] }),
    ).toEqual([]);
  });

  it('is stable across a DST boundary (US spring-forward 2026-03-08)', () => {
    // Sundays [0] spanning the DST change; must not drift a day.
    const result = expandOccurrences({
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      weekdays: [0],
    });
    expect(result).toEqual(['2026-03-01', '2026-03-08', '2026-03-15']);
  });

  it('returns dates in ascending order for multiple weekdays', () => {
    const result = expandOccurrences({
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      weekdays: [5, 1, 3], // unordered input
    });
    expect(result).toEqual(['2026-08-03', '2026-08-05', '2026-08-07']);
  });
});
