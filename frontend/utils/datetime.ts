/**
 * Date/time formatting helpers for class schedule data.
 *
 * The backend exposes wall-clock values for the gym's local timezone:
 *   - `scheduledDate`: "YYYY-MM-DD"   (e.g. "2026-08-03")
 *   - `scheduledTime`: "HH:mm[:ss]"   (e.g. "09:00:00")
 *   - `duration`:      minutes        (e.g. 60)
 *
 * These are NOT UTC instants. Constructing a Date from the raw string
 * (`new Date("2026-08-03")`) parses as UTC midnight and can shift the day in
 * negative-offset timezones. Every helper here parses the strings manually and
 * only uses `Date` for weekday lookup via the local-time constructor
 * (`new Date(year, monthIndex, day)`), which never applies a timezone shift.
 */

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MINUTES_PER_DAY = 24 * 60;

/** Parsed date parts from a "YYYY-MM-DD" string, or null if malformed. */
function parseDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Parsed hour/minute from a "HH:mm" or "HH:mm:ss" string, or null if malformed. */
function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** The short weekday label ("Mon") for a parsed date, using local-time lookup. */
function weekdayShort(year: number, month: number, day: number): string {
  return WEEKDAYS_SHORT[new Date(year, month - 1, day).getDay()];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Trims a time string to "HH:mm" (drops seconds).
 * "09:00:00" → "09:00". Returns the input unchanged if it can't be parsed.
 */
export function trimTime(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  return `${pad2(parsed.hours)}:${pad2(parsed.minutes)}`;
}

/**
 * Formats a start time + duration as a 24h clock range with an en dash.
 * ("09:00:00", 60) → "09:00 – 10:00".
 * End times past midnight wrap the clock (they don't overflow past 24h).
 * Returns "" if the time can't be parsed.
 */
export function formatTimeRange(time: string, duration: number): string {
  const parsed = parseTime(time);
  if (!parsed) return '';
  const startMinutes = parsed.hours * 60 + parsed.minutes;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
  const endTotal = ((startMinutes + safeDuration) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const start = `${pad2(parsed.hours)}:${pad2(parsed.minutes)}`;
  const end = `${pad2(Math.floor(endTotal / 60))}:${pad2(endTotal % 60)}`;
  return `${start} – ${end}`;
}

/**
 * Formats a time as a 12h clock with meridiem.
 * "06:00:00" → "06:00 AM"; "13:30" → "01:30 PM".
 * Returns "" if the time can't be parsed.
 */
export function formatTime12h(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return '';
  const meridiem = parsed.hours < 12 ? 'AM' : 'PM';
  const hour12 = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
  return `${pad2(hour12)}:${pad2(parsed.minutes)} ${meridiem}`;
}

/**
 * Compact US-style short date: "Mon, Apr 21".
 * Returns "" if the date can't be parsed.
 */
export function formatShortDate(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  const weekday = weekdayShort(parsed.year, parsed.month, parsed.day);
  return `${weekday}, ${MONTHS_SHORT[parsed.month - 1]} ${parsed.day}`;
}

/**
 * Compact day-month short date: "Mon 4 May".
 * Returns "" if the date can't be parsed.
 */
export function formatDayMonth(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  const weekday = weekdayShort(parsed.year, parsed.month, parsed.day);
  return `${weekday} ${parsed.day} ${MONTHS_SHORT[parsed.month - 1]}`;
}
