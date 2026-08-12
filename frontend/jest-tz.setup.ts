/**
 * Pins the timezone for the frontend test run.
 *
 * Several suites assert that date arithmetic uses the UTC calendar rather than
 * the local one — most notably `nextCycleDate` in MemberDetailsPanel, whose
 * whole point is that a midnight-UTC `expiresAt` must not resolve to the
 * previous local day. Under a UTC host those assertions CANNOT fail, because
 * local and UTC truncation coincide: the test passes whether the implementation
 * uses `getMonth` or `getUTCMonth`, and proves nothing. CI runners are usually
 * UTC, so without this pin the guard is tautological exactly where it matters.
 *
 * The zone must have a POSITIVE offset, unlike the backend's `America/New_York`.
 * The frontend fixtures were written for a positive-offset host (this dev
 * machine is UTC+1) — a negative offset would make some of them pass for the
 * wrong reason rather than failing honestly. `Asia/Kolkata` is the harsher
 * choice among positive zones: +05:30 never observes DST, so the offset is
 * stable across the year, and the half-hour component catches arithmetic that
 * happens to work for whole-hour offsets.
 *
 * This runs as jest `globalSetup`, i.e. in the main process before workers are
 * forked, so each worker boots with the zone already set. Setting `process.env.TZ`
 * from inside a test file does NOT work: V8 has cached the zone by then and jest
 * gives no way to invalidate it. (See the backend's test/jest-tz.setup.ts, which
 * documents the same trap.)
 */
export default function pinTimezone(): void {
  process.env.TZ = 'Asia/Kolkata';
}
