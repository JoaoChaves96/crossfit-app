import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';
import {
  MAX_CATCH_UP_CYCLES,
  advanceToFutureCycle,
} from './billing-cycle';

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
 * cycle arithmetic in billing-cycle.ts is computed on the UTC calendar so a
 * billing cycle advances identically on any host regardless of DST. Both are
 * deliberate; see addCycle there for why.
 *
 * This scheduler is a convenience, not the enforcement boundary in either
 * direction. The read-time guards in class-schedule.service.ts and
 * book-class.handler.ts mean a stale row can never leak a bookable class
 * between ticks; and because those guards derive an effective expiry via
 * effectiveExpiresAt, a not-yet-rolled auto-roll row cannot deny one either.
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
          const outcome = this.rollRow(row, now);
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
   * Roll the row forward onto its first future cycle, or report that it is too
   * far overdue to be worth rolling.
   *
   * The arithmetic lives in billing-cycle.ts, shared with the request-time
   * guards and the plan-assignment handlers. This wrapper owns the entity
   * mutation and the operator-facing warning: on 'capped' it leaves
   * expiresAt/autoRollCount untouched so the caller can expire the row instead
   * of saving a still-overdue "active" plan that would just come right back —
   * and grow autoRollCount — on every subsequent tick.
   */
  private rollRow(
    row: AthleteMembershipPlanEntity,
    now: Date,
  ): 'rolled' | 'capped' {
    if (row.expiresAt === null) return 'rolled'; // finder excludes nulls; guard only

    // Unreachable in practice: findDueForRenewal loads the membershipPlan
    // relation and billingCycle is a non-null two-value union. Kept narrow so
    // the fallback cannot be reached from any other caller.
    const cycle = row.membershipPlan?.billingCycle ?? 'monthly';

    const advance = advanceToFutureCycle(row.expiresAt, now, cycle);

    if (advance.outcome === 'capped') {
      this.logger.warn(
        `[MembershipRenewal] plan ${row.id} is still overdue after the ${MAX_CATCH_UP_CYCLES}-cycle catch-up cap — expiring instead of rolling`,
      );
      return 'capped';
    }

    row.expiresAt = advance.next;
    row.autoRollCount += advance.cycles;
    return 'rolled';
  }
}
