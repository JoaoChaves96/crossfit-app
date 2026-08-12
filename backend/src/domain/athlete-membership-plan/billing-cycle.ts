/**
 * The single copy of athlete-membership-plan billing-cycle arithmetic.
 *
 * This used to live in four places — MembershipRenewalScheduler (clamped and
 * correct) plus a private `calculateExpirationDate` in each of the assign,
 * purchase and manually-add handlers (unclamped, and two of them on the local
 * calendar). The unclamped copies advanced Jan 31 to Mar 3, skipping February
 * outright and permanently moving the billing day. Anything that needs to move
 * a plan expiry by whole billing cycles now calls in here.
 *
 * Time base: cycle arithmetic is computed on the UTC calendar so a cycle
 * advances identically on any host regardless of DST, while the
 * expiry-vs-now comparisons are instant-to-instant. Those two bases coexist by
 * design; see MembershipRenewalScheduler's class doc comment.
 */

export type BillingCycle = 'monthly' | 'annual';

/**
 * Safety valve for the catch-up loop. A plan more than this many cycles
 * overdue (240 monthly cycles = 20 years) is corrupt/abandoned data, not a
 * member owed two decades of renewals — see advanceToFutureCycle.
 */
export const MAX_CATCH_UP_CYCLES = 240;

/**
 * Advances by one whole calendar month/year on the UTC calendar, clamped
 * to the last valid day of the target month (Jan 31 -> Feb 28, or Feb 29
 * in a leap year). Without clamping, Date's setUTCMonth/setUTCFullYear
 * silently overflow on short months — Jan 31 plus one month lands on
 * Mar 2/3, skipping February entirely — which both shifts the renewal day
 * and quietly drops a cycle. Clamping guarantees every roll lands on a
 * real date and no month is ever skipped; the day ratcheting down
 * permanently for a 29th-31st expiry is accepted (no anchor-day column
 * exists to restore the original billing day).
 *
 * Using the UTC calendar rather than local-time components also makes this
 * arithmetic deterministic regardless of the host's timezone/DST rules.
 */
export function addCycle(from: Date, billingCycle: BillingCycle): Date {
  let targetYear = from.getUTCFullYear();
  let targetMonth = from.getUTCMonth();

  if (billingCycle === 'annual') {
    targetYear += 1;
  } else {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(from.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

export type CycleAdvance =
  | { outcome: 'advanced'; next: Date; cycles: number }
  | { outcome: 'capped' };

/**
 * Push `from` forward whole billing cycles until it is strictly in the future
 * of `now`, counting each consumed cycle. Advancing from the old expiry
 * (rather than from now) keeps renewals from drifting cycle over cycle —
 * though the day of month can still ratchet down permanently when a cycle
 * crosses a short month (see addCycle).
 *
 * A row still overdue after MAX_CATCH_UP_CYCLES is corrupt or abandoned data
 * rather than a real renewal backlog: returns 'capped' so the caller can treat
 * the plan as genuinely expired instead of granting it two decades of cycles.
 *
 * Pure: it neither mutates nor persists anything. The comparison against `now`
 * is instant-to-instant, deliberately, while the advance itself is UTC-calendar.
 */
export function advanceToFutureCycle(
  from: Date,
  now: Date,
  billingCycle: BillingCycle,
): CycleAdvance {
  let next = from;
  let cycles = 0;

  while (next.getTime() <= now.getTime() && cycles < MAX_CATCH_UP_CYCLES) {
    next = addCycle(next, billingCycle);
    cycles += 1;
  }

  if (next.getTime() <= now.getTime()) return { outcome: 'capped' };

  return { outcome: 'advanced', next, cycles };
}

export interface PlanCoverage {
  /** The stored expiry. Null means unlimited. */
  expiresAt: Date | null;
  autoRoll: boolean;
  billingCycle: BillingCycle;
}

/**
 * The expiry a REQUEST should be judged against, as opposed to the one stored
 * on the row.
 *
 * MembershipRenewalScheduler only rolls hourly, so an auto-roll member sits on
 * a stale past `expiresAt` for up to an hour once per billing cycle. Judging a
 * request against the stored value hard-403s a fully-paid, auto-renewing member
 * off the entire schedule for that window. Deriving the expiry here closes the
 * gap without the read path writing anything: no lazy persisted roll, so a read
 * never mutates data and never races the scheduler.
 *
 * - `expiresAt === null` (unlimited) stays null: nothing to derive.
 * - `autoRoll === false` returns the stored expiry unchanged: expired is expired.
 * - An auto-roll plan overdue by several cycles derives the first FUTURE cycle,
 *   matching the scheduler's catch-up behaviour and its MAX_CATCH_UP_CYCLES cap.
 * - A capped (absurdly overdue) auto-roll plan returns the stored expiry, so it
 *   reads as expired — the same outcome the scheduler gives it.
 */
export function effectiveExpiresAt(
  plan: PlanCoverage,
  now: Date,
): Date | null {
  if (plan.expiresAt === null) return null;
  if (!plan.autoRoll) return plan.expiresAt;
  if (plan.expiresAt.getTime() > now.getTime()) return plan.expiresAt;

  const advance = advanceToFutureCycle(plan.expiresAt, now, plan.billingCycle);

  return advance.outcome === 'advanced' ? advance.next : plan.expiresAt;
}
