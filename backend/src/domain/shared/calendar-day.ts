/**
 * A bare 'YYYY-MM-DD' value, with nothing appended.
 */
const CALENDAR_DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reduce a date value to its YYYY-MM-DD calendar day.
 *
 * A bare 'YYYY-MM-DD' string is a CALENDAR DATE, not an instant, and is returned
 * verbatim. Routing it through `new Date()` lands on UTC midnight, and reading
 * local getters off that instant lands on the PREVIOUS day anywhere west of UTC.
 * `ClassEntity.scheduledDate` is `@Column('date')` and hydrates as exactly such a
 * string (TypeORM's `date` branch overwrites pg's parsed Date with
 * `DateUtils.mixedDateToDateString`), so that round-trip reported every
 * string-dated class one day early.
 *
 * Anything else — a real `Date`, an ISO datetime string, a millisecond timestamp
 * — is a genuine instant, and is truncated on the SERVER-LOCAL calendar. That is
 * the calendar the membership expiry checks and the rendered schedule both use.
 *
 * @throws TypeError if the value cannot be reduced to a calendar day
 */
export function toCalendarDay(value: Date | string | number): string {
  if (typeof value === 'string' && CALENDAR_DAY_ONLY.test(value)) {
    return value;
  }

  let instant: Date;

  if (value instanceof Date) {
    instant = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    instant = new Date(value);
  } else {
    throw new TypeError(
      `Cannot format date: received ${typeof value}. Expected YYYY-MM-DD string, Date, ISO string, or number.`,
    );
  }

  if (Number.isNaN(instant.getTime())) {
    throw new TypeError(
      `Cannot format date: invalid date value "${String(value)}". Expected valid YYYY-MM-DD string, Date, ISO string, or millisecond timestamp.`,
    );
  }

  const year = instant.getFullYear();
  const month = String(instant.getMonth() + 1).padStart(2, '0');
  const day = String(instant.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * An instant rendered as the 'YYYY-MM-DD HH:MM:SS' reading a LOCAL wall clock
 * would show, for comparison against a naive timestamp in the database.
 *
 * `scheduledDate + scheduledTime::time` has no zone: it is the wall clock the
 * owner typed. Binding an ISO string against it hands Postgres a UTC instant,
 * which it silently strips the `Z` from and compares as a wall clock anyway — so
 * the comparison is displaced by the server's UTC offset. That is how the
 * reminder window came to select classes that had already started and skip the
 * ones about to.
 *
 * The local calendar is the right one here for the same reason it is in
 * `toCalendarDay`: it is the calendar the owner scheduled on and the athlete
 * reads.
 *
 * @throws TypeError if the value is not a valid instant
 */
export function toLocalTimestamp(instant: Date): string {
  if (Number.isNaN(instant.getTime())) {
    throw new TypeError(
      'Cannot format timestamp: invalid date value. Expected a valid Date.',
    );
  }

  const pad = (value: number): string => String(value).padStart(2, '0');

  const day = toCalendarDay(instant);
  const time = `${pad(instant.getHours())}:${pad(instant.getMinutes())}:${pad(
    instant.getSeconds(),
  )}`;

  return `${day} ${time}`;
}

/**
 * The value to ASSIGN to a `@Column('date')` field so the given calendar day is
 * the day that lands in the database.
 *
 * A `Date` must never be assigned to a `date` column from a calendar day: on the
 * way in, TypeORM's `preparePersistentValue` runs `mixedDateToDateString`, which
 * reads LOCAL getters. `new Date('2026-08-21')` is UTC midnight, so west of UTC
 * that persists '2026-08-20' — the owner books Friday and the row says Thursday.
 *
 * `mixedDateToDateString` returns any non-`Date` value untouched, so handing it
 * the string writes the day verbatim. That is also exactly the shape the column
 * hydrates back as, so the in-memory value is the same going both ways.
 *
 * The cast is the price of `@Column('date')` fields being declared `Date` while
 * being strings at runtime; this function is the one place that lie is told.
 *
 * @throws TypeError if the value is not a bare YYYY-MM-DD calendar day
 */
export function toPersistedCalendarDay(day: string): Date {
  if (!CALENDAR_DAY_ONLY.test(day)) {
    throw new TypeError(
      `Cannot persist date: "${String(day)}" is not a YYYY-MM-DD calendar day.`,
    );
  }

  return day as unknown as Date;
}
