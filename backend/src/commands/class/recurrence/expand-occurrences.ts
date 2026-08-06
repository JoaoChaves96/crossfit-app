/**
 * Expand a weekly recurrence rule into concrete calendar dates.
 *
 * Uses UTC date arithmetic to step day-by-day so results never drift across
 * daylight-saving boundaries. Weekday encoding matches JS Date.getUTCDay():
 * 0=Sunday … 6=Saturday. Both ends of the range are inclusive.
 */
export function expandOccurrences(input: {
  startDate: string;
  endDate: string;
  weekdays: number[];
}): string[] {
  const weekdaySet = new Set(input.weekdays);
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const end = new Date(`${input.endDate}T00:00:00.000Z`);
  const dates: string[] = [];

  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (weekdaySet.has(d.getUTCDay())) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}
