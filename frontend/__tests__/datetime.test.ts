/**
 * Unit tests for the shared date/time formatting helpers (utils/datetime.ts).
 *
 * These formatters take wall-clock class schedule values (scheduledDate,
 * scheduledTime, duration) and produce the human-readable strings used across
 * the athlete, coach, and owner screens. They must never apply a timezone
 * shift, so a fixed date must always render the same weekday regardless of the
 * host machine's timezone.
 */

import {
  formatTimeRange,
  formatTime12h,
  formatShortDate,
  formatDayMonth,
  trimTime,
} from '@/utils/datetime';

describe('formatTimeRange', () => {
  it('formats start + duration as a 24h range without seconds', () => {
    // Arrange
    const time = '07:00:00';
    const duration = 60;

    // Act
    const result = formatTimeRange(time, duration);

    // Assert
    expect(result).toBe('07:00 – 08:00');
  });

  it('accepts a time already trimmed to HH:mm', () => {
    // Arrange / Act
    const result = formatTimeRange('09:30', 45);

    // Assert
    expect(result).toBe('09:30 – 10:15');
  });

  it('wraps the clock when the end time crosses midnight', () => {
    // Arrange
    const time = '23:30:00';
    const duration = 60;

    // Act
    const result = formatTimeRange(time, duration);

    // Assert
    expect(result).toBe('23:30 – 00:30');
  });

  it('returns an empty string for an unparseable time', () => {
    // Arrange / Act
    const result = formatTimeRange('not-a-time', 60);

    // Assert
    expect(result).toBe('');
  });
});

describe('formatTime12h', () => {
  it('formats a morning time as 12h with AM meridiem, no seconds', () => {
    // Arrange / Act
    const result = formatTime12h('06:00:00');

    // Assert
    expect(result).toBe('06:00 AM');
  });

  it('formats an afternoon time as 12h with PM meridiem', () => {
    // Arrange / Act
    const result = formatTime12h('13:30');

    // Assert
    expect(result).toBe('01:30 PM');
  });

  it('renders midnight as 12:00 AM', () => {
    // Arrange / Act
    const result = formatTime12h('00:00:00');

    // Assert
    expect(result).toBe('12:00 AM');
  });
});

describe('formatShortDate', () => {
  it('formats a date as "Wkd, Mon D"', () => {
    // Arrange / Act
    const result = formatShortDate('2025-04-21');

    // Assert
    expect(result).toBe('Mon, Apr 21');
  });

  it('returns an empty string for an unparseable date', () => {
    // Arrange / Act
    const result = formatShortDate('21/04/2025');

    // Assert
    expect(result).toBe('');
  });
});

describe('formatDayMonth', () => {
  it('formats a date as "Wkd D Mon"', () => {
    // Arrange / Act
    const result = formatDayMonth('2025-05-04');

    // Assert
    expect(result).toBe('Sun 4 May');
  });
});

describe('trimTime', () => {
  it('drops the seconds component', () => {
    // Arrange / Act
    const result = trimTime('09:00:00');

    // Assert
    expect(result).toBe('09:00');
  });

  it('leaves an already-trimmed time unchanged', () => {
    // Arrange / Act
    const result = trimTime('09:00');

    // Assert
    expect(result).toBe('09:00');
  });
});
