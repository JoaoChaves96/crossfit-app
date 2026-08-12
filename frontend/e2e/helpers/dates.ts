/**
 * Calendar-day arithmetic that is explicit about its timezone.
 *
 * Why this exists rather than `new Date()` and local getters:
 *
 *  - Playwright's `timezoneId` pins the BROWSER. The Node process running the
 *    seed and the assertions keeps the machine's zone. On a UTC machine, a
 *    "tomorrow" computed here and a "tomorrow" rendered there are different
 *    days for five hours of every day.
 *  - The product stores class dates in `@Column('date')` — a calendar day with
 *    no instant and no zone. Every value that crosses into the database or into
 *    an assertion should therefore be a bare `YYYY-MM-DD` string, never a Date.
 *    A Date invites exactly the re-parse that caused the seam fixed in 8829f75.
 *
 * So: days are strings, arithmetic happens on strings, and the only conversion
 * to a zone-aware instant is `todayIn`, which names its zone.
 */
import { E2E_TIMEZONE } from '../env';

/** A calendar day with no time and no zone: `YYYY-MM-DD`. */
export type CalendarDay = string;

/**
 * Today's calendar day in the given zone (default: the pinned browser zone).
 *
 * `en-CA` formats as `YYYY-MM-DD`, which is the wire format the API uses, so
 * this needs no reassembly.
 */
export function todayIn(timeZone: string = E2E_TIMEZONE): CalendarDay {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Adds (or subtracts) whole days to a calendar day.
 *
 * Done in UTC deliberately: both ends are zone-less calendar days, so the only
 * requirement is that the arithmetic never crosses a DST boundary and shifts
 * the result. UTC has no DST, so `+1 day` is always exactly one day.
 */
export function addDays(day: CalendarDay, delta: number): CalendarDay {
  const [y, m, d] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

/** The calendar day `n` days after today in the pinned zone. */
export function daysFromToday(n: number): CalendarDay {
  return addDays(todayIn(), n);
}

/**
 * The weekday name for a calendar day, as the UI labels its columns
 * (`Mon`, `Tue`, …). Parsed as UTC so the name matches the day given.
 */
export function weekdayShort(day: CalendarDay): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Day-of-month without a leading zero, as most date UIs render it. */
export function dayOfMonth(day: CalendarDay): string {
  return String(Number(day.split('-')[2]));
}

/**
 * A near-future day guaranteed NOT to be today, for classes that must stay
 * bookable.
 *
 * Booking and lifecycle rules key off "is this in the future", and a class
 * created for today is minutes away from its cutoff depending on when the suite
 * runs. Every journey that needs a bookable class should date it here.
 */
export function bookableDay(): CalendarDay {
  return daysFromToday(3);
}

/** A day safely in the past, for classes that must already be over. */
export function pastDay(): CalendarDay {
  return daysFromToday(-7);
}
