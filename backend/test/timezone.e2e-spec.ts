/**
 * Guards the zone this suite runs in.
 *
 * Pinning is done by `globalSetup` (helpers/e2e-global-setup.ts -> jest-tz.setup.ts),
 * because V8 caches the zone before a spec file could set `process.env.TZ` — the
 * trap that made an earlier attempt to pin from inside a spec a silent no-op.
 *
 * A pin that stops working fails open: every date assertion in the suite keeps
 * passing, on the machine's zone, and says nothing. So the pin is asserted rather
 * than trusted. What matters is not the city but the *offset*: it has to be
 * non-zero, so local and UTC truncation cannot coincide, and negative, so an
 * instant late in the UTC day falls on the previous local day. That disagreement
 * is the only thing that can catch a value stored as an instant and read on a
 * local calendar — the shape of the `@Column('date')` write bug this project has
 * already paid for once.
 */
describe('Suite timezone (e2e)', () => {
  it('runs in a pinned, negative-offset zone', () => {
    expect(process.env.TZ).toBe('America/New_York');

    // getTimezoneOffset is inverted: minutes to ADD to local to get UTC, so a
    // zone west of UTC reports a positive number. 240 = UTC-4 (EDT).
    const offset = new Date('2026-08-20T12:00:00Z').getTimezoneOffset();
    expect(offset).toBeGreaterThan(0);
  });

  it('puts a late-UTC instant on the previous local day', () => {
    // 02:00 UTC on the 20th is 22:00 on the 19th in a UTC-4 zone. If this ever
    // reads as the 20th, the zone is not pinned and the suite's date coverage is
    // tautological.
    const instant = new Date('2026-08-20T02:00:00Z');

    expect(instant.getDate()).toBe(19);
    expect(instant.getUTCDate()).toBe(20);
  });
});
