/**
 * Guards the timezone pin itself.
 *
 * Suites in this project assert that date arithmetic uses the UTC calendar and
 * not the local one (see `nextCycleDate` in MemberDetailsPanel). Those
 * assertions are only capable of failing on a host whose offset is non-zero:
 * under UTC, local and UTC truncation coincide and a local-getter
 * implementation passes them too. `jest-tz.setup.ts` pins the zone so that
 * cannot happen — but a pin that silently stops applying (a moved file, a
 * dropped `globalSetup` key, a config rewrite) would take the guarantee with it
 * and leave every dependent suite passing for the wrong reason.
 *
 * So assert the offset, not just the zone name: the name is what we set, the
 * offset is what the other tests actually depend on. `getTimezoneOffset`
 * returns minutes WEST of UTC, so a positive-offset zone is negative here —
 * +05:30 is -330.
 */
describe('test-run timezone pin', () => {
  it('runs in a positive-offset zone, so UTC-vs-local assertions can fail', () => {
    expect(process.env.TZ).toBe('Asia/Kolkata');
    expect(new Date('2026-08-12T00:00:00.000Z').getTimezoneOffset()).toBe(-330);
  });

  /**
   * The property every dependent suite leans on, stated directly: a
   * midnight-UTC instant must land on a LATER local hour, so reading local
   * getters where UTC ones are meant produces a visibly different answer.
   */
  it('makes midnight UTC a different local wall-clock time', () => {
    const midnightUtc = new Date('2026-08-12T00:00:00.000Z');
    expect(midnightUtc.getUTCHours()).toBe(0);
    expect(midnightUtc.getHours()).not.toBe(0);
  });
});
