/**
 * Pins the timezone for the unit test run.
 *
 * Several suites assert behaviour that is deliberately computed on the
 * server-local calendar (plan-expiry coverage in class-schedule.service.ts and
 * book-class.handler.ts). Under a UTC host those assertions cannot fail, because
 * local and UTC truncation coincide — so the offset has to be both non-zero and
 * known. America/New_York is the harsher choice: west of UTC, evening instants
 * fall on the previous local day, which is where the two calendars disagree.
 *
 * This runs as jest `globalSetup`, i.e. in the main process before workers are
 * forked, so each worker boots with the zone already set. Setting process.env.TZ
 * from inside a test file does NOT work: V8 has cached the zone by then and jest
 * gives no way to invalidate it.
 */
export default function pinTimezone(): void {
  process.env.TZ = 'America/New_York';
}
