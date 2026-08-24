import { DateUtils } from 'typeorm/util/DateUtils';
import {
  toCalendarDay,
  toLocalTimestamp,
  toPersistedCalendarDay,
} from './calendar-day';

/**
 * Every assertion here about the local calendar is only meaningful under a known,
 * non-zero UTC offset: under a UTC host, local and UTC truncation coincide and a
 * UTC-truncating implementation would pass. The zone is pinned to
 * America/New_York (UTC-4 in August) by jest `globalSetup` — see
 * `test/jest-tz.setup.ts` for why it cannot be pinned from inside this file.
 */
describe('toCalendarDay', () => {
  it('runs under the pinned west-of-UTC zone these assertions depend on', () => {
    expect(new Date('2026-08-11T14:00:00.000Z').getTimezoneOffset()).toBe(240);
  });

  describe('a bare YYYY-MM-DD is a calendar date, not an instant', () => {
    it('returns it verbatim', () => {
      expect(toCalendarDay('2026-08-21')).toBe('2026-08-21');
    });

    it('does not shift it a day back west of UTC', () => {
      // The whole bug in one line: `new Date('2026-08-21')` is UTC midnight, and
      // local getters on that instant read 2026-08-20.
      expect(new Date('2026-08-21').getDate()).toBe(20);
      expect(toCalendarDay('2026-08-21')).toBe('2026-08-21');
    });

    it('is stable across a month boundary', () => {
      expect(toCalendarDay('2026-09-01')).toBe('2026-09-01');
    });

    it('is stable across a year boundary', () => {
      expect(toCalendarDay('2026-01-01')).toBe('2026-01-01');
    });
  });

  describe('a genuine instant is truncated on the server-local calendar', () => {
    it('truncates a Date late in the UTC day to the local day', () => {
      // 2026-08-22T02:30Z is still 2026-08-21 in New York. A UTC-truncating
      // implementation would answer 2026-08-22 here.
      expect(toCalendarDay(new Date('2026-08-22T02:30:00.000Z'))).toBe(
        '2026-08-21',
      );
    });

    it('truncates an ISO datetime string late in the UTC day to the local day', () => {
      expect(toCalendarDay('2026-08-22T02:30:00.000Z')).toBe('2026-08-21');
    });

    it('truncates a millisecond timestamp to the local day', () => {
      const ms = Date.parse('2026-08-22T02:30:00.000Z');
      expect(toCalendarDay(ms)).toBe('2026-08-21');
    });

    it('zero-pads single-digit months and days', () => {
      expect(toCalendarDay(new Date('2026-03-05T15:00:00.000Z'))).toBe(
        '2026-03-05',
      );
    });
  });

  describe('rejects what it cannot reduce to a day', () => {
    it('throws on a value that is neither Date, string nor number', () => {
      expect(() => toCalendarDay(undefined as unknown as Date)).toThrow(
        TypeError,
      );
      expect(() => toCalendarDay(undefined as unknown as Date)).toThrow(
        /received undefined/,
      );
    });

    it('throws on an unparseable string rather than emitting NaN-NaN-NaN', () => {
      expect(() => toCalendarDay('not-a-date')).toThrow(TypeError);
      expect(() => toCalendarDay('not-a-date')).toThrow(
        /invalid date value "not-a-date"/,
      );
    });

    it('throws on an Invalid Date', () => {
      expect(() => toCalendarDay(new Date('nonsense'))).toThrow(TypeError);
    });
  });
});

describe('toLocalTimestamp', () => {
  it('reads the instant on the local clock, not on UTC', () => {
    // 06:00Z is 02:00 in New York. A UTC-formatting implementation would return
    // the 06:00 reading, which is the whole bug this function exists to prevent.
    expect(toLocalTimestamp(new Date('2026-05-25T06:00:00.000Z'))).toBe(
      '2026-05-25 02:00:00',
    );
  });

  it('rolls back to the previous local day for an instant just after UTC midnight', () => {
    expect(toLocalTimestamp(new Date('2026-05-25T01:30:00.000Z'))).toBe(
      '2026-05-24 21:30:00',
    );
  });

  it('zero-pads every field', () => {
    expect(toLocalTimestamp(new Date('2026-01-05T09:08:07.000Z'))).toBe(
      '2026-01-05 04:08:07',
    );
  });

  it('drops sub-second precision rather than rounding it', () => {
    expect(toLocalTimestamp(new Date('2026-05-25T06:00:00.999Z'))).toBe(
      '2026-05-25 02:00:00',
    );
  });

  it('throws on an Invalid Date', () => {
    expect(() => toLocalTimestamp(new Date('nonsense'))).toThrow(TypeError);
  });
});

describe('toPersistedCalendarDay', () => {
  /**
   * The contract that matters is not the return type but what TypeORM writes:
   * `preparePersistentValue` runs `mixedDateToDateString` on a `date` column, and
   * that reads LOCAL getters, so a `Date` at UTC midnight persists the PREVIOUS
   * day west of UTC. Asserting through that function is what makes this a test of
   * the stored value rather than of a cast.
   */
  it('makes TypeORM persist the same calendar day it was given', () => {
    const persisted = toPersistedCalendarDay('2026-08-21');

    expect(DateUtils.mixedDateToDateString(persisted)).toBe('2026-08-21');
  });

  it('is what a Date would have got wrong', () => {
    // Documents the defect this function exists to prevent.
    expect(
      DateUtils.mixedDateToDateString(new Date('2026-08-21T00:00:00.000Z')),
    ).toBe('2026-08-20');
  });

  it('round-trips through toCalendarDay', () => {
    expect(toCalendarDay(toPersistedCalendarDay('2026-08-21'))).toBe(
      '2026-08-21',
    );
  });

  it('rejects an instant masquerading as a day', () => {
    expect(() => toPersistedCalendarDay('2026-08-21T00:00:00.000Z')).toThrow(
      TypeError,
    );
  });

  it('rejects a non-day string', () => {
    expect(() => toPersistedCalendarDay('21/08/2026')).toThrow(TypeError);
    expect(() => toPersistedCalendarDay('21/08/2026')).toThrow(
      /not a YYYY-MM-DD calendar day/,
    );
  });
});
