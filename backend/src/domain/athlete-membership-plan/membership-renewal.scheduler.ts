import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';

/**
 * Safety valve for the catch-up loop. A plan more than this many cycles
 * overdue is almost certainly bad data; stop advancing rather than spin.
 */
const MAX_CATCH_UP_CYCLES = 240;

/**
 * MembershipRenewalScheduler: sweeps athlete membership plans whose expiry has
 * arrived. Auto-roll plans are pushed forward one or more billing cycles from
 * their OLD expiry (so renewal dates never drift); the rest are marked expired.
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

    for (const row of due) {
      if (row.autoRoll) {
        this.advanceToFutureCycle(row, now);
        rolled += 1;
      } else {
        row.status = 'expired';
        expired += 1;
      }

      await this.athleteMembershipPlanRepository.save(row);
    }

    this.logger.log(
      `[MembershipRenewal] tick complete — ${due.length} due, ${rolled} rolled, ${expired} expired`,
    );
  }

  /**
   * Push expiresAt forward whole billing cycles until it is in the future,
   * counting each consumed cycle. Advancing from the old expiry (rather than
   * from now) keeps the member's renewal day stable.
   */
  private advanceToFutureCycle(
    row: AthleteMembershipPlanEntity,
    now: Date,
  ): void {
    if (row.expiresAt === null) return;

    const cycle = row.membershipPlan?.billingCycle ?? 'monthly';
    let next = row.expiresAt;
    let cycles = 0;

    while (next.getTime() <= now.getTime() && cycles < MAX_CATCH_UP_CYCLES) {
      next = this.addCycle(next, cycle);
      cycles += 1;
    }

    if (cycles === MAX_CATCH_UP_CYCLES) {
      this.logger.warn(
        `[MembershipRenewal] plan ${row.id} hit the ${MAX_CATCH_UP_CYCLES}-cycle catch-up cap`,
      );
    }

    row.expiresAt = next;
    row.autoRollCount += cycles;
  }

  /**
   * Advances by whole calendar months/years using the UTC calendar
   * components rather than local-time ones. Using local-time
   * setMonth/setFullYear would shift the resulting instant by an hour
   * whenever the added span crosses a DST transition on the host's
   * timezone; the UTC calendar has no DST, so the arithmetic is
   * deterministic regardless of where this process runs.
   */
  private addCycle(from: Date, billingCycle: 'monthly' | 'annual'): Date {
    const next = new Date(from);

    if (billingCycle === 'annual') {
      next.setUTCFullYear(next.getUTCFullYear() + 1);
    } else {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }

    return next;
  }
}
