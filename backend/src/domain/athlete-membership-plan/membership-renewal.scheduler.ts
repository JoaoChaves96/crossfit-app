import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';

/**
 * Safety valve for the catch-up loop. A plan more than this many cycles
 * overdue (240 monthly cycles = 20 years) is corrupt/abandoned data, not a
 * member owed two decades of renewals — see advanceToFutureCycle.
 */
const MAX_CATCH_UP_CYCLES = 240;

/**
 * MembershipRenewalScheduler: sweeps athlete membership plans whose expiry has
 * arrived. Auto-roll plans are pushed forward one or more billing cycles from
 * their OLD expiry (so renewal dates don't drift with each tick); the rest —
 * and any auto-roll plan too overdue to catch up — are marked expired.
 *
 * Plans with a null expiresAt are unlimited and are never touched — the
 * repository finder excludes them.
 *
 * `expiresAt` is a `timestamp without time zone` column compared here against
 * a JS `Date`; both the write path and this read path go through the same
 * driver conversion, so the comparison is self-consistent in the server's
 * local timezone. The sweep boundary shifts if the server timezone changes,
 * which is acceptable for an hourly sweep.
 *
 * Two independent time bases coexist here by design: the expiresAt-vs-now
 * comparison above is server-local (per the paragraph above), while the
 * cycle arithmetic in addCycle is computed on the UTC calendar so a billing
 * cycle advances identically on any host regardless of DST. Both are
 * deliberate; see addCycle for why.
 *
 * This scheduler is a convenience, not the enforcement boundary: the read-time
 * guards in class-schedule.service.ts and book-class.handler.ts mean a stale
 * row can never leak a bookable class between ticks.
 */
@Injectable()
export class MembershipRenewalScheduler {
  private readonly logger = new Logger(MembershipRenewalScheduler.name);

  constructor(
    private readonly athleteMembershipPlanRepository: AthleteMembershipPlanRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async rollOrExpireMemberships(): Promise<void> {
    const now = new Date();
    const due =
      await this.athleteMembershipPlanRepository.findDueForRenewal(now);

    let rolled = 0;
    let expired = 0;
    let failed = 0;

    for (const row of due) {
      try {
        if (row.autoRoll) {
          const outcome = this.advanceToFutureCycle(row, now);
          if (outcome === 'capped') {
            row.status = 'expired';
            expired += 1;
          } else {
            rolled += 1;
          }
        } else {
          row.status = 'expired';
          expired += 1;
        }

        await this.athleteMembershipPlanRepository.save(row);
      } catch (error) {
        failed += 1;
        this.logger.error(
          `[MembershipRenewal] failed to save plan ${row.id}: ${
            (error as Error).message
          }`,
        );
      }
    }

    this.logger.log(
      `[MembershipRenewal] tick complete — ${due.length} due, ${rolled} rolled, ${expired} expired, ${failed} failed`,
    );
  }

  /**
   * Push expiresAt forward whole billing cycles until it is in the future,
   * counting each consumed cycle. Advancing from the old expiry (rather than
   * from now) keeps renewals from drifting cycle over cycle — though the day
   * of month can still ratchet down permanently when a cycle crosses a short
   * month (see addCycle).
   *
   * If the row is still overdue after MAX_CATCH_UP_CYCLES, it is corrupt or
   * abandoned data rather than a real renewal backlog: returns 'capped' and
   * leaves expiresAt/autoRollCount untouched so the caller can expire the
   * row instead of saving a still-overdue "active" plan that would just come
   * right back — and grow autoRollCount — on every subsequent tick.
   */
  private advanceToFutureCycle(
    row: AthleteMembershipPlanEntity,
    now: Date,
  ): 'rolled' | 'capped' {
    if (row.expiresAt === null) return 'rolled'; // finder excludes nulls; guard only

    const cycle = row.membershipPlan?.billingCycle ?? 'monthly';
    let next = row.expiresAt;
    let cycles = 0;

    while (next.getTime() <= now.getTime() && cycles < MAX_CATCH_UP_CYCLES) {
      next = this.addCycle(next, cycle);
      cycles += 1;
    }

    if (next.getTime() <= now.getTime()) {
      this.logger.warn(
        `[MembershipRenewal] plan ${row.id} is still overdue after the ${MAX_CATCH_UP_CYCLES}-cycle catch-up cap — expiring instead of rolling`,
      );
      return 'capped';
    }

    row.expiresAt = next;
    row.autoRollCount += cycles;
    return 'rolled';
  }

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
   * arithmetic deterministic regardless of the host's timezone/DST rules —
   * see the class doc comment for how that coexists with the server-local
   * expiresAt comparison elsewhere in this file.
   */
  private addCycle(from: Date, billingCycle: 'monthly' | 'annual'): Date {
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
}
