# Membership Plans (Owner-Side + Expiry Enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give gym owners full control of membership plans and per-member subscriptions (create/edit/archive plans, assign, extend, suspend, auto-renew) and make plan expiry actually enforced when athletes browse and book classes.

**Architecture:** Backend follows the existing CQRS split — new read models under `src/queries/gym-configuration/`, new command handlers under `src/commands/gym-configuration/handlers/`, both registered in `gym-configuration.module.ts`. Expiry is handled two ways at once: an hourly `MembershipRenewalScheduler` mutates rows (auto-roll forward or mark `expired`), and a read-time guard in `class-schedule.service.ts` / `book-class.handler.ts` means a stale row can never leak a bookable class. Frontend adds a `plans` tab to Gym Settings and enriches `members.tsx` with a member-details panel, all in Clean Ink primitives.

**Tech Stack:** NestJS 10 + CQRS + TypeORM (Postgres), `@nestjs/schedule` for cron, Swagger for the API contract; Expo / React Native Web with expo-router, Clean Ink design system, Jest + @testing-library/react-native.

## Global Constraints

- **Source of truth:** `docs/superpowers/specs/2026-08-11-membership-plans-design.md`. Do not add behaviour it does not specify.
- **Scope:** owner-side management + expiry enforcement only. Athlete-facing *purchase/upgrade* screens are explicitly OUT of scope (Future Work B).
- **Multi-tenant:** every query and mutation filters by `gymId`. A row from another gym is `ForbiddenException('Plan does not belong to this gym')`, never a 404-by-accident.
- **Roles:** every new owner endpoint carries `@Role('owner')` and sits behind `JwtAuthGuard, GymOwnershipGuard, RolesGuard`.
- **Swagger is the contract:** every new endpoint gets `@ApiOperation`, `@ApiParam`, `@ApiResponse` (200/201, 400 where applicable, 401, 403, 404 where applicable); every DTO field gets `@ApiProperty`.
- **Nullable DTO rule:** any `T | null` property MUST pass an explicit `type:` to `@ApiProperty` (e.g. `type: String`, `type: Number`, `type: Boolean`) or Nest emits `Record<string, never> | null`.
- **Frontend types:** never hand-write an API type. Run `npm run generate:api-types` in `frontend/` and import as `components['schemas']['XDto']`.
- **Design:** tokens from `frontend/constants/design.ts` only — no raw hex, no `theme.ts` / `AppColors` / `Spacing`. Compose from `frontend/components/cleanink/`. One Accent Rule: one crimson emphasis per view; per-row actions are `quiet`. Two Reds Rule: destructive is `Status.danger`, never the accent. All text goes through the `Text` primitive. There is no success role — confirm with quiet meta text.
- **No amber token exists.** `"expiring"` renders with `StatusChip tone="neutral"`. Flag this at the live review rather than inventing a colour.
- **Membership status vocabulary (used identically backend and frontend):** `'active' | 'expiring' | 'expired' | 'inactive'`.
- **`expiresAt === null` means unlimited** — never treat it as expired, never auto-roll it, never hide classes for it.
- **Test register pin:** jsdom reports width 750 (mobile). Every new frontend suite MUST mock `@/hooks/useResponsiveLayout` and pin the register explicitly.
- **No wall-clock dates in test fixtures.** Anything compared against "now" (expiry, cutoff, `expiring` derivation) uses a date computed relative to `Date.now()`, not a hardcoded literal — a literal silently starts exercising the opposite branch once real time passes it. Do not reach for `jest.useFakeTimers()` in frontend suites; it deadlocks `waitFor`, which polls on real timers.
- **Preserve every existing `testID`** — the `e2e/` specs locate by them. Add new ones freely; rename none.
- **Commits:** one commit per task, at the end of the task, using the message given in the task's final step. Do not push and do not open a PR.

---

## File Structure

**Backend — create**

| File | Responsibility |
| --- | --- |
| `backend/src/migrations/1754870400000-AddMembershipAutoRoll.ts` | Adds `autoRoll` / `autoRollCount` to `athlete_membership_plans` |
| `backend/src/queries/gym-configuration/membership-plans.service.ts` | Owner read model: plans for a gym + subscriber counts |
| `backend/src/queries/gym-configuration/dto/membership-plan-item.dto.ts` | One plan row in the owner list |
| `backend/src/queries/gym-configuration/dto/get-membership-plans-response.dto.ts` | `{ plans: MembershipPlanItemDto[] }` |
| `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.ts` | Hourly auto-roll / expire sweep |
| `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts` | Scheduler unit tests |
| `backend/src/commands/gym-configuration/extend-membership.command.ts` | Owner extends an active plan's expiry |
| `backend/src/commands/gym-configuration/handlers/extend-membership.handler.ts` | ↑ handler |
| `backend/src/commands/gym-configuration/assign-membership-plan.command.ts` | Owner assigns a plan to a member |
| `backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.ts` | ↑ handler |
| `backend/src/commands/gym-configuration/set-gym-membership-status.command.ts` | Suspend / resume a member |
| `backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.ts` | ↑ handler |
| `backend/src/commands/gym-configuration/set-membership-auto-roll.command.ts` | Toggle per-member auto-renew |
| `backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.ts` | ↑ handler |
| `backend/src/api/gym-configuration/dto/extend-membership-request.dto.ts` | `{ expiresAt: string }` |
| `backend/src/api/gym-configuration/dto/assign-membership-plan-request.dto.ts` | `{ membershipPlanId: string }` |
| `backend/src/api/gym-configuration/dto/set-gym-membership-status-request.dto.ts` | `{ status: 'active' \| 'inactive' }` |
| `backend/src/api/gym-configuration/dto/set-membership-auto-roll-request.dto.ts` | `{ autoRoll: boolean }` |

**Backend — modify**

| File | Change |
| --- | --- |
| `backend/src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts` | `autoRoll`, `autoRollCount` columns |
| `backend/src/repositories/athlete-membership-plan.repository.ts` | `findDueForRenewal(now)` |
| `backend/src/domain/athlete-membership-plan/athlete-membership-plan.module.ts` | provide the scheduler |
| `backend/src/queries/gym-configuration/gym-members.service.ts` | drop the `status: 'active'` filter; enrich with plan fields |
| `backend/src/queries/gym-configuration/dto/gym-member-item.dto.ts` | plan fields + `membershipStatus` + auto-roll fields |
| `backend/src/api/gym-configuration/gym-configuration.controller.ts` | `GET /configuration/membership-plans` |
| `backend/src/api/gym-configuration/gym-members.controller.ts` | 4 member-mutation routes |
| `backend/src/domain/gym-configuration/gym-configuration.module.ts` | register new query service + 4 handlers |
| `backend/src/queries/class/class-schedule.service.ts` | expiry + per-class cutoff filter; `planExpiresAt` in response |
| `backend/src/queries/class/dto/get-class-schedule-response.dto.ts` | `planExpiresAt: string \| null` |
| `backend/src/commands/class/handlers/book-class.handler.ts` | two 403 expiry preconditions |

**Frontend — create**

| File | Responsibility |
| --- | --- |
| `frontend/app/gym-settings/PlansTab.tsx` | Plans CRUD tab |
| `frontend/app/gym-settings/PlansTab.styles.ts` | ↑ styles |
| `frontend/components/MemberDetailsPanel.tsx` | Desktop side panel / mobile sheet with the 4 member actions |
| `frontend/components/MemberDetailsPanel.styles.ts` | ↑ styles |
| `frontend/__tests__/PlansTab.test.tsx` | PlansTab suite |
| `frontend/__tests__/MemberDetailsPanel.test.tsx` | Panel suite |
| `frontend/__tests__/schedule-cutoff.test.tsx` | Athlete cutoff-note suite |

**Frontend — modify**

| File | Change |
| --- | --- |
| `frontend/app/gym-settings/SettingsTabBar.tsx` | `'plans'` in `ActiveTab` + `TABS` |
| `frontend/app/gym-settings/index.tsx` | render `PlansTab` |
| `frontend/app/members.tsx` | plan/expiry columns, real status chip, search, row → panel |
| `frontend/app/members.styles.ts` | new columns, search bar, layout for the panel |
| `frontend/app/(tabs)/schedule.tsx` | quiet cutoff note via `ListFooterComponent` + desktop `ScrollView` |
| `frontend/app/(tabs)/schedule.styles.ts` | `cutoffNote` |
| `frontend/__tests__/members.test.tsx` | cover the new columns/statuses/search |

**Docs — modify**

`docs/DECISIONS.md`, `docs/DATA_MODEL.md`, `context/PROJECT_STATE.md`, and new `epics/MEMBERSHIP_PLANS_EPIC.md`.

---

### Task 1: Auto-roll columns (migration + entity + repository finder)

**Files:**
- Create: `backend/src/migrations/1754870400000-AddMembershipAutoRoll.ts`
- Modify: `backend/src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts`
- Modify: `backend/src/repositories/athlete-membership-plan.repository.ts`
- Test: `backend/src/repositories/athlete-membership-plan.repository.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `AthleteMembershipPlanEntity.autoRoll: boolean` (default `true`)
  - `AthleteMembershipPlanEntity.autoRollCount: number` (default `0`)
  - `AthleteMembershipPlanRepository.findDueForRenewal(now: Date): Promise<AthleteMembershipPlanEntity[]>` — active rows whose `expiresAt` is non-null and `<= now`, with the `membershipPlan` relation loaded.

- [ ] **Step 1: Write the failing repository test**

Create `backend/src/repositories/athlete-membership-plan.repository.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, IsNull } from 'typeorm';
import { AthleteMembershipPlanRepository } from './athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from '../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

describe('AthleteMembershipPlanRepository', () => {
  let repository: AthleteMembershipPlanRepository;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AthleteMembershipPlanRepository,
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find, save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();

    repository = moduleRef.get(AthleteMembershipPlanRepository);
  });

  describe('findDueForRenewal', () => {
    it('queries active rows with a non-null expiry at or before now', async () => {
      const now = new Date('2026-08-11T10:00:00.000Z');
      find.mockResolvedValue([]);

      await repository.findDueForRenewal(now);

      expect(find).toHaveBeenCalledWith({
        where: {
          status: 'active',
          expiresAt: LessThanOrEqual(now),
        },
        relations: ['membershipPlan'],
      });
    });

    it('returns the rows the underlying repository yields', async () => {
      const row = new AthleteMembershipPlanEntity();
      row.id = 'amp-1';
      find.mockResolvedValue([row]);

      const result = await repository.findDueForRenewal(
        new Date('2026-08-11T10:00:00.000Z'),
      );

      expect(result).toEqual([row]);
    });
  });
});
```

Note: `LessThanOrEqual(now)` already excludes `NULL` in Postgres, so no separate `Not(IsNull())` is needed — remove the unused `Not, IsNull` import if your linter complains.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/repositories/athlete-membership-plan.repository.spec.ts`
Expected: FAIL — `repository.findDueForRenewal is not a function`.

- [ ] **Step 3: Add the two entity columns**

In `backend/src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts`, after the `expiresAt` column:

```ts
  @Column('boolean', { default: true })
  autoRoll: boolean;

  @Column('integer', { default: 0 })
  autoRollCount: number;
```

- [ ] **Step 4: Add the repository finder**

In `backend/src/repositories/athlete-membership-plan.repository.ts`, extend the `typeorm` import to `import { LessThanOrEqual, Repository } from 'typeorm';` and add:

```ts
  /**
   * Retrieve every active plan whose expiry has arrived.
   * Rows with a null expiresAt are unlimited and are never returned.
   */
  async findDueForRenewal(now: Date): Promise<AthleteMembershipPlanEntity[]> {
    return this.athleteMembershipPlanRepository.find({
      where: {
        status: 'active',
        expiresAt: LessThanOrEqual(now),
      },
      relations: ['membershipPlan'],
    });
  }
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `cd backend && npx jest src/repositories/athlete-membership-plan.repository.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the migration**

Create `backend/src/migrations/1754870400000-AddMembershipAutoRoll.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipAutoRoll1754870400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      ADD COLUMN IF NOT EXISTS "autoRoll" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans"
      ADD COLUMN IF NOT EXISTS "autoRollCount" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans" DROP COLUMN IF EXISTS "autoRollCount"
    `);
    await queryRunner.query(`
      ALTER TABLE "athlete_membership_plans" DROP COLUMN IF EXISTS "autoRoll"
    `);
  }
}
```

- [ ] **Step 7: Confirm the columns exist on the dev database**

`backend/src/config/database.config.ts` sets `synchronize: process.env.NODE_ENV !== 'production'`, and `backend/package.json` has no migration script, so in dev the columns arrive via synchronize on the next boot. The migration file exists for production parity.

Restart the backend (`cd backend && npm run start:dev`), then verify:

```bash
psql "$DATABASE_URL" -c '\d athlete_membership_plans'
```

Expected: both `autoRoll` (boolean, default true) and `autoRollCount` (integer, default 0) are listed. If `psql` is not available, hit any endpoint that reads the table and confirm no `column ... does not exist` error appears in the log.

- [ ] **Step 8: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 9: Commit**

```bash
git add backend/src/migrations/1754870400000-AddMembershipAutoRoll.ts \
        backend/src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts \
        backend/src/repositories/athlete-membership-plan.repository.ts \
        backend/src/repositories/athlete-membership-plan.repository.spec.ts
git commit -m "feat(api): add per-member auto-roll columns to athlete membership plans"
```

---

### Task 2: MembershipRenewalScheduler (hourly auto-roll / expire sweep)

**Files:**
- Create: `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.ts`
- Test: `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts`
- Modify: `backend/src/domain/athlete-membership-plan/athlete-membership-plan.module.ts`

**Interfaces:**
- Consumes: `AthleteMembershipPlanRepository.findDueForRenewal(now)`, `entity.autoRoll`, `entity.autoRollCount` (Task 1); `entity.membershipPlan.billingCycle: 'monthly' | 'annual'`.
- Produces: `MembershipRenewalScheduler.rollOrExpireMemberships(): Promise<void>` — provided by `AthleteMembershipPlanModule`, driven by `@Cron(CronExpression.EVERY_HOUR)`.

**Behaviour being built (from the spec):**
- A due row with `autoRoll === true` has its `expiresAt` pushed forward **from the old `expiresAt`**, not from `now` — that avoids drift across cycles.
- If a row is many cycles overdue, a single pass must land on a **future** date: loop the cycle advance until `expiresAt > now`, incrementing `autoRollCount` once per cycle consumed.
- A due row with `autoRoll === false` becomes `status = 'expired'`.
- `expiresAt === null` never appears here (Task 1's finder excludes it).

- [ ] **Step 1: Write the failing scheduler test**

Create `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { MembershipRenewalScheduler } from './membership-renewal.scheduler';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';
import { MembershipPlanEntity } from '../membership-plan/entities/membership-plan.entity';

function buildDuePlan(overrides: Partial<AthleteMembershipPlanEntity> = {}) {
  const plan = new MembershipPlanEntity();
  plan.id = 'plan-1';
  plan.billingCycle = 'monthly';

  const row = new AthleteMembershipPlanEntity();
  row.id = 'amp-1';
  row.gymMembershipId = 'gm-1';
  row.membershipPlanId = plan.id;
  row.membershipPlan = plan;
  row.status = 'active';
  row.expiresAt = new Date('2026-08-01T00:00:00.000Z');
  row.autoRoll = true;
  row.autoRollCount = 0;

  return Object.assign(row, overrides);
}

describe('MembershipRenewalScheduler', () => {
  let scheduler: MembershipRenewalScheduler;
  const findDueForRenewal = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    findDueForRenewal.mockReset();
    save.mockReset();
    save.mockImplementation((entity) => Promise.resolve(entity));
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        MembershipRenewalScheduler,
        {
          provide: AthleteMembershipPlanRepository,
          useValue: { findDueForRenewal, save },
        },
      ],
    }).compile();

    scheduler = moduleRef.get(MembershipRenewalScheduler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rolls a monthly auto-roll plan forward from its old expiry, not from now', async () => {
    const row = buildDuePlan();
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('active');
    expect(row.expiresAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
    expect(save).toHaveBeenCalledWith(row);
  });

  it('rolls an annual auto-roll plan forward by a year', async () => {
    const row = buildDuePlan();
    row.membershipPlan.billingCycle = 'annual';
    row.expiresAt = new Date('2026-08-01T00:00:00.000Z');
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.expiresAt).toEqual(new Date('2027-08-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
  });

  it('catches a many-cycles-overdue plan up to a future date in one pass', async () => {
    const row = buildDuePlan({ expiresAt: new Date('2026-02-01T00:00:00.000Z') });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.expiresAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(7);
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('expires a due plan whose auto-roll is off', async () => {
    const row = buildDuePlan({ autoRoll: false });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('expired');
    expect(row.expiresAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(0);
    expect(save).toHaveBeenCalledWith(row);
  });

  it('saves nothing when no plans are due', async () => {
    findDueForRenewal.mockResolvedValue([]);

    await scheduler.rollOrExpireMemberships();

    expect(save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts`
Expected: FAIL — cannot resolve module `./membership-renewal.scheduler`.

- [ ] **Step 3: Write the scheduler**

Create `backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.ts`:

```ts
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

  private addCycle(from: Date, billingCycle: 'monthly' | 'annual'): Date {
    const next = new Date(from);

    if (billingCycle === 'annual') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}
```

- [ ] **Step 4: Provide the scheduler in its module**

In `backend/src/domain/athlete-membership-plan/athlete-membership-plan.module.ts`, import the scheduler and add it to `providers` (it does not need to be exported — the cron registry drives it):

```ts
import { MembershipRenewalScheduler } from './membership-renewal.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([AthleteMembershipPlanEntity])],
  providers: [AthleteMembershipPlanRepository, MembershipRenewalScheduler],
  exports: [AthleteMembershipPlanRepository],
})
export class AthleteMembershipPlanModule {}
```

`ScheduleModule.forRoot()` is already called in `app.module.ts`, so no further wiring is needed.

- [ ] **Step 5: Run the scheduler tests and confirm they pass**

Run: `cd backend && npx jest src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Boot the backend and confirm the cron registers**

Run: `cd backend && npm run start:dev`
Expected: no `Nest can't resolve dependencies of the MembershipRenewalScheduler` error; the app reaches "Nest application successfully started". Stop it once confirmed.

- [ ] **Step 7: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.ts \
        backend/src/domain/athlete-membership-plan/membership-renewal.scheduler.spec.ts \
        backend/src/domain/athlete-membership-plan/athlete-membership-plan.module.ts
git commit -m "feat(api): roll or expire athlete membership plans hourly"
```

---

### Task 3: Owner plans read model (`GET /configuration/membership-plans`)

**Files:**
- Create: `backend/src/queries/gym-configuration/dto/membership-plan-item.dto.ts`
- Create: `backend/src/queries/gym-configuration/dto/get-membership-plans-response.dto.ts`
- Create: `backend/src/queries/gym-configuration/membership-plans.service.ts`
- Test: `backend/src/queries/gym-configuration/membership-plans.service.spec.ts`
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts`
- Modify: `backend/src/api/gym-configuration/gym-configuration.controller.ts`

**Interfaces:**
- Consumes: `MembershipPlanEntity { id, gymId, name, pricing: number, billingCycle: 'monthly' | 'annual', classTypes: string[], status: 'active' | 'archived', createdAt }`; `AthleteMembershipPlanEntity.status`, `.membershipPlanId`.
- Produces:
  - `MembershipPlanItemDto { id, name, pricing, billingCycle, classTypes: string[], status, subscriberCount }`
  - `GetMembershipPlansResponseDto { plans: MembershipPlanItemDto[] }`
  - `MembershipPlansQueryService.getPlansByGym(gymId: string): Promise<GetMembershipPlansResponseDto>`
  - Route `GET /api/gyms/:gymId/configuration/membership-plans`

Note: `classTypes` is a TypeORM `simple-array` (a comma-joined varchar), so it cannot be SQL-joined to `class_types`. The owner list returns the raw ID array and the frontend resolves names against the class-types it already fetches.

- [ ] **Step 1: Write the failing query-service test**

Create `backend/src/queries/gym-configuration/membership-plans.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { MembershipPlansQueryService } from './membership-plans.service';
import { MembershipPlanEntity } from '../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildPlan(overrides: Partial<MembershipPlanEntity> = {}) {
  const plan = new MembershipPlanEntity();
  plan.id = 'plan-1';
  plan.gymId = 'gym-1';
  plan.name = 'Unlimited';
  plan.pricing = 12000;
  plan.billingCycle = 'monthly';
  plan.classTypes = ['ct-1', 'ct-2'];
  plan.status = 'active';
  plan.createdAt = new Date('2026-01-01T00:00:00.000Z');
  return Object.assign(plan, overrides);
}

describe('MembershipPlansQueryService', () => {
  let service: MembershipPlansQueryService;
  const planFind = jest.fn();
  const athletePlanFind = jest.fn();

  beforeEach(async () => {
    planFind.mockReset();
    athletePlanFind.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        MembershipPlansQueryService,
        {
          provide: getRepositoryToken(MembershipPlanEntity),
          useValue: { find: planFind },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find: athletePlanFind },
        },
      ],
    }).compile();

    service = moduleRef.get(MembershipPlansQueryService);
  });

  it('scopes the plan query to the gym and orders by creation date', async () => {
    planFind.mockResolvedValue([]);

    await service.getPlansByGym('gym-1');

    expect(planFind).toHaveBeenCalledWith({
      where: { gymId: 'gym-1' },
      order: { createdAt: 'DESC' },
    });
    expect(athletePlanFind).not.toHaveBeenCalled();
  });

  it('returns plans with their active subscriber counts', async () => {
    planFind.mockResolvedValue([
      buildPlan(),
      buildPlan({ id: 'plan-2', name: 'Basic', status: 'archived' }),
    ]);
    athletePlanFind.mockResolvedValue([
      { membershipPlanId: 'plan-1' },
      { membershipPlanId: 'plan-1' },
      { membershipPlanId: 'plan-2' },
    ]);

    const result = await service.getPlansByGym('gym-1');

    expect(athletePlanFind).toHaveBeenCalledWith({
      where: { status: 'active', membershipPlanId: In(['plan-1', 'plan-2']) },
      select: ['membershipPlanId'],
    });
    expect(result.plans).toEqual([
      {
        id: 'plan-1',
        name: 'Unlimited',
        pricing: 12000,
        billingCycle: 'monthly',
        classTypes: ['ct-1', 'ct-2'],
        status: 'active',
        subscriberCount: 2,
      },
      {
        id: 'plan-2',
        name: 'Basic',
        pricing: 12000,
        billingCycle: 'monthly',
        classTypes: ['ct-1', 'ct-2'],
        status: 'archived',
        subscriberCount: 1,
      },
    ]);
  });

  it('reports zero subscribers for a plan nobody is on', async () => {
    planFind.mockResolvedValue([buildPlan()]);
    athletePlanFind.mockResolvedValue([]);

    const result = await service.getPlansByGym('gym-1');

    expect(result.plans[0].subscriberCount).toBe(0);
  });

  it('returns an empty list for a gym with no plans', async () => {
    planFind.mockResolvedValue([]);

    const result = await service.getPlansByGym('gym-1');

    expect(result).toEqual({ plans: [] });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/queries/gym-configuration/membership-plans.service.spec.ts`
Expected: FAIL — cannot resolve module `./membership-plans.service`.

- [ ] **Step 3: Write the item DTO**

Create `backend/src/queries/gym-configuration/dto/membership-plan-item.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class MembershipPlanItemDto {
  @ApiProperty({
    example: 'uuid-plan-id',
    description: 'Unique identifier for the membership plan',
  })
  id: string;

  @ApiProperty({
    example: 'Unlimited',
    description: 'Name of the membership plan',
  })
  name: string;

  @ApiProperty({
    example: 12000,
    description: 'Price of the plan in minor currency units (cents)',
  })
  pricing: number;

  @ApiProperty({
    enum: ['monthly', 'annual'],
    example: 'monthly',
    description: 'How often the plan renews',
  })
  billingCycle: 'monthly' | 'annual';

  @ApiProperty({
    type: [String],
    example: ['uuid-class-type-1', 'uuid-class-type-2'],
    description: 'IDs of the class types this plan grants access to',
  })
  classTypes: string[];

  @ApiProperty({
    enum: ['active', 'archived'],
    example: 'active',
    description:
      'Archived plans stay attached to existing subscribers but cannot be newly assigned',
  })
  status: 'active' | 'archived';

  @ApiProperty({
    example: 14,
    description: 'Number of members currently subscribed to this plan',
  })
  subscriberCount: number;
}
```

- [ ] **Step 4: Write the response DTO**

Create `backend/src/queries/gym-configuration/dto/get-membership-plans-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { MembershipPlanItemDto } from './membership-plan-item.dto';

export class GetMembershipPlansResponseDto {
  @ApiProperty({
    type: [MembershipPlanItemDto],
    description: 'Membership plans for the gym, newest first',
  })
  plans: MembershipPlanItemDto[];
}
```

- [ ] **Step 5: Write the query service**

Create `backend/src/queries/gym-configuration/membership-plans.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MembershipPlanEntity } from '../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { MembershipPlanItemDto } from './dto/membership-plan-item.dto';
import { GetMembershipPlansResponseDto } from './dto/get-membership-plans-response.dto';

@Injectable()
export class MembershipPlansQueryService {
  constructor(
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  /**
   * Owner-facing plan list. Includes archived plans so the owner can see what
   * existing subscribers are still on.
   */
  async getPlansByGym(gymId: string): Promise<GetMembershipPlansResponseDto> {
    const entities = await this.membershipPlanRepository.find({
      where: { gymId },
      order: { createdAt: 'DESC' },
    });

    if (entities.length === 0) {
      return { plans: [] };
    }

    const subscriberCounts = await this.countActiveSubscribers(
      entities.map((entity) => entity.id),
    );

    const plans: MembershipPlanItemDto[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      pricing: entity.pricing,
      billingCycle: entity.billingCycle,
      classTypes: entity.classTypes ?? [],
      status: entity.status,
      subscriberCount: subscriberCounts.get(entity.id) ?? 0,
    }));

    return { plans };
  }

  private async countActiveSubscribers(
    planIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.athleteMembershipPlanRepository.find({
      where: { status: 'active', membershipPlanId: In(planIds) },
      select: ['membershipPlanId'],
    });

    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(
        row.membershipPlanId,
        (counts.get(row.membershipPlanId) ?? 0) + 1,
      );
    }

    return counts;
  }
}
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd backend && npx jest src/queries/gym-configuration/membership-plans.service.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Register the service in the module**

In `backend/src/domain/gym-configuration/gym-configuration.module.ts` add the import and list `MembershipPlansQueryService` in both `providers` and `exports`, next to `GymMembersQueryService`:

```ts
import { MembershipPlansQueryService } from '../../queries/gym-configuration/membership-plans.service';
```

`MembershipPlanEntity` and `AthleteMembershipPlanEntity` are already in this module's `TypeOrmModule.forFeature([...])`, so no entity registration is needed.

- [ ] **Step 8: Add the controller route**

In `backend/src/api/gym-configuration/gym-configuration.controller.ts`, add the imports:

```ts
import { MembershipPlansQueryService } from '../../queries/gym-configuration/membership-plans.service';
import { GetMembershipPlansResponseDto } from '../../queries/gym-configuration/dto/get-membership-plans-response.dto';
```

inject it in the constructor after `spacesQueryService`:

```ts
    private readonly membershipPlansQueryService: MembershipPlansQueryService,
```

and add the route in the existing MEMBERSHIP PLANS section of the controller (immediately above the `@Post('/membership-plans')` handler):

```ts
  /**
   * List all membership plans for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns every plan for the gym, archived included, each with its current
   *   active subscriber count
   */
  @Get('/membership-plans')
  @Role('owner')
  @ApiOperation({
    summary: 'List membership plans',
    description:
      'Returns every membership plan for the gym (including archived ones) with active subscriber counts. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Membership plans list returned',
    type: GetMembershipPlansResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async getMembershipPlans(
    @Param('gymId') gymId: string,
  ): Promise<GetMembershipPlansResponseDto> {
    return this.membershipPlansQueryService.getPlansByGym(gymId);
  }
```

- [ ] **Step 9: Verify the endpoint live and in Swagger**

Run: `cd backend && npm run start:dev`

Log in as the owner and call it:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@example.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -s http://localhost:3000/api/gyms/<gymId>/configuration/membership-plans \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{"plans":[...]}` with `subscriberCount` present on each entry. Then open http://localhost:3000/api-docs and confirm `GET /api/gyms/{gymId}/configuration/membership-plans` appears under **Gym Configuration** with a `GetMembershipPlansResponseDto` 200 schema whose `classTypes` is `string[]`.

- [ ] **Step 10: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 11: Commit**

```bash
git add backend/src/queries/gym-configuration/membership-plans.service.ts \
        backend/src/queries/gym-configuration/membership-plans.service.spec.ts \
        backend/src/queries/gym-configuration/dto/membership-plan-item.dto.ts \
        backend/src/queries/gym-configuration/dto/get-membership-plans-response.dto.ts \
        backend/src/domain/gym-configuration/gym-configuration.module.ts \
        backend/src/api/gym-configuration/gym-configuration.controller.ts
git commit -m "feat(api): expose the owner membership plan list with subscriber counts"
```

---

### Task 4: Enrich the members read model with plan + membership status

**Files:**
- Modify: `backend/src/queries/gym-configuration/dto/gym-member-item.dto.ts`
- Modify: `backend/src/queries/gym-configuration/gym-members.service.ts`
- Modify: `backend/src/api/gym-configuration/gym-members.controller.ts` (doc text only)
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts` (no code change expected — verify only)
- Test: `backend/src/queries/gym-configuration/gym-members.service.spec.ts`

**Interfaces:**
- Consumes: `AthleteMembershipPlanEntity { gymMembershipId, membershipPlanId, status, expiresAt, autoRoll, autoRollCount, membershipPlan }` (Task 1); `GymMembershipEntity.status: 'active' | 'inactive'`.
- Produces `GymMemberItemDto` gains:
  - `planId: string | null`
  - `planName: string | null`
  - `expiresAt: Date | null`
  - `membershipStatus: 'active' | 'expiring' | 'expired' | 'inactive'`
  - `autoRoll: boolean`
  - `autoRollCount: number`

**Two things to get right:**

1. **Drop the `status: 'active'` filter** on the membership query — suspended members must appear so the owner can resume them. Pin that with a test *before* changing it.
2. **Do not load the plan through the `activeMembershipPlan` relation.** `GymMembershipEntity.activeMembershipPlan` is an unfiltered `@OneToOne`, so it can resolve to a row whose `status` is `'expired'`. Query `AthleteMembershipPlanEntity` directly with `status: 'active'` and index the results by `gymMembershipId`. This is why the service gains a second injected repository.

**Derivation order (exactly this precedence, from the spec):**
1. `GymMembership.status === 'inactive'` → `'inactive'` (suspension wins over everything)
2. no active plan row, **or** `expiresAt` is non-null and `<= now` → `'expired'`
3. `expiresAt` is non-null and within the next 7 days → `'expiring'`
4. otherwise (including `expiresAt === null`, i.e. unlimited) → `'active'`

- [ ] **Step 1: Write the failing spec file with the pinning test first**

Create `backend/src/queries/gym-configuration/gym-members.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { GymMembersQueryService } from './gym-members.service';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gm-1',
    userId: 'user-1',
    gymId: 'gym-1',
    status: 'active',
    joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    ...overrides,
  } as unknown as GymMembershipEntity;
}

function buildActivePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'amp-1',
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    membershipPlan: { id: 'plan-1', name: 'Unlimited' },
    status: 'active',
    expiresAt: null,
    autoRoll: true,
    autoRollCount: 0,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('GymMembersQueryService', () => {
  let service: GymMembersQueryService;
  const membershipFind = jest.fn();
  const planFind = jest.fn();

  beforeEach(async () => {
    membershipFind.mockReset();
    planFind.mockReset();
    planFind.mockResolvedValue([]);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        GymMembersQueryService,
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { find: membershipFind },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find: planFind },
        },
      ],
    }).compile();

    service = moduleRef.get(GymMembersQueryService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists every member of the gym, suspended ones included', async () => {
    membershipFind.mockResolvedValue([]);

    await service.getMembersByGym('gym-1');

    expect(membershipFind).toHaveBeenCalledWith({
      where: { gymId: 'gym-1' },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  });

  it('loads only active plan rows, never the unfiltered relation', async () => {
    membershipFind.mockResolvedValue([
      buildMembership(),
      buildMembership({ id: 'gm-2', userId: 'user-2' }),
    ]);

    await service.getMembersByGym('gym-1');

    expect(planFind).toHaveBeenCalledWith({
      where: { status: 'active', gymMembershipId: In(['gm-1', 'gm-2']) },
      relations: ['membershipPlan'],
    });
  });
});
```

- [ ] **Step 2: Run it and confirm both tests fail**

Run: `cd backend && npx jest src/queries/gym-configuration/gym-members.service.spec.ts`
Expected: FAIL. The first test received `where: { gymId: 'gym-1', status: 'active' }`; the second fails at module compilation or because `planFind` was never called. Those failures document exactly what is changing.

- [ ] **Step 3: Add the failing derivation tests**

Append these inside the same `describe` block:

```ts
  it('reports an unlimited plan as active and maps every new field', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([buildActivePlan({ autoRollCount: 3 })]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0]).toEqual({
      id: 'gm-1',
      userId: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      status: 'active',
      joinedAt: new Date('2026-01-15T10:00:00.000Z'),
      planId: 'plan-1',
      planName: 'Unlimited',
      expiresAt: null,
      membershipStatus: 'active',
      autoRoll: true,
      autoRollCount: 3,
    });
  });

  it('reports a plan expiring inside seven days as expiring', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({ expiresAt: new Date('2026-08-16T10:00:00.000Z') }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('expiring');
    expect(result.members[0].expiresAt).toEqual(
      new Date('2026-08-16T10:00:00.000Z'),
    );
  });

  it('reports a plan expiring beyond seven days as active', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({ expiresAt: new Date('2026-09-01T10:00:00.000Z') }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('active');
  });

  it('reports a past expiry as expired even while the row still says active', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({
        expiresAt: new Date('2026-08-01T10:00:00.000Z'),
        autoRoll: false,
      }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('expired');
  });

  it('reports a member with no active plan as expired with null plan fields', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0]).toMatchObject({
      planId: null,
      planName: null,
      expiresAt: null,
      membershipStatus: 'expired',
      autoRoll: false,
      autoRollCount: 0,
    });
  });

  it('reports a suspended member as inactive even with a healthy plan', async () => {
    membershipFind.mockResolvedValue([buildMembership({ status: 'inactive' })]);
    planFind.mockResolvedValue([buildActivePlan()]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('inactive');
    expect(result.members[0].status).toBe('inactive');
  });

  it('matches each plan to its own member', async () => {
    membershipFind.mockResolvedValue([
      buildMembership(),
      buildMembership({ id: 'gm-2', userId: 'user-2' }),
    ]);
    planFind.mockResolvedValue([
      buildActivePlan({
        gymMembershipId: 'gm-2',
        membershipPlanId: 'plan-2',
        membershipPlan: { id: 'plan-2', name: 'Basic' },
      }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].planName).toBeNull();
    expect(result.members[1].planName).toBe('Basic');
  });

  it('skips the plan query entirely when the gym has no members', async () => {
    membershipFind.mockResolvedValue([]);

    const result = await service.getMembersByGym('gym-1');

    expect(planFind).not.toHaveBeenCalled();
    expect(result).toEqual({ members: [] });
  });
```

- [ ] **Step 4: Run them and confirm they fail**

Run: `cd backend && npx jest src/queries/gym-configuration/gym-members.service.spec.ts`
Expected: FAIL — the returned objects have no `membershipStatus` / `planId` keys.

- [ ] **Step 5: Extend the item DTO**

In `backend/src/queries/gym-configuration/dto/gym-member-item.dto.ts`, append these properties to the class (note the explicit `type:` on every nullable one — required, or Swagger emits `Record<string, never> | null`):

```ts
  @ApiProperty({
    type: String,
    example: 'uuid-plan-id',
    description: 'ID of the plan the member is currently on, null if none',
    nullable: true,
  })
  planId: string | null;

  @ApiProperty({
    type: String,
    example: 'Unlimited',
    description: 'Name of the plan the member is currently on, null if none',
    nullable: true,
  })
  planName: string | null;

  @ApiProperty({
    type: Date,
    example: '2026-09-01T00:00:00.000Z',
    description:
      'When the current plan lapses. Null means the plan is unlimited or the member has no plan.',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    enum: ['active', 'expiring', 'expired', 'inactive'],
    example: 'active',
    description:
      'Derived plan health: inactive when the membership is suspended, expired when there is no active plan or it has lapsed, expiring within 7 days of the expiry date, otherwise active',
  })
  membershipStatus: 'active' | 'expiring' | 'expired' | 'inactive';

  @ApiProperty({
    example: true,
    description:
      'Whether the current plan rolls forward automatically when it expires',
  })
  autoRoll: boolean;

  @ApiProperty({
    example: 3,
    description:
      'How many times the current plan has auto-renewed since auto-renew was last switched on',
  })
  autoRollCount: number;
```

- [ ] **Step 6: Rewrite the query service**

Replace the whole contents of `backend/src/queries/gym-configuration/gym-members.service.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { GymMemberItemDto } from './dto/gym-member-item.dto';
import { GetGymMembersResponseDto } from './dto/get-gym-members-response.dto';

/** A plan lapsing within this window is surfaced as "expiring". */
const EXPIRING_SOON_DAYS = 7;

@Injectable()
export class GymMembersQueryService {
  constructor(
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  /**
   * Owner-facing member list. Returns suspended members too — the owner needs
   * to see them in order to resume them.
   */
  async getMembersByGym(gymId: string): Promise<GetGymMembersResponseDto> {
    const memberships = await this.gymMembershipRepository.find({
      where: { gymId },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });

    if (memberships.length === 0) {
      return { members: [] };
    }

    const activePlans = await this.loadActivePlans(
      memberships.map((membership) => membership.id),
    );

    const now = new Date();

    const members: GymMemberItemDto[] = memberships.map((membership) => {
      const plan = activePlans.get(membership.id) ?? null;

      return {
        id: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        status: membership.status,
        joinedAt: membership.joinedAt,
        planId: plan?.membershipPlanId ?? null,
        planName: plan?.membershipPlan?.name ?? null,
        expiresAt: plan?.expiresAt ?? null,
        membershipStatus: this.deriveMembershipStatus(membership, plan, now),
        autoRoll: plan?.autoRoll ?? false,
        autoRollCount: plan?.autoRollCount ?? 0,
      };
    });

    return { members };
  }

  /**
   * GymMembershipEntity.activeMembershipPlan is an unfiltered OneToOne and can
   * resolve to an expired row, so query the active rows directly instead.
   */
  private async loadActivePlans(
    gymMembershipIds: string[],
  ): Promise<Map<string, AthleteMembershipPlanEntity>> {
    const rows = await this.athleteMembershipPlanRepository.find({
      where: { status: 'active', gymMembershipId: In(gymMembershipIds) },
      relations: ['membershipPlan'],
    });

    return new Map(rows.map((row) => [row.gymMembershipId, row]));
  }

  /**
   * Suspension wins over plan health; a missing or lapsed plan reads as
   * expired; a non-null expiry inside the warning window reads as expiring.
   * A null expiry is unlimited and always reads as active.
   */
  private deriveMembershipStatus(
    membership: GymMembershipEntity,
    plan: AthleteMembershipPlanEntity | null,
    now: Date,
  ): GymMemberItemDto['membershipStatus'] {
    if (membership.status === 'inactive') return 'inactive';
    if (!plan) return 'expired';
    if (plan.expiresAt === null) return 'active';

    const expiresAt = new Date(plan.expiresAt).getTime();
    if (expiresAt <= now.getTime()) return 'expired';

    const warningWindowEnd =
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

    return expiresAt <= warningWindowEnd ? 'expiring' : 'active';
  }
}
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `cd backend && npx jest src/queries/gym-configuration/gym-members.service.spec.ts`
Expected: PASS (10 tests).

- [ ] **Step 8: Confirm the new repository injection resolves**

`GymMembersQueryService` is provided by `GymConfigurationModule`, whose `TypeOrmModule.forFeature([...])` already includes both `GymMembershipEntity` and `AthleteMembershipPlanEntity` — so no module change should be needed. Verify by booting: `cd backend && npm run start:dev`. Expected: no `Nest can't resolve dependencies of the GymMembersQueryService` error. If any other module also provides this service, add `AthleteMembershipPlanEntity` to that module's `forFeature` list.

- [ ] **Step 9: Update the endpoint documentation**

In `backend/src/api/gym-configuration/gym-members.controller.ts`, the route now returns all members. Replace the JSDoc block and `@ApiOperation` above `getMembers`:

```ts
  /**
   * List all members for a gym (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   *
   * **Postconditions:**
   * - Returns every gym member (suspended included) with their current plan,
   *   expiry and derived membership status, sorted by joinedAt DESC
   */
  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'List members',
    description:
      'Returns every member for the gym — suspended members included — each with their current plan, expiry date and derived membership status, sorted by join date descending. Gym owners only.',
  })
```

and change the 200 response `description` from `'Active members list returned'` to `'Members list returned'`.

- [ ] **Step 10: Verify live and in Swagger**

With the backend running and the owner token from Task 3:

```bash
curl -s http://localhost:3000/api/gyms/<gymId>/members \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: every member carries `planId`, `planName`, `expiresAt`, `membershipStatus`, `autoRoll`, `autoRollCount`. Then in http://localhost:3000/api-docs confirm `GymMemberItemDto` shows `planId`/`planName` as nullable `string` and `expiresAt` as nullable `string($date-time)` — **not** `Record<string, never>`.

- [ ] **Step 11: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green. If an existing suite asserted the exact `GymMemberItemDto` shape, update it to include the new fields.

- [ ] **Step 12: Commit**

```bash
git add backend/src/queries/gym-configuration/gym-members.service.ts \
        backend/src/queries/gym-configuration/gym-members.service.spec.ts \
        backend/src/queries/gym-configuration/dto/gym-member-item.dto.ts \
        backend/src/api/gym-configuration/gym-members.controller.ts
git commit -m "feat(api): report plan, expiry and derived status on the members list"
```

---

### Task 5: Shared response DTO + `ExtendMembership` command

**Files:**
- Create: `backend/src/commands/gym-configuration/dto/athlete-membership-response.dto.ts`
- Create: `backend/src/commands/gym-configuration/extend-membership.command.ts`
- Create: `backend/src/commands/gym-configuration/handlers/extend-membership.handler.ts`
- Create: `backend/src/api/gym-configuration/dto/extend-membership-request.dto.ts`
- Test: `backend/src/commands/gym-configuration/handlers/extend-membership.handler.spec.ts`
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts`
- Modify: `backend/src/api/gym-configuration/gym-members.controller.ts`

**Interfaces:**
- Consumes: `AthleteMembershipPlanEntity.autoRoll` / `.autoRollCount` (Task 1); `GymStaffService.isGymOwner(userId, gymId)`.
- Produces (used by Tasks 6 and 7 too):
  - `AthleteMembershipResponseDto { id, gymMembershipId, membershipPlanId, planName, status, startedAt, expiresAt, autoRoll, autoRollCount }`
  - `ExtendMembershipCommand(userId, gymId, gymMembershipId, expiresAt: Date)`
  - `ExtendMembershipHandler.execute(command): Promise<AthleteMembershipResponseDto>`
  - `ExtendMembershipRequestDto { expiresAt: string }`
  - Route `PATCH /api/gyms/:gymId/members/:membershipId/membership/expiry`

**Behaviour (from the spec):**
- Extends **from `max(expiresAt, now)`** — i.e. a lapsed plan restarts from today, an unexpired one keeps its remaining time. **Scope narrowing, stated deliberately:** the spec offers "one billing cycle by default, or an explicit date". This command takes an **explicit date only**, and the frontend (Task 12) computes the one-cycle default itself by pre-filling the expiry input. That keeps `max(expiresAt, now)` in one place — the client — instead of splitting the rule across an optional-body branch. The server-side consequence is a single rule: the supplied date must be in the future.
- **Revives an expired plan** — the row's `status` goes back to `'active'`.
- **Resets `autoRollCount` to 0.** Per the spec, extending *is* the owner confirming the membership, so the unconfirmed-renewal counter that decision 13 surfaces on the Members list must clear. `AssignMembershipPlan` (Task 6) gets the same reset for free by creating a fresh row.
- A date in the past is `400`.
- No active *or expired* plan row for that membership at all is `404`.
- Cross-gym membership is `403`.

- [ ] **Step 1: Write the failing handler test**

Create `backend/src/commands/gym-configuration/handlers/extend-membership.handler.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExtendMembershipHandler } from './extend-membership.handler';
import { ExtendMembershipCommand } from '../extend-membership.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

const NOW = new Date('2026-08-11T10:00:00.000Z');
const FUTURE = new Date('2026-10-01T00:00:00.000Z');

function buildPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'amp-1',
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    membershipPlan: { id: 'plan-1', name: 'Unlimited' },
    status: 'active',
    startedAt: new Date('2026-07-01T00:00:00.000Z'),
    expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    autoRoll: true,
    autoRollCount: 2,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('ExtendMembershipHandler', () => {
  let handler: ExtendMembershipHandler;
  const isGymOwner = jest.fn();
  const membershipFindOne = jest.fn();
  const planFindOne = jest.fn();
  const planSave = jest.fn();

  beforeEach(async () => {
    [isGymOwner, membershipFindOne, planFindOne, planSave].forEach((m) =>
      m.mockReset(),
    );
    isGymOwner.mockResolvedValue(true);
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);
    planSave.mockImplementation((entity) => Promise.resolve(entity));
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExtendMembershipHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne: membershipFindOne },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { findOne: planFindOne, save: planSave },
        },
      ],
    }).compile();

    handler = moduleRef.get(ExtendMembershipHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function command(expiresAt: Date = FUTURE) {
    return new ExtendMembershipCommand('owner-1', 'gym-1', 'gm-1', expiresAt);
  }

  it('pushes the expiry to the requested date and returns the plan', async () => {
    const row = buildPlanRow();
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.expiresAt).toEqual(FUTURE);
    expect(row.status).toBe('active');
    expect(planSave).toHaveBeenCalledWith(row);
    expect(result).toEqual({
      id: 'amp-1',
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: new Date('2026-07-01T00:00:00.000Z'),
      expiresAt: FUTURE,
      autoRoll: true,
      autoRollCount: 0,
    });
  });

  it('clears the unconfirmed-renewal count, because extending is a confirmation', async () => {
    const row = buildPlanRow({ autoRollCount: 5 });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.autoRollCount).toBe(0);
    expect(result.autoRollCount).toBe(0);
  });

  it('revives an expired plan', async () => {
    const row = buildPlanRow({
      status: 'expired',
      expiresAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.status).toBe('active');
    expect(result.status).toBe('active');
    expect(result.expiresAt).toEqual(FUTURE);
  });

  it('extends an unlimited plan by pinning it to the requested date', async () => {
    const row = buildPlanRow({ expiresAt: null });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(result.expiresAt).toEqual(FUTURE);
  });

  it('rejects an expiry date in the past', async () => {
    planFindOne.mockResolvedValue(buildPlanRow());

    await expect(
      handler.execute(command(new Date('2026-08-01T00:00:00.000Z'))),
    ).rejects.toThrow(BadRequestException);
    expect(planSave).not.toHaveBeenCalled();
  });

  it('rejects an expiry date that is not a real date', async () => {
    planFindOne.mockResolvedValue(buildPlanRow());

    await expect(handler.execute(command(new Date('nonsense')))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command())).rejects.toThrow(NotFoundException);
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command())).rejects.toThrow(
      ForbiddenException,
    );
    expect(planFindOne).not.toHaveBeenCalled();
  });

  it('404s when the member has no membership plan at all', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command())).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/extend-membership.handler.spec.ts`
Expected: FAIL — cannot resolve module `./extend-membership.handler`.

- [ ] **Step 3: Write the shared response DTO**

Create `backend/src/commands/gym-configuration/dto/athlete-membership-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * The state of one member's current membership plan row. Returned by every
 * owner-side membership mutation so the frontend can update in place.
 */
export class AthleteMembershipResponseDto {
  @ApiProperty({ example: 'uuid-athlete-membership-plan-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-membership-id' })
  gymMembershipId: string;

  @ApiProperty({ example: 'uuid-membership-plan-id' })
  membershipPlanId: string;

  @ApiProperty({
    type: String,
    example: 'Unlimited',
    description: 'Name of the plan, null if the plan relation is unavailable',
    nullable: true,
  })
  planName: string | null;

  @ApiProperty({ enum: ['active', 'expired'], example: 'active' })
  status: 'active' | 'expired';

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  startedAt: Date;

  @ApiProperty({
    type: Date,
    example: '2026-10-01T00:00:00.000Z',
    description: 'Null means the plan is unlimited',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    example: true,
    description: 'Whether the plan rolls forward automatically on expiry',
  })
  autoRoll: boolean;

  @ApiProperty({
    example: 2,
    description:
      'How many times the plan has auto-renewed since auto-renew was last switched on',
  })
  autoRollCount: number;
}
```

- [ ] **Step 4: Write the command**

Create `backend/src/commands/gym-configuration/extend-membership.command.ts`:

```ts
import { ICommand } from '@nestjs/cqrs';

export class ExtendMembershipCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly expiresAt: Date,
  ) {}
}
```

- [ ] **Step 5: Write the handler**

Create `backend/src/commands/gym-configuration/handlers/extend-membership.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtendMembershipCommand } from '../extend-membership.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * ExtendMembershipHandler: an owner pushes a member's plan expiry to a new date.
 *
 * Reviving matters here: extending a lapsed plan flips its status back to
 * active, which is what makes the member's classes visible again.
 */
@CommandHandler(ExtendMembershipCommand)
export class ExtendMembershipHandler
  implements ICommandHandler<ExtendMembershipCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  async execute(
    command: ExtendMembershipCommand,
  ): Promise<AthleteMembershipResponseDto> {
    // Precondition 1: caller owns this gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: the membership exists and belongs to this gym
    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException(
        'Membership does not belong to this gym',
      );
    }

    // Precondition 3: the target date is a real date in the future
    const expiresAt = new Date(command.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt is not a valid date');
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    // Precondition 4: the member has a plan row to extend
    const plan = await this.athleteMembershipPlanRepository.findOne({
      where: { gymMembershipId: command.gymMembershipId },
      relations: ['membershipPlan'],
      order: { startedAt: 'DESC' },
    });
    if (!plan) {
      throw new NotFoundException('Member has no membership plan to extend');
    }

    // State change: push the expiry out, revive the row if it had lapsed, and
    // clear the unconfirmed-renewal counter — an explicit extension IS the
    // owner confirming this membership, which is what autoRollCount tracks.
    plan.expiresAt = expiresAt;
    plan.status = 'active';
    plan.autoRollCount = 0;

    const saved = await this.athleteMembershipPlanRepository.save(plan);

    return {
      id: saved.id,
      gymMembershipId: saved.gymMembershipId,
      membershipPlanId: saved.membershipPlanId,
      planName: saved.membershipPlan?.name ?? null,
      status: saved.status,
      startedAt: saved.startedAt,
      expiresAt: saved.expiresAt,
      autoRoll: saved.autoRoll,
      autoRollCount: saved.autoRollCount,
    };
  }
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/extend-membership.handler.spec.ts`
Expected: PASS (10 tests).

- [ ] **Step 7: Write the request DTO**

Create `backend/src/api/gym-configuration/dto/extend-membership-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExtendMembershipRequestDto {
  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description:
      'New expiry date for the member’s plan. Must be in the future. Extending a lapsed plan revives it.',
  })
  @IsDateString()
  expiresAt: string;
}
```

- [ ] **Step 8: Register the handler in the module**

In `backend/src/domain/gym-configuration/gym-configuration.module.ts` add the import and list `ExtendMembershipHandler` in `providers` alongside the other command handlers:

```ts
import { ExtendMembershipHandler } from '../../commands/gym-configuration/handlers/extend-membership.handler';
```

Command handlers are not exported.

- [ ] **Step 9: Add the controller route**

In `backend/src/api/gym-configuration/gym-members.controller.ts`, widen the Nest imports to include `Body`, `Inject`, `Patch`, `ValidationPipe`, add `ApiBody` to the Swagger imports, and add:

```ts
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ExtendMembershipCommand } from '../../commands/gym-configuration/extend-membership.command';
import { AthleteMembershipResponseDto } from '../../commands/gym-configuration/dto/athlete-membership-response.dto';
import { ExtendMembershipRequestDto } from './dto/extend-membership-request.dto';
```

Inject the bus in the constructor:

```ts
  constructor(
    private readonly gymMembersQueryService: GymMembersQueryService,
    @Inject(CommandBus) private readonly commandBus: CommandBus,
  ) {}
```

Then add the route:

```ts
  /**
   * Extend a member's plan expiry (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Target date is in the future
   * - Member has a membership plan row
   *
   * **Postconditions:**
   * - The plan's expiresAt is the requested date and its status is active
   */
  @Patch('/:membershipId/membership/expiry')
  @Role('owner')
  @ApiOperation({
    summary: 'Extend a member’s plan expiry',
    description:
      'Sets a new future expiry date on the member’s plan. A lapsed plan is revived. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: ExtendMembershipRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Membership extended',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'expiresAt missing or not in the future' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or membership plan not found' })
  async extendMembership(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: ExtendMembershipRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new ExtendMembershipCommand(
        userId,
        gymId,
        membershipId,
        new Date(body.expiresAt),
      ),
    );
  }
```

Note: `GymMembersController` is declared in `backend/src/http/http.module.ts`, which already imports both `CqrsModule` and `GymConfigurationModule` — so `CommandBus` resolves with no module change.

- [ ] **Step 10: Verify live and in Swagger**

Run: `cd backend && npm run start:dev`. Expected: boots with no dependency-resolution error.

With the owner token and a real `membershipId` from `GET /api/gyms/<gymId>/members`:

```bash
curl -s -X PATCH "http://localhost:3000/api/gyms/<gymId>/members/<membershipId>/membership/expiry" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"expiresAt":"2027-01-01T00:00:00.000Z"}' | python3 -m json.tool
```

Expected: 200 with `status: "active"` and `expiresAt: "2027-01-01T00:00:00.000Z"`. Then send a past date and expect 400. Then re-fetch `GET /api/gyms/<gymId>/members` and confirm that member's `membershipStatus` is now `active`. Finally check http://localhost:3000/api-docs shows the route with an `AthleteMembershipResponseDto` 200 schema.

- [ ] **Step 11: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 12: Commit**

```bash
git add backend/src/commands/gym-configuration/dto/athlete-membership-response.dto.ts \
        backend/src/commands/gym-configuration/extend-membership.command.ts \
        backend/src/commands/gym-configuration/handlers/extend-membership.handler.ts \
        backend/src/commands/gym-configuration/handlers/extend-membership.handler.spec.ts \
        backend/src/api/gym-configuration/dto/extend-membership-request.dto.ts \
        backend/src/api/gym-configuration/gym-members.controller.ts \
        backend/src/domain/gym-configuration/gym-configuration.module.ts
git commit -m "feat(api): let owners extend a member's plan expiry"
```

---

### Task 6: `AssignMembershipPlan` command (owner puts a member on a plan)

**Files:**
- Create: `backend/src/commands/gym-configuration/assign-membership-plan.command.ts`
- Create: `backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.ts`
- Create: `backend/src/api/gym-configuration/dto/assign-membership-plan-request.dto.ts`
- Test: `backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.spec.ts`
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts`
- Modify: `backend/src/api/gym-configuration/gym-members.controller.ts`

**Interfaces:**
- Consumes: `AthleteMembershipResponseDto` (Task 5); `GymStaffService.isGymOwner`.
- Produces:
  - `AssignMembershipPlanCommand(userId, gymId, gymMembershipId, membershipPlanId)`
  - `AssignMembershipPlanHandler.execute(command): Promise<AthleteMembershipResponseDto>`
  - `AssignMembershipPlanRequestDto { membershipPlanId: string }`
  - Route `PUT /api/gyms/:gymId/members/:membershipId/membership/plan`

**Behaviour (from the spec):**
- This is the owner-side twin of `PurchaseMembershipPlan`, which stays athlete-only. It reuses the same **atomic expire-then-create** transaction so a member can never hold two active plan rows.
- The target plan must be `status: 'active'` and belong to this gym — an archived plan cannot be newly assigned (existing subscribers keep theirs; that is what Task 3's `subscriberCount` warning is for).
- `expiresAt` is computed from the plan's `billingCycle`, one cycle from now.
- New rows start with `autoRoll: true` and `autoRollCount: 0` (the spec's default-ON decision).

- [ ] **Step 1: Write the failing handler test**

Create `backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignMembershipPlanHandler } from './assign-membership-plan.handler';
import { AssignMembershipPlanCommand } from '../assign-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

const NOW = new Date('2026-08-11T10:00:00.000Z');

describe('AssignMembershipPlanHandler', () => {
  let handler: AssignMembershipPlanHandler;
  const isGymOwner = jest.fn();
  const membershipFindOne = jest.fn();
  const planFindOne = jest.fn();
  const managerUpdate = jest.fn();
  const managerSave = jest.fn();
  const transaction = jest.fn();

  beforeEach(async () => {
    [
      isGymOwner,
      membershipFindOne,
      planFindOne,
      managerUpdate,
      managerSave,
      transaction,
    ].forEach((m) => m.mockReset());

    isGymOwner.mockResolvedValue(true);
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);
    planFindOne.mockResolvedValue({
      id: 'plan-1',
      gymId: 'gym-1',
      name: 'Unlimited',
      billingCycle: 'monthly',
      status: 'active',
    } as MembershipPlanEntity);
    managerSave.mockImplementation((_entity, row) => Promise.resolve(row));
    transaction.mockImplementation((work) =>
      work({ update: managerUpdate, save: managerSave }),
    );

    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AssignMembershipPlanHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        { provide: DataSource, useValue: { transaction } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne: membershipFindOne },
        },
        {
          provide: getRepositoryToken(MembershipPlanEntity),
          useValue: { findOne: planFindOne },
        },
      ],
    }).compile();

    handler = moduleRef.get(AssignMembershipPlanHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const command = new AssignMembershipPlanCommand(
    'owner-1',
    'gym-1',
    'gm-1',
    'plan-1',
  );

  it('expires any existing active plan before creating the new one', async () => {
    await handler.execute(command);

    expect(managerUpdate).toHaveBeenCalledWith(
      AthleteMembershipPlanEntity,
      { gymMembershipId: 'gm-1', status: 'active' },
      { status: 'expired' },
    );
    expect(managerUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      managerSave.mock.invocationCallOrder[0],
    );
  });

  it('creates a monthly plan expiring one month out, auto-roll on', async () => {
    const result = await handler.execute(command);

    expect(result).toMatchObject({
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: NOW,
      expiresAt: new Date('2026-09-11T10:00:00.000Z'),
      autoRoll: true,
      autoRollCount: 0,
    });
    expect(result.id).toEqual(expect.any(String));
  });

  it('creates an annual plan expiring one year out', async () => {
    planFindOne.mockResolvedValue({
      id: 'plan-1',
      gymId: 'gym-1',
      name: 'Annual',
      billingCycle: 'annual',
      status: 'active',
    } as MembershipPlanEntity);

    const result = await handler.execute(command);

    expect(result.expiresAt).toEqual(new Date('2027-08-11T10:00:00.000Z'));
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
  });

  it('404s when the plan is missing, archived, or from another gym', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(planFindOne).toHaveBeenCalledWith({
      where: { id: 'plan-1', gymId: 'gym-1', status: 'active' },
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/assign-membership-plan.handler.spec.ts`
Expected: FAIL — cannot resolve module `./assign-membership-plan.handler`.

- [ ] **Step 3: Write the command**

Create `backend/src/commands/gym-configuration/assign-membership-plan.command.ts`:

```ts
import { ICommand } from '@nestjs/cqrs';

export class AssignMembershipPlanCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly membershipPlanId: string,
  ) {}
}
```

- [ ] **Step 4: Write the handler**

Create `backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { AssignMembershipPlanCommand } from '../assign-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * AssignMembershipPlanHandler: the owner-side twin of PurchaseMembershipPlan
 * (which stays athlete-only). Same atomic expire-then-create transaction, so a
 * member can never end up holding two active plan rows.
 *
 * Archived plans are rejected: existing subscribers keep theirs, but an
 * archived plan cannot be newly assigned.
 */
@CommandHandler(AssignMembershipPlanCommand)
export class AssignMembershipPlanHandler
  implements ICommandHandler<AssignMembershipPlanCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(MembershipPlanEntity)
    private readonly membershipPlanRepository: Repository<MembershipPlanEntity>,
  ) {}

  async execute(
    command: AssignMembershipPlanCommand,
  ): Promise<AthleteMembershipResponseDto> {
    // Precondition 1: caller owns this gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: the membership exists and belongs to this gym
    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    // Precondition 3: the plan exists, is active, and belongs to this gym
    const plan = await this.membershipPlanRepository.findOne({
      where: {
        id: command.membershipPlanId,
        gymId: command.gymId,
        status: 'active',
      },
    });
    if (!plan) {
      throw new NotFoundException('Membership plan not found or is not active');
    }

    // ATOMIC: expire the current plan, then create the new one
    const startedAt = new Date();

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.update(
        AthleteMembershipPlanEntity,
        { gymMembershipId: membership.id, status: 'active' },
        { status: 'expired' },
      );

      const athletePlan = new AthleteMembershipPlanEntity();
      athletePlan.id = uuid();
      athletePlan.gymMembershipId = membership.id;
      athletePlan.membershipPlanId = plan.id;
      athletePlan.status = 'active';
      athletePlan.startedAt = startedAt;
      athletePlan.expiresAt = this.calculateExpirationDate(
        startedAt,
        plan.billingCycle,
      );
      athletePlan.autoRoll = true;
      athletePlan.autoRollCount = 0;

      return manager.save(AthleteMembershipPlanEntity, athletePlan);
    });

    return {
      id: saved.id,
      gymMembershipId: saved.gymMembershipId,
      membershipPlanId: saved.membershipPlanId,
      planName: plan.name,
      status: saved.status,
      startedAt: saved.startedAt,
      expiresAt: saved.expiresAt,
      autoRoll: saved.autoRoll,
      autoRollCount: saved.autoRollCount,
    };
  }

  private calculateExpirationDate(
    from: Date,
    billingCycle: 'monthly' | 'annual',
  ): Date {
    const expiresAt = new Date(from);

    if (billingCycle === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    return expiresAt;
  }
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/assign-membership-plan.handler.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the request DTO**

Create `backend/src/api/gym-configuration/dto/assign-membership-plan-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignMembershipPlanRequestDto {
  @ApiProperty({
    example: 'uuid-membership-plan-id',
    description:
      'ID of the plan to put the member on. Must be an active plan belonging to this gym.',
  })
  @IsUUID()
  membershipPlanId: string;
}
```

- [ ] **Step 7: Register the handler in the module**

In `backend/src/domain/gym-configuration/gym-configuration.module.ts` add the import and list `AssignMembershipPlanHandler` in `providers`:

```ts
import { AssignMembershipPlanHandler } from '../../commands/gym-configuration/handlers/assign-membership-plan.handler';
```

- [ ] **Step 8: Add the controller route**

In `backend/src/api/gym-configuration/gym-members.controller.ts`, add `Put` to the Nest imports, then these imports:

```ts
import { AssignMembershipPlanCommand } from '../../commands/gym-configuration/assign-membership-plan.command';
import { AssignMembershipPlanRequestDto } from './dto/assign-membership-plan-request.dto';
```

and the route:

```ts
  /**
   * Put a member on a membership plan (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Plan exists, is active, and belongs to this gym
   *
   * **Postconditions:**
   * - Any previous active plan row for the member is expired
   * - A new active plan row exists with auto-renew on and an expiry one
   *   billing cycle out
   */
  @Put('/:membershipId/membership/plan')
  @Role('owner')
  @ApiOperation({
    summary: 'Assign a membership plan to a member',
    description:
      'Moves the member onto the given active plan, expiring their previous plan atomically. Archived plans are rejected. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: AssignMembershipPlanRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Plan assigned',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'membershipPlanId missing or malformed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or active plan not found' })
  async assignMembershipPlan(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: AssignMembershipPlanRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new AssignMembershipPlanCommand(
        userId,
        gymId,
        membershipId,
        body.membershipPlanId,
      ),
    );
  }
```

- [ ] **Step 9: Verify live and in Swagger**

Run: `cd backend && npm run start:dev`, then with a real `membershipId` and a `planId` from `GET /api/gyms/<gymId>/configuration/membership-plans`:

```bash
curl -s -X PUT "http://localhost:3000/api/gyms/<gymId>/members/<membershipId>/membership/plan" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"membershipPlanId":"<planId>"}' | python3 -m json.tool
```

Expected: 200 with the new plan row, `autoRoll: true`, `autoRollCount: 0`, and an `expiresAt` one billing cycle out. Then re-fetch `GET /api/gyms/<gymId>/members` and confirm `planName` changed and `membershipStatus` is `active`. Try an archived plan ID and expect 404. Check the route appears in http://localhost:3000/api-docs.

- [ ] **Step 10: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 11: Commit**

```bash
git add backend/src/commands/gym-configuration/assign-membership-plan.command.ts \
        backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.ts \
        backend/src/commands/gym-configuration/handlers/assign-membership-plan.handler.spec.ts \
        backend/src/api/gym-configuration/dto/assign-membership-plan-request.dto.ts \
        backend/src/api/gym-configuration/gym-members.controller.ts \
        backend/src/domain/gym-configuration/gym-configuration.module.ts
git commit -m "feat(api): let owners assign a membership plan to a member"
```

---

### Task 7: Suspend/resume + auto-renew toggle commands

**Files:**
- Create: `backend/src/commands/gym-configuration/set-gym-membership-status.command.ts`
- Create: `backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.ts`
- Create: `backend/src/commands/gym-configuration/dto/gym-membership-status-response.dto.ts`
- Create: `backend/src/commands/gym-configuration/set-membership-auto-roll.command.ts`
- Create: `backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.ts`
- Create: `backend/src/api/gym-configuration/dto/set-gym-membership-status-request.dto.ts`
- Create: `backend/src/api/gym-configuration/dto/set-membership-auto-roll-request.dto.ts`
- Test: `backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.spec.ts`
- Test: `backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.spec.ts`
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts`
- Modify: `backend/src/api/gym-configuration/gym-members.controller.ts`

These two ship together: they are the same shape (owner flips one field on one member), they share the guard preconditions from Task 5, and a reviewer would accept or reject them as one unit.

**Interfaces:**
- Consumes: `AthleteMembershipResponseDto` (Task 5); `GymStaffService.isGymOwner`.
- Produces:
  - `GymMembershipStatusResponseDto { id, gymId, userId, status: 'active' | 'inactive', joinedAt }`
  - `SetGymMembershipStatusCommand(userId, gymId, gymMembershipId, status: 'active' | 'inactive')` → `GymMembershipStatusResponseDto`
  - `SetMembershipAutoRollCommand(userId, gymId, gymMembershipId, autoRoll: boolean)` → `AthleteMembershipResponseDto`
  - `SetGymMembershipStatusRequestDto { status: 'active' | 'inactive' }`
  - `SetMembershipAutoRollRequestDto { autoRoll: boolean }`
  - Routes `PATCH /api/gyms/:gymId/members/:membershipId/status` and `PATCH /api/gyms/:gymId/members/:membershipId/membership/auto-roll`

**Behaviour (from the spec):**
- Suspend flips `GymMembership.status` to `'inactive'`; resume flips it back. It does **not** touch the plan row — the plan keeps ticking, which is why the derivation in Task 4 puts `inactive` ahead of plan health.
- Turning auto-renew **ON resets `autoRollCount` to 0** (the counter measures renewals since it was last switched on). Turning it OFF leaves the count alone.

- [ ] **Step 1: Write the failing suspend/resume test**

Create `backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetGymMembershipStatusHandler } from './set-gym-membership-status.handler';
import { SetGymMembershipStatusCommand } from '../set-gym-membership-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';

function buildMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gm-1',
    gymId: 'gym-1',
    userId: 'user-1',
    status: 'active',
    joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    ...overrides,
  } as unknown as GymMembershipEntity;
}

describe('SetGymMembershipStatusHandler', () => {
  let handler: SetGymMembershipStatusHandler;
  const isGymOwner = jest.fn();
  const findOne = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    [isGymOwner, findOne, save].forEach((m) => m.mockReset());
    isGymOwner.mockResolvedValue(true);
    save.mockImplementation((entity) => Promise.resolve(entity));

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetGymMembershipStatusHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne, save },
        },
      ],
    }).compile();

    handler = moduleRef.get(SetGymMembershipStatusHandler);
  });

  function command(status: 'active' | 'inactive') {
    return new SetGymMembershipStatusCommand(
      'owner-1',
      'gym-1',
      'gm-1',
      status,
    );
  }

  it('suspends an active member', async () => {
    const membership = buildMembership();
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('inactive'));

    expect(membership.status).toBe('inactive');
    expect(save).toHaveBeenCalledWith(membership);
    expect(result).toEqual({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'inactive',
      joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    });
  });

  it('resumes a suspended member', async () => {
    const membership = buildMembership({ status: 'inactive' });
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('active'));

    expect(result.status).toBe('active');
  });

  it('is idempotent when the status already matches', async () => {
    const membership = buildMembership();
    findOne.mockResolvedValue(membership);

    const result = await handler.execute(command('active'));

    expect(result.status).toBe('active');
    expect(save).toHaveBeenCalledWith(membership);
  });

  it('403s when the caller is not an owner of the gym', async () => {
    findOne.mockResolvedValue(buildMembership());
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403s when the membership belongs to another gym', async () => {
    findOne.mockResolvedValue(buildMembership({ gymId: 'other-gym' }));

    await expect(handler.execute(command('inactive'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
```

- [ ] **Step 2: Write the failing auto-roll test**

Create `backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetMembershipAutoRollHandler } from './set-membership-auto-roll.handler';
import { SetMembershipAutoRollCommand } from '../set-membership-auto-roll.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'amp-1',
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    membershipPlan: { id: 'plan-1', name: 'Unlimited' },
    status: 'active',
    startedAt: new Date('2026-07-01T00:00:00.000Z'),
    expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    autoRoll: true,
    autoRollCount: 5,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('SetMembershipAutoRollHandler', () => {
  let handler: SetMembershipAutoRollHandler;
  const isGymOwner = jest.fn();
  const membershipFindOne = jest.fn();
  const planFindOne = jest.fn();
  const planSave = jest.fn();

  beforeEach(async () => {
    [isGymOwner, membershipFindOne, planFindOne, planSave].forEach((m) =>
      m.mockReset(),
    );
    isGymOwner.mockResolvedValue(true);
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);
    planSave.mockImplementation((entity) => Promise.resolve(entity));

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetMembershipAutoRollHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne: membershipFindOne },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { findOne: planFindOne, save: planSave },
        },
      ],
    }).compile();

    handler = moduleRef.get(SetMembershipAutoRollHandler);
  });

  function command(autoRoll: boolean) {
    return new SetMembershipAutoRollCommand('owner-1', 'gym-1', 'gm-1', autoRoll);
  }

  it('turns auto-renew off and leaves the renewal count alone', async () => {
    const row = buildPlanRow();
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command(false));

    expect(row.autoRoll).toBe(false);
    expect(row.autoRollCount).toBe(5);
    expect(planSave).toHaveBeenCalledWith(row);
    expect(result).toEqual({
      id: 'amp-1',
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: new Date('2026-07-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      autoRoll: false,
      autoRollCount: 5,
    });
  });

  it('resets the renewal count when auto-renew is turned back on', async () => {
    const row = buildPlanRow({ autoRoll: false, autoRollCount: 5 });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command(true));

    expect(result.autoRoll).toBe(true);
    expect(result.autoRollCount).toBe(0);
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command(false))).rejects.toThrow(
      ForbiddenException,
    );
    expect(planSave).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command(false))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command(false))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('404s when the member has no active plan', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command(false))).rejects.toThrow(
      NotFoundException,
    );
    expect(planFindOne).toHaveBeenCalledWith({
      where: { gymMembershipId: 'gm-1', status: 'active' },
      relations: ['membershipPlan'],
    });
  });
});
```

- [ ] **Step 3: Run both and confirm they fail**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/set-gym-membership-status.handler.spec.ts src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.spec.ts`
Expected: FAIL — neither handler module resolves.

- [ ] **Step 4: Write the two commands**

Create `backend/src/commands/gym-configuration/set-gym-membership-status.command.ts`:

```ts
import { ICommand } from '@nestjs/cqrs';

export class SetGymMembershipStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly status: 'active' | 'inactive',
  ) {}
}
```

Create `backend/src/commands/gym-configuration/set-membership-auto-roll.command.ts`:

```ts
import { ICommand } from '@nestjs/cqrs';

export class SetMembershipAutoRollCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly autoRoll: boolean,
  ) {}
}
```

- [ ] **Step 5: Write the membership-status response DTO**

Create `backend/src/commands/gym-configuration/dto/gym-membership-status-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class GymMembershipStatusResponseDto {
  @ApiProperty({ example: 'uuid-gym-membership-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'inactive',
    description:
      'Suspending a member leaves their plan untouched; it only blocks them from the gym',
  })
  status: 'active' | 'inactive';

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  joinedAt: Date;
}
```

- [ ] **Step 6: Write the suspend/resume handler**

Create `backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetGymMembershipStatusCommand } from '../set-gym-membership-status.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { GymMembershipStatusResponseDto } from '../dto/gym-membership-status-response.dto';

/**
 * SetGymMembershipStatusHandler: suspend or resume a member.
 *
 * Deliberately does NOT touch the plan row — the plan keeps ticking while the
 * member is suspended, which is why the members read model puts 'inactive'
 * ahead of plan health when deriving membershipStatus.
 */
@CommandHandler(SetGymMembershipStatusCommand)
export class SetGymMembershipStatusHandler
  implements ICommandHandler<SetGymMembershipStatusCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
  ) {}

  async execute(
    command: SetGymMembershipStatusCommand,
  ): Promise<GymMembershipStatusResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    membership.status = command.status;

    const saved = await this.gymMembershipRepository.save(membership);

    return {
      id: saved.id,
      gymId: saved.gymId,
      userId: saved.userId,
      status: saved.status,
      joinedAt: saved.joinedAt,
    };
  }
}
```

- [ ] **Step 7: Write the auto-roll handler**

Create `backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetMembershipAutoRollCommand } from '../set-membership-auto-roll.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';
import { AthleteMembershipResponseDto } from '../dto/athlete-membership-response.dto';

/**
 * SetMembershipAutoRollHandler: flip a member's auto-renew on or off.
 *
 * autoRollCount counts renewals since auto-renew was last switched ON, so
 * turning it on resets the counter; turning it off leaves the history intact.
 */
@CommandHandler(SetMembershipAutoRollCommand)
export class SetMembershipAutoRollHandler
  implements ICommandHandler<SetMembershipAutoRollCommand>
{
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(AthleteMembershipPlanEntity)
    private readonly athleteMembershipPlanRepository: Repository<AthleteMembershipPlanEntity>,
  ) {}

  async execute(
    command: SetMembershipAutoRollCommand,
  ): Promise<AthleteMembershipResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { id: command.gymMembershipId },
    });
    if (!membership) {
      throw new NotFoundException('Gym membership not found');
    }
    if (membership.gymId !== command.gymId) {
      throw new ForbiddenException('Membership does not belong to this gym');
    }

    const plan = await this.athleteMembershipPlanRepository.findOne({
      where: { gymMembershipId: command.gymMembershipId, status: 'active' },
      relations: ['membershipPlan'],
    });
    if (!plan) {
      throw new NotFoundException('Member has no active membership plan');
    }

    plan.autoRoll = command.autoRoll;
    if (command.autoRoll) {
      plan.autoRollCount = 0;
    }

    const saved = await this.athleteMembershipPlanRepository.save(plan);

    return {
      id: saved.id,
      gymMembershipId: saved.gymMembershipId,
      membershipPlanId: saved.membershipPlanId,
      planName: saved.membershipPlan?.name ?? null,
      status: saved.status,
      startedAt: saved.startedAt,
      expiresAt: saved.expiresAt,
      autoRoll: saved.autoRoll,
      autoRollCount: saved.autoRollCount,
    };
  }
}
```

- [ ] **Step 8: Run both suites and confirm they pass**

Run: `cd backend && npx jest src/commands/gym-configuration/handlers/set-gym-membership-status.handler.spec.ts src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.spec.ts`
Expected: PASS (6 + 6 = 12 tests).

- [ ] **Step 9: Write the two request DTOs**

Create `backend/src/api/gym-configuration/dto/set-gym-membership-status-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetGymMembershipStatusRequestDto {
  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'inactive',
    description:
      'Set inactive to suspend the member, active to resume them. The member’s plan is unaffected either way.',
  })
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
```

Create `backend/src/api/gym-configuration/dto/set-membership-auto-roll-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetMembershipAutoRollRequestDto {
  @ApiProperty({
    example: false,
    description:
      'Whether the member’s plan should roll forward automatically on expiry. Turning it on resets the renewal count.',
  })
  @IsBoolean()
  autoRoll: boolean;
}
```

- [ ] **Step 10: Register both handlers in the module**

In `backend/src/domain/gym-configuration/gym-configuration.module.ts` add the imports and list both in `providers`:

```ts
import { SetGymMembershipStatusHandler } from '../../commands/gym-configuration/handlers/set-gym-membership-status.handler';
import { SetMembershipAutoRollHandler } from '../../commands/gym-configuration/handlers/set-membership-auto-roll.handler';
```

- [ ] **Step 11: Add both controller routes**

In `backend/src/api/gym-configuration/gym-members.controller.ts` add the imports:

```ts
import { SetGymMembershipStatusCommand } from '../../commands/gym-configuration/set-gym-membership-status.command';
import { SetMembershipAutoRollCommand } from '../../commands/gym-configuration/set-membership-auto-roll.command';
import { GymMembershipStatusResponseDto } from '../../commands/gym-configuration/dto/gym-membership-status-response.dto';
import { SetGymMembershipStatusRequestDto } from './dto/set-gym-membership-status-request.dto';
import { SetMembershipAutoRollRequestDto } from './dto/set-membership-auto-roll-request.dto';
```

and the two routes:

```ts
  /**
   * Suspend or resume a member (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   *
   * **Postconditions:**
   * - The membership status is the requested value; the member's plan is untouched
   */
  @Patch('/:membershipId/status')
  @Role('owner')
  @ApiOperation({
    summary: 'Suspend or resume a member',
    description:
      'Sets the gym membership status. Suspending blocks the member without altering their plan. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: SetGymMembershipStatusRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Membership status updated',
    type: GymMembershipStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'status missing or not one of active|inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async setMembershipStatus(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: SetGymMembershipStatusRequestDto,
    @CurrentUser() userId: string,
  ): Promise<GymMembershipStatusResponseDto> {
    return this.commandBus.execute(
      new SetGymMembershipStatusCommand(
        userId,
        gymId,
        membershipId,
        body.status,
      ),
    );
  }

  /**
   * Toggle a member's plan auto-renew (Gym Owner only)
   *
   * **Preconditions:**
   * - Caller is an owner of this gym
   * - Membership exists and belongs to this gym
   * - Member has an active plan
   *
   * **Postconditions:**
   * - The plan's autoRoll is the requested value; turning it on resets autoRollCount to 0
   */
  @Patch('/:membershipId/membership/auto-roll')
  @Role('owner')
  @ApiOperation({
    summary: 'Toggle a member’s plan auto-renew',
    description:
      'Turns auto-renew on or off for the member’s active plan. Turning it on resets the renewal count. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'membershipId', description: 'Gym membership ID' })
  @ApiBody({ type: SetMembershipAutoRollRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Auto-renew updated',
    type: AthleteMembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'autoRoll missing or not a boolean' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required or wrong gym' })
  @ApiResponse({ status: 404, description: 'Membership or active plan not found' })
  async setMembershipAutoRoll(
    @Param('gymId') gymId: string,
    @Param('membershipId') membershipId: string,
    @Body(ValidationPipe) body: SetMembershipAutoRollRequestDto,
    @CurrentUser() userId: string,
  ): Promise<AthleteMembershipResponseDto> {
    return this.commandBus.execute(
      new SetMembershipAutoRollCommand(
        userId,
        gymId,
        membershipId,
        body.autoRoll,
      ),
    );
  }
```

- [ ] **Step 12: Verify live and in Swagger**

Run: `cd backend && npm run start:dev`, then:

```bash
curl -s -X PATCH "http://localhost:3000/api/gyms/<gymId>/members/<membershipId>/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"inactive"}' | python3 -m json.tool

curl -s -X PATCH "http://localhost:3000/api/gyms/<gymId>/members/<membershipId>/membership/auto-roll" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"autoRoll":false}' | python3 -m json.tool
```

Expected: both 200. After the first, `GET /api/gyms/<gymId>/members` shows that member with `status: "inactive"` **and** `membershipStatus: "inactive"`. Resume them (`{"status":"active"}`) and confirm `membershipStatus` returns to its plan-derived value. Confirm both routes appear in http://localhost:3000/api-docs.

- [ ] **Step 13: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green.

- [ ] **Step 14: Commit**

```bash
git add backend/src/commands/gym-configuration/set-gym-membership-status.command.ts \
        backend/src/commands/gym-configuration/set-membership-auto-roll.command.ts \
        backend/src/commands/gym-configuration/dto/gym-membership-status-response.dto.ts \
        backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.ts \
        backend/src/commands/gym-configuration/handlers/set-gym-membership-status.handler.spec.ts \
        backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.ts \
        backend/src/commands/gym-configuration/handlers/set-membership-auto-roll.handler.spec.ts \
        backend/src/api/gym-configuration/dto/set-gym-membership-status-request.dto.ts \
        backend/src/api/gym-configuration/dto/set-membership-auto-roll-request.dto.ts \
        backend/src/api/gym-configuration/gym-members.controller.ts \
        backend/src/domain/gym-configuration/gym-configuration.module.ts
git commit -m "feat(api): let owners suspend members and toggle plan auto-renew"
```

---

### Task 8: Enforce plan expiry when browsing and when booking

**Files:**
- Modify: `backend/src/queries/class/class-schedule.service.ts`
- Modify: `backend/src/queries/class/dto/get-class-schedule-response.dto.ts`
- Modify: `backend/src/commands/class/handlers/book-class.handler.ts`
- Test: `backend/src/queries/class/class-schedule.service.spec.ts` (create if absent, extend if present)
- Test: `backend/src/commands/class/handlers/book-class.handler.spec.ts` (create if absent, extend if present)

**Interfaces:**
- Consumes: `AthleteMembershipPlanRepository.getActivePlanByGymMembership(gymMembershipId)` (existing, loads the `membershipPlan` relation); `activePlan.expiresAt`.
- Produces:
  - `GetClassScheduleResponseDto.planExpiresAt: string | null` — `YYYY-MM-DD`, or `null` when the plan is unlimited. The athlete schedule footer note (Task 12) reads this.
  - Two new 403 messages from `BookClassHandler`, distinct so the frontend can tell them apart:
    - `'Athlete membership plan has expired'`
    - `'Class is scheduled after the athlete membership plan expires'`

**Behaviour (from the spec):**
- **Hidden, not merely unbookable.** A class whose `scheduledDate` is after the athlete's `expiresAt` does not appear in the schedule at all.
- The whole schedule is refused (existing 403 path) once the plan itself has lapsed — the plan row may still say `'active'` between scheduler ticks, so compare `expiresAt` to now here rather than trusting `status`.
- `expiresAt === null` is unlimited: no cutoff, no hiding, `planExpiresAt` is `null`.
- **Existing bookings are left alone.** Nothing in this task cancels or touches `BookingEntity`.
- Both checks sit inside the `if (!isStaff)` block in `book-class.handler.ts` — owners and coaches are never blocked by plan expiry.

- [ ] **Step 1: Write the failing schedule-service tests**

If `backend/src/queries/class/class-schedule.service.spec.ts` exists, add these cases to it, reusing its existing mock setup. If it does not, create it:

```ts
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ClassScheduleService } from './class-schedule.service';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymService } from '../../domain/gym/gym.service';

const NOW = new Date('2026-08-11T10:00:00.000Z');

function buildClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 'class-1',
    gymId: 'gym-1',
    classTypeId: 'ct-1',
    classType: { name: 'WOD' },
    scheduledDate: new Date('2026-08-12T00:00:00.000Z'),
    scheduledTime: '09:00',
    coachUserId: 'coach-1',
    coach: { name: 'Coach Ann' },
    spaceId: 'space-1',
    space: { name: 'Main Floor' },
    capacity: 20,
    duration: 60,
    state: 'published',
    ...overrides,
  };
}

describe('ClassScheduleService — plan expiry', () => {
  let service: ClassScheduleService;
  const getClassesByGym = jest.fn();
  const countBookedBookings = jest.fn();
  const getActiveGymMembershipByUserAndGym = jest.fn();
  const getActivePlanByGymMembership = jest.fn();
  const getGymById = jest.fn();

  beforeEach(async () => {
    [
      getClassesByGym,
      countBookedBookings,
      getActiveGymMembershipByUserAndGym,
      getActivePlanByGymMembership,
      getGymById,
    ].forEach((m) => m.mockReset());

    countBookedBookings.mockResolvedValue(0);
    getGymById.mockResolvedValue({ id: 'gym-1', name: 'CrossFit Downtown' });
    getActiveGymMembershipByUserAndGym.mockResolvedValue({ id: 'gm-1' });
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: null,
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });

    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassScheduleService,
        { provide: ClassRepository, useValue: { getClassesByGym } },
        { provide: BookingRepository, useValue: { countBookedBookings } },
        {
          provide: GymMembershipRepository,
          useValue: { getActiveGymMembershipByUserAndGym },
        },
        {
          provide: AthleteMembershipPlanRepository,
          useValue: { getActivePlanByGymMembership },
        },
        { provide: GymStaffService, useValue: { isCoach: jest.fn() } },
        { provide: GymService, useValue: { getGymById } },
      ],
    }).compile();

    service = moduleRef.get(ClassScheduleService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports planExpiresAt as null for an unlimited plan and hides nothing', async () => {
    getClassesByGym.mockResolvedValue([
      buildClass(),
      buildClass({ id: 'class-2', scheduledDate: new Date('2027-01-01T00:00:00.000Z') }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(2);
  });

  it('reports planExpiresAt and hides classes scheduled after the cutoff', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date('2026-08-20T00:00:00.000Z'),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([
      buildClass({ id: 'inside', scheduledDate: new Date('2026-08-19T00:00:00.000Z') }),
      buildClass({ id: 'on-cutoff', scheduledDate: new Date('2026-08-20T00:00:00.000Z') }),
      buildClass({ id: 'past-cutoff', scheduledDate: new Date('2026-08-21T00:00:00.000Z') }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBe('2026-08-20');
    expect(result.classes.map((cls) => cls.id)).toEqual(['inside', 'on-cutoff']);
  });

  it('refuses the whole schedule when the plan has already lapsed', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([buildClass()]);

    await expect(
      service.getClassScheduleForAthlete('gym-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('leaves the owner schedule free of plan fields', async () => {
    getClassesByGym.mockResolvedValue([buildClass()]);

    const result = await service.getClassScheduleForOwner('gym-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd backend && npx jest src/queries/class/class-schedule.service.spec.ts`
Expected: FAIL — `result.planExpiresAt` is `undefined`, and the lapsed-plan case resolves instead of throwing.

- [ ] **Step 3: Add `planExpiresAt` to the response DTO**

In `backend/src/queries/class/dto/get-class-schedule-response.dto.ts`, add above `classes`:

```ts
  @ApiProperty({
    type: String,
    example: '2026-08-20',
    description:
      'Last date the athlete’s membership plan covers (YYYY-MM-DD). Null when the plan is unlimited or the caller is not an athlete. Classes after this date are omitted from the list.',
    nullable: true,
  })
  planExpiresAt: string | null;
```

- [ ] **Step 4: Enforce expiry in the athlete schedule**

In `backend/src/queries/class/class-schedule.service.ts`, immediately after the existing Step 2 `if (!activePlan || !activePlan.membershipPlan)` guard, add:

```ts
    // Step 2b: Refuse the schedule outright once the plan has lapsed.
    // The row can still read 'active' between MembershipRenewalScheduler ticks,
    // so compare the date rather than trusting status.
    const planExpiresAt = activePlan.expiresAt
      ? new Date(activePlan.expiresAt)
      : null;

    if (planExpiresAt && planExpiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException(
        'Athlete membership plan has expired',
      );
    }
```

Replace the Step 5 filter with:

```ts
    // Step 5: Filter to non-archived classes of an allowed type that also fall
    // within the plan's coverage. A class after the cutoff is HIDDEN, not merely
    // unbookable — see DECISIONS.md → Membership Plan Expiry.
    const eligibleClasses = allClasses.filter(
      (cls) =>
        cls.state !== 'archived' &&
        allowedClassTypeIds.includes(cls.classTypeId) &&
        this.isWithinPlanCoverage(cls.scheduledDate, planExpiresAt),
    );
```

Change the athlete return statement to:

```ts
    return {
      gymName: gym?.name ?? '',
      planExpiresAt: planExpiresAt ? this.formatDate(planExpiresAt) : null,
      classes: classItems,
    };
```

Add this private helper next to `formatDate`:

```ts
  /**
   * A class is covered when the plan is unlimited, or when the class falls on or
   * before the plan's expiry date. Compared date-to-date (not instant-to-instant)
   * so a class earlier in the day on the expiry date still counts.
   */
  private isWithinPlanCoverage(
    scheduledDate: Date | string | number,
    planExpiresAt: Date | null,
  ): boolean {
    if (!planExpiresAt) return true;

    return this.formatDate(scheduledDate) <= this.formatDate(planExpiresAt);
  }
```

- [ ] **Step 5: Add `planExpiresAt: null` to the owner return**

Still in `class-schedule.service.ts`, the `getClassScheduleForOwner` return must satisfy the widened DTO:

```ts
    return {
      gymName: gym?.name ?? '',
      planExpiresAt: null,
      classes: classItems,
    };
```

- [ ] **Step 6: Run the schedule tests and confirm they pass**

Run: `cd backend && npx jest src/queries/class/class-schedule.service.spec.ts`
Expected: PASS (4 tests, plus any pre-existing ones in the file).

- [ ] **Step 7: Write the failing booking tests**

If `backend/src/commands/class/handlers/book-class.handler.spec.ts` exists, add these cases reusing its mocks. If not, create it — mock `ClassRepository`, `GymMembershipRepository`, `AthleteMembershipPlanRepository`, `GymService`, `getRepositoryToken(BookingEntity)` and `EventEmitter2`, with `jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'))`. The three cases:

```ts
  it('403s with the expiry message when the plan has lapsed', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      membershipPlan: { classTypes: ['ct-1'] },
    });

    await expect(
      handler.execute(
        new BookClassCommand('user-1', 'gym-1', 'class-1', 'athlete'),
      ),
    ).rejects.toThrow('Athlete membership plan has expired');
  });

  it('403s with the cutoff message when the class is after the plan expiry', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date('2026-08-15T00:00:00.000Z'),
      membershipPlan: { classTypes: ['ct-1'] },
    });
    getClassById.mockResolvedValue(
      buildClass({ scheduledDate: new Date('2026-08-20T00:00:00.000Z') }),
    );

    await expect(
      handler.execute(
        new BookClassCommand('user-1', 'gym-1', 'class-1', 'athlete'),
      ),
    ).rejects.toThrow(
      'Class is scheduled after the athlete membership plan expires',
    );
  });

  it('lets a coach book a class beyond any plan expiry', async () => {
    getClassById.mockResolvedValue(
      buildClass({ scheduledDate: new Date('2027-01-01T00:00:00.000Z') }),
    );

    const result = await handler.execute(
      new BookClassCommand('coach-1', 'gym-1', 'class-1', 'coach'),
    );

    expect(result.status).toBe('booked');
    expect(getActivePlanByGymMembership).not.toHaveBeenCalled();
  });
```

Check `BookClassCommand`'s constructor signature before writing these and match the argument order exactly.

- [ ] **Step 8: Run them and confirm they fail**

Run: `cd backend && npx jest src/commands/class/handlers/book-class.handler.spec.ts`
Expected: FAIL — the first two resolve to a successful booking instead of throwing.

- [ ] **Step 9: Add the two booking preconditions**

In `backend/src/commands/class/handlers/book-class.handler.ts`, inside the `if (!isStaff)` block, after the existing Precondition 5 class-type check, add:

```ts
      // Precondition 5b: the plan must not have lapsed. The row can still read
      // 'active' between MembershipRenewalScheduler ticks, so check the date.
      const planExpiresAt = activePlan.expiresAt
        ? new Date(activePlan.expiresAt)
        : null;

      if (planExpiresAt && planExpiresAt.getTime() <= Date.now()) {
        throw forbidden('Athlete membership plan has expired');
      }

      // Precondition 5c: the class must fall within the plan's coverage.
      // Compared date-to-date so a class on the expiry day still counts.
      if (planExpiresAt) {
        const classDay = this.toDayString(classEntity.scheduledDate);
        const cutoffDay = this.toDayString(planExpiresAt);

        if (classDay > cutoffDay) {
          throw forbidden(
            'Class is scheduled after the athlete membership plan expires',
          );
        }
      }
```

and add this private helper to the class:

```ts
  /**
   * Reduce a date value to YYYY-MM-DD so plan coverage is compared by day
   * rather than by instant.
   */
  private toDayString(value: Date | string | number): string {
    const date = value instanceof Date ? value : new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
```

- [ ] **Step 10: Run the booking tests and confirm they pass**

Run: `cd backend && npx jest src/commands/class/handlers/book-class.handler.spec.ts`
Expected: PASS.

- [ ] **Step 11: Verify live end to end**

Run: `cd backend && npm run start:dev`. Log in as `athlete@example.com` / `password123`, note their `gymId`, and:

```bash
curl -s "http://localhost:3000/api/gyms/<gymId>/classes" \
  -H "Authorization: Bearer $ATHLETE_TOKEN" | python3 -m json.tool | head -20
```

Expected: `planExpiresAt` is present (a `YYYY-MM-DD` string or `null`).

Then, as the owner, set that athlete's expiry to a near date via Task 5's endpoint (e.g. tomorrow), re-fetch the athlete schedule, and confirm classes beyond that date have disappeared and `planExpiresAt` matches. Attempt to book one of the vanished classes by ID and confirm a 403 with `'Class is scheduled after the athlete membership plan expires'`. Restore the expiry afterwards.

- [ ] **Step 12: Typecheck and run the whole backend suite**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: tsc clean, all suites green. Any existing suite asserting the exact `GetClassScheduleResponseDto` shape needs `planExpiresAt` added.

- [ ] **Step 13: Commit**

```bash
git add backend/src/queries/class/class-schedule.service.ts \
        backend/src/queries/class/class-schedule.service.spec.ts \
        backend/src/queries/class/dto/get-class-schedule-response.dto.ts \
        backend/src/commands/class/handlers/book-class.handler.ts \
        backend/src/commands/class/handlers/book-class.handler.spec.ts
git commit -m "feat(api): hide and refuse classes beyond the athlete's plan expiry"
```

---

### Task 9: Regenerate the frontend API types

**Files:**
- Modify: `frontend/types/api.gen.ts` (generated — never hand-edit)

**Interfaces:**
- Consumes: every Swagger change from Tasks 3–8.
- Produces the generated schemas the frontend tasks import:
  - `components['schemas']['MembershipPlanItemDto']`
  - `components['schemas']['GetMembershipPlansResponseDto']`
  - `components['schemas']['GymMemberItemDto']` (now with `planId`, `planName`, `expiresAt`, `membershipStatus`, `autoRoll`, `autoRollCount`)
  - `components['schemas']['AthleteMembershipResponseDto']`
  - `components['schemas']['GymMembershipStatusResponseDto']`
  - `components['schemas']['ExtendMembershipRequestDto']`
  - `components['schemas']['AssignMembershipPlanRequestDto']`
  - `components['schemas']['SetGymMembershipStatusRequestDto']`
  - `components['schemas']['SetMembershipAutoRollRequestDto']`
  - `components['schemas']['GetClassScheduleResponseDto']` (now with `planExpiresAt`)

Already generated and reused as-is: `CreateMembershipPlanDto`, `CreateMembershipPlanResponseDto`, `UpdateMembershipPlanDto`, `UpdateMembershipPlanResponseDto`, `ArchiveMembershipPlanResponseDto`.

- [ ] **Step 1: Start the backend so the live schema is available**

Run: `cd backend && npm run start:dev`
Expected: http://localhost:3000/api-docs loads.

- [ ] **Step 2: Regenerate**

Run: `cd frontend && npm run generate:api-types`
Expected: exits 0 and `frontend/types/api.gen.ts` is rewritten.

- [ ] **Step 3: Confirm each new schema landed**

Run:

```bash
cd frontend && grep -n "MembershipPlanItemDto:\|GetMembershipPlansResponseDto:\|AthleteMembershipResponseDto:\|GymMembershipStatusResponseDto:\|ExtendMembershipRequestDto:\|AssignMembershipPlanRequestDto:\|SetGymMembershipStatusRequestDto:\|SetMembershipAutoRollRequestDto:" types/api.gen.ts
```

Expected: all eight appear.

Then check the nullable fields survived as real types:

```bash
cd frontend && grep -n -A 3 "membershipStatus\|planExpiresAt" types/api.gen.ts | head -40
```

Expected: `planName: string | null`, `expiresAt: string | null`, `planExpiresAt: string | null`, and `membershipStatus: "active" | "expiring" | "expired" | "inactive"`. If any reads `Record<string, never> | null`, the corresponding `@ApiProperty` is missing its explicit `type:` — go back and fix the DTO, then regenerate.

- [ ] **Step 4: Typecheck the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean. `GetClassScheduleResponseDto` gained a required field, so consumers that construct that object in tests may need `planExpiresAt: null` added — fix those.

- [ ] **Step 5: Run the frontend suite**

Run: `cd frontend && npm test`
Expected: green. Any suite whose mock schedule/member fixtures now miss required fields needs them added.

- [ ] **Step 6: Commit**

```bash
git add frontend/types/api.gen.ts
git commit -m "chore(frontend): regenerate api types for membership plans"
```

---

### Task 10: Gym Settings → Plans tab

**Files:**
- Create: `frontend/app/gym-settings/PlansTab.tsx`
- Modify: `frontend/app/gym-settings/gym-settings.styles.ts`
- Modify: `frontend/app/gym-settings/SettingsTabBar.tsx`
- Modify: `frontend/app/gym-settings/index.tsx`
- Test: `frontend/__tests__/PlansTab.test.tsx`

**Interfaces:**
- Consumes (all from Task 9): `MembershipPlanItemDto`, `GetMembershipPlansResponseDto`, `CreateMembershipPlanDto`, `CreateMembershipPlanResponseDto`, `UpdateMembershipPlanDto`, `UpdateMembershipPlanResponseDto`, `ArchiveMembershipPlanResponseDto`, plus `ClassTypeItemDto` / `GetClassTypesResponseDto` for the multi-select labels.
- Produces: `export function PlansTab({ gymId, token, isMobile }: PlansTabProps)` and `ActiveTab` gains `'plans'`.

**Endpoints used:**
- `GET /api/gyms/:gymId/configuration/membership-plans` (Task 3)
- `GET /api/gyms/:gymId/configuration/class-types` (existing — for the class-type picker labels)
- `POST /api/gyms/:gymId/configuration/membership-plans`
- `PATCH /api/gyms/:gymId/configuration/membership-plans/:membershipPlanId`
- `POST /api/gyms/:gymId/configuration/membership-plans/:membershipPlanId/archive`

**Design notes:**
- Follow `SpacesTab.tsx` exactly for shape: Empty / Table (desktop) / CardList (mobile) / Form subcomponents, one `styles` import from `gym-settings.styles.ts`, `createApiClient({ token })`, `Alert.alert` for the destructive confirm, and the loading / error / retry branches.
- **One Accent Rule:** the only crimson on this view is the single "Add Plan" primary button (or "Save" while the form is open). Per-row Edit is `quiet`; per-row Archive is `variant="danger"` (`Status.danger`, the second red — never the accent).
- **Class-type multi-select:** `FilterChips` is single-select and cannot express this. Use the `metricPill` / `metricPillSelected` pattern from `ClassTypesTab.tsx` — `Ink.strong` background and `Ink.inverse` text when selected. That keeps selection monochrome so the accent stays on the primary action.
- **Archived plans** stay in the list with `<StatusChip tone="neutral" label="Archived" />` and no Archive button.
- **Archive confirm copy must name the subscriber count** (the spec's warning): `You have N members on this plan. They keep it until it expires, but nobody new can be assigned to it.` Use `subscriberCount` from the DTO.
- Price is stored in cents; render as `$${(pricing / 100).toFixed(2)}` and parse input dollars back with `Math.round(parseFloat(value) * 100)`.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/PlansTab.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => mockApiClient,
}));

import { PlansTab } from '@/app/gym-settings/PlansTab';

const DEFAULT_PROPS = { gymId: 'gym-abc', token: 'test-token', isMobile: false };

function buildPlan(overrides = {}) {
  return {
    id: 'plan-1',
    name: 'Unlimited',
    pricing: 12000,
    billingCycle: 'monthly',
    classTypes: ['ct-1'],
    status: 'active',
    subscriberCount: 14,
    ...overrides,
  };
}

function mockResponses(plans: unknown[]) {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.includes('/membership-plans')) return Promise.resolve({ plans });
    if (url.includes('/class-types')) {
      return Promise.resolve({
        classTypes: [
          { id: 'ct-1', name: 'WOD', resultLoggable: true, resultMetric: 'time' },
          { id: 'ct-2', name: 'Yoga', resultLoggable: false, resultMetric: null },
        ],
      });
    }
    return Promise.resolve({});
  });
}

describe('PlansTab', () => {
  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('lists plans with price, cycle, class types and subscriber count', async () => {
    mockResponses([buildPlan()]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Unlimited')).toBeTruthy();
    expect(screen.getByText('$120.00')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('WOD')).toBeTruthy();
    expect(screen.getByText('14 members')).toBeTruthy();
  });

  it('shows the empty state when the gym has no plans', async () => {
    mockResponses([]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('No membership plans yet')).toBeTruthy();
  });

  it('marks an archived plan and hides its archive action', async () => {
    mockResponses([buildPlan({ status: 'archived' })]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Archived')).toBeTruthy();
    expect(screen.queryByTestId('plan-archive-btn-plan-1')).toBeNull();
  });

  it('creates a plan from the form, sending cents', async () => {
    mockResponses([]);
    mockApiClient.post.mockResolvedValue({ id: 'plan-new' });

    render(<PlansTab {...DEFAULT_PROPS} />);

    fireEvent.press(await screen.findByTestId('add-plan-btn'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Basic');
    fireEvent.changeText(screen.getByTestId('plan-price-input'), '75.50');
    fireEvent.press(screen.getByTestId('plan-class-type-pill-ct-1'));
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans',
        {
          name: 'Basic',
          pricing: 7550,
          billingCycle: 'monthly',
          classTypes: ['ct-1'],
        },
      );
    });
  });

  it('refuses to save a plan with no class types selected', async () => {
    mockResponses([]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    fireEvent.press(await screen.findByTestId('add-plan-btn'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Basic');
    fireEvent.changeText(screen.getByTestId('plan-price-input'), '75.50');
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  it('edits an existing plan', async () => {
    mockResponses([buildPlan()]);
    mockApiClient.patch.mockResolvedValue({ id: 'plan-1' });

    render(<PlansTab {...DEFAULT_PROPS} />);

    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('plan-edit-btn-plan-1'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Unlimited Plus');
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans/plan-1',
        expect.objectContaining({ name: 'Unlimited Plus' }),
      );
    });
  });

  it('renders an error with a retry action when loading fails', async () => {
    mockApiClient.get.mockRejectedValue(new Error('Network down'));

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});
```

This suite renders desktop only via `isMobile: false`, so it does not need the `useResponsiveLayout` register pin — `PlansTab` takes `isMobile` as a prop rather than reading the hook. Add a second `isMobile: true` render assertion only if you introduce mobile-only copy.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd frontend && npx jest __tests__/PlansTab.test.tsx`
Expected: FAIL — cannot resolve `@/app/gym-settings/PlansTab`.

- [ ] **Step 3: Add the styles**

In `frontend/app/gym-settings/gym-settings.styles.ts`, add these keys (reuse the existing `colName`, `colActions`, `colActionsRow`, `table`, `tableHeader`, `tableRow`, `metricPill`, `metricPillSelected`, `content`, `sectionRow`, `addBtnWrap`, `formCard`, `fieldGroup`, `input`, `formBtnRow`, `formBtnWrap`, `entityCard*`, `emptyContainer`, `emptyIcon`, `emptyDesc`, `emptyBtnWrap`, `feedbackContainer`, `errorText`, `retryBtn` — only these are new):

```ts
  colPrice: {
    width: 110,
  },
  colCycle: {
    width: 110,
  },
  colClassTypes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs,
  },
  colSubscribers: {
    width: 110,
  },
  planCardList: {
    gap: Space.md,
  },
  planCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  planClassTypeTag: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.hair,
  },
```

`Space` exports `hair | xs | sm | md | base | lg | xl | xxl | jumbo` and `Radius` exports `chip | control | card | sheet` — use only those. `gym-settings.styles.ts` already imports `Space`, `Radius`, `Line`, `Ink`, and `Ground`, so no new imports are needed.

- [ ] **Step 4: Write PlansTab**

Create `frontend/app/gym-settings/PlansTab.tsx`, mirroring `SpacesTab.tsx`'s structure. It must contain:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';
import { styles } from './gym-settings.styles';

type MembershipPlan = components['schemas']['MembershipPlanItemDto'];
type GetMembershipPlansResponse = components['schemas']['GetMembershipPlansResponseDto'];
type ClassTypeItem = components['schemas']['ClassTypeItemDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type CreateMembershipPlanDto = components['schemas']['CreateMembershipPlanDto'];
type CreateMembershipPlanResponse = components['schemas']['CreateMembershipPlanResponseDto'];
type UpdateMembershipPlanDto = components['schemas']['UpdateMembershipPlanDto'];
type UpdateMembershipPlanResponse = components['schemas']['UpdateMembershipPlanResponseDto'];
type ArchiveMembershipPlanResponse = components['schemas']['ArchiveMembershipPlanResponseDto'];

type FormMode = 'add' | 'edit' | null;

const BILLING_CYCLES: { value: 'monthly' | 'annual'; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parsePrice(value: string): number {
  return Math.round(parseFloat(value) * 100);
}

function cycleLabel(cycle: 'monthly' | 'annual'): string {
  return cycle === 'annual' ? 'Annual' : 'Monthly';
}

function classTypeNames(ids: string[], classTypes: ClassTypeItem[]): string[] {
  return ids.map(
    (id) => classTypes.find((classType) => classType.id === id)?.name ?? 'Unknown',
  );
}
```

Then, following `SpacesTab.tsx` component-for-component:

- `EmptyPlans({ onAddPress })` — `Icon name="members" size={28} tone="faint"` (the `Icon` name union is closed — pick from `frontend/components/cleanink/Icon.tsx`, do not add a new key), heading `No membership plans yet`, body `Add your first plan so athletes can be put on one.`, and one `Button testID="add-plan-btn" label="Add Plan" variant="primary"`.
- `PlansTable({ plans, classTypes, onEdit, onArchive, onAddPress })` — header cells NAME / PRICE / CYCLE / CLASS TYPES / MEMBERS / ACTIONS via `styles.colName`, `styles.colPrice`, `styles.colCycle`, `styles.colClassTypes`, `styles.colSubscribers`, `styles.colActions`; per row: name (`tone="strong"`), `formatPrice(plan.pricing)`, `cycleLabel(plan.billingCycle)`, each class-type name in a `styles.planClassTypeTag` wrapper with `size="meta" tone="muted"`, `` `${plan.subscriberCount} members` ``, then in `styles.colActionsRow` a `Button testID={`plan-edit-btn-${plan.id}`} label="Edit" variant="quiet"` and — only when `plan.status === 'active'` — a `Button testID={`plan-archive-btn-${plan.id}`} label="Archive" variant="danger"`. When `plan.status === 'archived'` render `<StatusChip tone="neutral" label="Archived" />` in the actions cell instead.
- `PlanCard` + `PlansCardList` — the mobile equivalents, same data and same testIDs, using `styles.entityCard*` and `styles.planCardList` / `styles.planCardMetaRow`.
- `PlanForm({ mode, initialPlan, classTypes, isSaving, onSave, onCancel })` — local state for `name`, `price` (dollar string), `billingCycle`, `selectedClassTypeIds: string[]`. Fields: `TextInput testID="plan-name-input"`, `TextInput testID="plan-price-input" keyboardType="decimal-pad"`, billing-cycle pills (`testID={`plan-cycle-pill-${value}`}`) and class-type pills (`testID={`plan-class-type-pill-${classType.id}`}`) — both using `[styles.metricPill, isSelected && styles.metricPillSelected]` with `tone={isSelected ? Ink.inverse : Ink.muted}`. Class-type pills toggle membership in the array. Validation before calling `onSave`, each via `Alert.alert('Validation', ...)`:
  - trimmed name is required → `'Plan name is required.'`
  - price must parse and be `>= 0` → `'Price must be a number.'`
  - at least one class type → `'Select at least one class type.'`

  Then `onSave({ name: trimmedName, pricing: parsePrice(price), billingCycle, classTypes: selectedClassTypeIds })`. Buttons: `plan-form-save-btn` (`variant="primary"`, `loading={isSaving}`) and `plan-form-cancel-btn` (`variant="quiet"`).
- `PlansTab({ gymId, token, isMobile })` — `plans`, `classTypes`, `isLoading`, `error`, `formMode`, `editingPlan`, `isSaving` state. `fetchData` does both GETs (`Promise.all`) and sets `plans`/`classTypes`. `handleArchivePress(plan)` uses:

```tsx
    Alert.alert(
      'Archive Plan',
      plan.subscriberCount > 0
        ? `You have ${plan.subscriberCount} members on this plan. They keep it until it expires, but nobody new can be assigned to it.`
        : `Archive "${plan.name}"? Nobody new can be assigned to it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = createApiClient({ token });
              await client.post<ArchiveMembershipPlanResponse>(
                `/api/gyms/${gymId}/configuration/membership-plans/${plan.id}/archive`,
                {},
              );
              await fetchData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to archive plan';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
```

`handleSave` posts `CreateMembershipPlanDto` on `'add'` and patches `UpdateMembershipPlanDto` on `'edit'`, both with `body as unknown as Record<string, unknown>`, then clears the form and refetches. Render branches in `SpacesTab`'s order: loading spinner → error + retry → form → empty → mobile card list → desktop table.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd frontend && npx jest __tests__/PlansTab.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: Register the tab**

In `frontend/app/gym-settings/SettingsTabBar.tsx`:

```ts
export type ActiveTab = 'spaces' | 'class-types' | 'plans' | 'booking-rules' | 'profile';

const TABS: { value: ActiveTab; label: string }[] = [
  { value: 'spaces', label: 'Spaces' },
  { value: 'class-types', label: 'Class Types' },
  { value: 'plans', label: 'Plans' },
  { value: 'booking-rules', label: 'Booking Rules' },
  { value: 'profile', label: 'Profile' },
];
```

This makes five tabs in one `SegmentedToggle`. Check at 390×844 whether five labels still fit — if they crowd, that is a real design decision (scrollable segmented row vs. shorter labels), so raise it at the Step 8 live review rather than shortening a label unilaterally.

`SettingsSidebar.tsx` needs **no change**: its `NAV_ITEMS` are top-level app destinations, not settings tabs, and Settings is already present and active there.

In `frontend/app/gym-settings/index.tsx`, import `PlansTab` and add a branch to the ternary chain immediately after the `class-types` pair, matching the existing shape exactly:

```tsx
          ) : activeTab === 'plans' && token && currentGymId ? (
            <PlansTab gymId={currentGymId} token={token} isMobile={isMobile} />
          ) : activeTab === 'plans' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={Ink.strong} />
            </View>
```

- [ ] **Step 7: Typecheck and run the frontend suite**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean, all green. If a gym-settings suite asserts the exact tab list, update it to include Plans.

- [ ] **Step 8: Live screenshot review at both registers**

Start the app (`cd frontend && npm run web`), log in as `owner@example.com` / `password123`, go to Gym Settings → Plans, and capture the tab at **1280×832** and **390×844**. Check against `frontend/DESIGN.md`:
- exactly one crimson element in view (Add Plan, or Save while the form is open)
- per-row Edit is quiet; Archive is the distinct `Status.danger` red
- structure reads from hairlines and tone, no shadows
- selected pills are monochrome `Ink.strong` / `Ink.inverse`
- no green confirmation banner anywhere

Exercise create, edit, and archive live. Confirm the archive dialog names the subscriber count.

- [ ] **Step 9: Commit**

```bash
git add frontend/app/gym-settings/PlansTab.tsx \
        frontend/app/gym-settings/gym-settings.styles.ts \
        frontend/app/gym-settings/SettingsTabBar.tsx \
        frontend/app/gym-settings/index.tsx \
        frontend/__tests__/PlansTab.test.tsx
git commit -m "feat(frontend): add the membership Plans tab to gym settings"
```

---

### Task 11: Members list — plan, expiry, real status, search

**Files:**
- Modify: `frontend/app/members.tsx`
- Modify: `frontend/app/members.styles.ts`
- Test: `frontend/__tests__/members.test.tsx` (create if absent, extend if present)

**Interfaces:**
- Consumes: `components['schemas']['GymMemberItemDto']` from Task 9 — now carrying `planName`, `expiresAt`, `membershipStatus`, `autoRoll`, `autoRollCount`.
- Produces (Task 12 consumes these):
  - `export function membershipChipProps(status: GymMember['membershipStatus']): { tone: ChipTone; label: string }`
  - `MembersScreen` calls `onSelectMember(member)` from both `MemberRow` and `MemberCard` — Task 12 wires the panel to it.

**What changes:**
- `MemberRow` / `MemberCard` currently hardcode `<StatusChip tone="open" label="Active" />`. They must render the derived status instead, via `membershipChipProps`.
- Desktop table gains PLAN and EXPIRES columns between EMAIL and STATUS. Mobile card gains a plan + expiry meta line.
- A search bar filters by name or email, client-side, case-insensitive. Present at **both** registers (the spec asked for it on mobile; there is no reason to withhold it on desktop).
- **The spec's "Add button" is dropped, deliberately.** Athletes join by registering against the gym or by accepting an invite; there is no owner-side create-member endpoint, and inviting already lives on `/invites`. An "Add" button here would either dead-end or duplicate that screen. Flag this at the live review if the user wants a shortcut to `/invites` instead.
- The count badge reflects the filtered count.
- Rows and cards become pressable and call `onSelectMember`.
- **Spec decision 13 — the forgotten-leaver surface.** A member whose `autoRollCount > 0` has renewed without the owner confirming. That must be visible on the *list*, not only in the panel, or the failure mode auto-roll accepts stays silent. Render a quiet `↻ N` marker after the plan name (`Ink.faint`, `size="meta"`, no accent, no chip) whenever `autoRollCount > 0`. It is deliberately understated: it is information, not an alarm.

**Status → chip mapping (fixed; no amber token exists):**

| `membershipStatus` | tone | label |
| --- | --- | --- |
| `active` | `open` | `Active` |
| `expiring` | `neutral` | `Expiring` |
| `expired` | `danger` | `Expired` |
| `inactive` | `neutral` | `Suspended` |

`expiring` and `inactive` both land on `neutral` because Clean Ink has no amber. That is a known compromise — **flag it at the Step 7 live review** rather than inventing a colour. `Status.open` green stays reserved for genuinely open/available status, which `active` is.

- [ ] **Step 1: Write the failing tests**

If `frontend/__tests__/members.test.tsx` exists, extend it. If not, create it:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

let mockIsMobile = false;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

const mockApiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };

jest.mock('@/utils/api-client', () => ({ createApiClient: () => mockApiClient }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-abc' }) }));

import MembersScreen from '@/app/members';

function buildMember(overrides = {}) {
  return {
    id: 'gm-1',
    userId: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: 'active',
    joinedAt: '2026-01-15T10:00:00.000Z',
    planId: 'plan-1',
    planName: 'Unlimited',
    // Midday, not UTC midnight: the screen formats in local time, so a midnight
    // timestamp renders as the previous day for anyone west of Greenwich and the
    // assertions below would fail on their machine but pass in CI.
    expiresAt: '2026-09-01T12:00:00.000Z',
    membershipStatus: 'active',
    autoRoll: true,
    autoRollCount: 2,
    ...overrides,
  };
}

describe('MembersScreen', () => {
  beforeEach(() => {
    mockIsMobile = false;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('shows the plan name and expiry on desktop', async () => {
    mockApiClient.get.mockResolvedValue({ members: [buildMember()] });

    render(<MembersScreen />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Unlimited')).toBeTruthy();
    expect(screen.getByText('Sep 1, 2026')).toBeTruthy();
  });

  it('renders each derived membership status with its own chip label', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Ann Active', membershipStatus: 'active' }),
        buildMember({ id: 'gm-2', name: 'Ed Expiring', membershipStatus: 'expiring' }),
        buildMember({ id: 'gm-3', name: 'Xan Expired', membershipStatus: 'expired' }),
        buildMember({ id: 'gm-4', name: 'Sam Suspended', membershipStatus: 'inactive' }),
      ],
    });

    render(<MembersScreen />);

    expect(await screen.findByText('Active')).toBeTruthy();
    expect(screen.getByText('Expiring')).toBeTruthy();
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('marks a member whose plan auto-renewed without owner confirmation', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Ann Confirmed', autoRollCount: 0 }),
        buildMember({ id: 'gm-2', name: 'Roy Rolled', autoRollCount: 3 }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Roy Rolled');
    expect(screen.getByTestId('member-autoroll-gm-2')).toBeTruthy();
    expect(screen.getByText('↻ 3')).toBeTruthy();
    expect(screen.queryByTestId('member-autoroll-gm-1')).toBeNull();
  });

  it('shows a dash for a member with no plan', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ planId: null, planName: null, expiresAt: null, membershipStatus: 'expired' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows Unlimited for a plan with no expiry', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [buildMember({ expiresAt: null })],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getByText('No expiry')).toBeTruthy();
  });

  it('filters by name and updates the count badge', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@example.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getByText('2 members')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('members-search-input'), 'john');

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('1 member')).toBeTruthy();
  });

  it('filters by email too', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe', email: 'jane@example.com' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@other.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('members-search-input'), 'other.com');

    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.queryByText('Jane Doe')).toBeNull();
  });

  it('renders the mobile card with plan and expiry', async () => {
    mockIsMobile = true;
    mockApiClient.get.mockResolvedValue({ members: [buildMember()] });

    render(<MembersScreen />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Unlimited · Expires Sep 1, 2026')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd frontend && npx jest __tests__/members.test.tsx`
Expected: FAIL — no plan column, no search input, and every chip reads `Active`.

- [ ] **Step 3: Add the styles**

In `frontend/app/members.styles.ts`, add:

```ts
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  searchInput: {
    flex: 1,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
    color: Ink.strong,
  },

  // New columns
  colPlan: {
    width: 140,
    height: '100%',
    justifyContent: 'center',
  },
  colPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  colExpires: {
    width: 120,
    height: '100%',
    justifyContent: 'center',
  },

  // Mobile card meta
  memberCardPlan: {
    marginTop: Space.hair,
  },
```

`members.styles.ts` currently imports `Ground, Line, Radius, Space, Elevation` — widen the import to include `Ink`.

- [ ] **Step 4: Add the status mapping and date helper**

In `frontend/app/members.tsx`, add `TextInput` to the react-native import, `ChipTone` to the cleanink import, and these helpers next to `formatJoinedDate`:

```tsx
type MembershipStatus = GymMember['membershipStatus'];

const MEMBERSHIP_CHIP: Record<MembershipStatus, { tone: ChipTone; label: string }> = {
  // No amber token exists in Clean Ink, so 'expiring' shares 'neutral' with
  // 'inactive'. Status.open green stays reserved for genuinely open status.
  active: { tone: 'open', label: 'Active' },
  expiring: { tone: 'neutral', label: 'Expiring' },
  expired: { tone: 'danger', label: 'Expired' },
  inactive: { tone: 'neutral', label: 'Suspended' },
};

export function membershipChipProps(status: MembershipStatus) {
  return MEMBERSHIP_CHIP[status] ?? MEMBERSHIP_CHIP.expired;
}

function formatExpiry(isoDate: string | null): string {
  if (!isoDate) return 'No expiry';
  return formatJoinedDate(isoDate);
}
```

`ChipTone` is already re-exported from `@/components/cleanink` (see `components/cleanink/index.ts`), so `import { StatusChip, Text, type ChipTone } from '@/components/cleanink';` resolves as-is.

- [ ] **Step 5: Update the table and cards**

In `TableHeaderRow`, add two header cells between EMAIL and JOINED:

```tsx
      <View style={styles.colPlan}>
        <Text size="label" weight="semibold" tone="muted" upper>PLAN</Text>
      </View>
      <View style={styles.colExpires}>
        <Text size="label" weight="semibold" tone="muted" upper>EXPIRES</Text>
      </View>
```

`MemberRow` takes `onPress: () => void`, wraps its content in `<TouchableOpacity testID={`member-row-${member.id}`} style={[styles.drow, isAlternate && styles.drowAlt]} onPress={onPress} activeOpacity={0.7}>` instead of the plain `View`, adds the two cells, and swaps the hardcoded chip:

```tsx
      <View style={styles.colPlan}>
        <View style={styles.colPlanRow}>
          <Text size="body" tone="muted" numberOfLines={1}>{member.planName ?? '—'}</Text>
          {member.autoRollCount > 0 && (
            <Text
              size="meta"
              tone="faint"
              testID={`member-autoroll-${member.id}`}>
              {`↻ ${member.autoRollCount}`}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.colExpires}>
        <Text size="body" tone="muted">{member.planName ? formatExpiry(member.expiresAt) : '—'}</Text>
      </View>
```

```tsx
      <View style={styles.colStatus}>
        <StatusChip {...membershipChipProps(member.membershipStatus)} />
      </View>
```

`MemberCard` likewise takes `onPress`, becomes a `TouchableOpacity testID={`member-card-${member.id}`}`, uses the same `StatusChip {...membershipChipProps(...)}`, and gains a plan line under the joined line:

```tsx
      <Text size="meta" tone="muted" style={styles.memberCardPlan}>
        {member.planName
          ? `${member.planName} · ${member.expiresAt ? `Expires ${formatExpiry(member.expiresAt)}` : 'No expiry'}`
          : 'No plan'}
      </Text>
```

- [ ] **Step 6: Add search and filtering to the screen**

In `MembersScreen`, add `const [search, setSearch] = useState('');` and the derived list:

```tsx
  const query = search.trim().toLowerCase();
  const visibleMembers = query
    ? members.filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query),
      )
    : members;
```

Change the count badge to pluralise off the filtered list:

```tsx
            <Text size="meta" weight="medium" tone="muted">
              {isLoading
                ? '…'
                : `${visibleMembers.length} ${visibleMembers.length === 1 ? 'member' : 'members'}`}
            </Text>
```

Add the search row directly under the page header, at both registers:

```tsx
        <View style={styles.searchRow}>
          <TextInput
            testID="members-search-input"
            style={styles.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor={Ink.faint}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
```

Replace every `members` reference in the render branches with `visibleMembers`, keeping the `members.length === 0` empty state as-is (a search that matches nothing should show the empty card too, so `visibleMembers.length === 0` is the right condition there — use it).

Pass `onPress` through both list branches. For now it may be a no-op `() => {}`; Task 12 replaces it with the panel opener:

```tsx
              <MemberCard key={member.id} member={member} onPress={() => {}} />
```

```tsx
                <MemberRow key={member.id} member={member} isAlternate={idx === 0} onPress={() => {}} />
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `cd frontend && npx jest __tests__/members.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 8: Typecheck and run the frontend suite**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean, all green.

- [ ] **Step 9: Live screenshot review at both registers**

Log in as the owner, open Members, capture **1280×832** and **390×844**. Check:
- the four chip states are visually distinguishable — **and explicitly note in the review whether `Expiring` and `Suspended` sharing `neutral` is acceptable**, since that is the known amber gap. Do not add a colour without the user's decision.
- no crimson in view. This screen has no primary action: there is **no "Add member" button**, because members join by registering against the gym and no owner-side create-member endpoint exists. Do not add one. The One Accent Rule allows zero accents in a view; the single crimson on this screen arrives in Task 12 as the panel's Save.
- hairline table structure, no shadows beyond the existing card elevation
- search filters live and the count badge follows

- [ ] **Step 10: Commit**

```bash
git add frontend/app/members.tsx frontend/app/members.styles.ts frontend/__tests__/members.test.tsx
git commit -m "feat(frontend): show plan, expiry and real status on the members list"
```

---

### Task 12: Member details panel — the four owner actions

**Files:**
- Create: `frontend/components/MemberDetailsPanel.tsx`
- Create: `frontend/components/MemberDetailsPanel.styles.ts`
- Modify: `frontend/app/members.tsx` (replace the Task 11 no-op `onPress` with the panel opener)
- Test: `frontend/__tests__/MemberDetailsPanel.test.tsx`

The panel lives in `components/`, **not** under `app/members/` — a directory under `app/` would become an expo-router route.

**Interfaces:**
- Consumes: `membershipChipProps` exported from `frontend/app/members.tsx` (Task 11); `GymMemberItemDto` fields `planName`, `planId`, `expiresAt`, `membershipStatus`, `autoRoll`, `autoRollCount`; the four endpoints from Tasks 5–7; the plans list from Task 3's `GET /api/gyms/:gymId/configuration/membership-plans`.
- Produces:

```ts
export interface MemberDetailsPanelProps {
  member: GymMember;
  onClose: () => void;
  onChanged: () => void; // parent refetches the members list
}
export function MemberDetailsPanel(props: MemberDetailsPanelProps): JSX.Element;
```

**Endpoint map (all four, exactly as built in Tasks 5–7):**

| Action | Method + path | Body |
| --- | --- | --- |
| Extend expiry | `PATCH /api/gyms/:gymId/members/:membershipId/membership/expiry` | `{ expiresAt: string }` |
| Change plan | `PUT /api/gyms/:gymId/members/:membershipId/membership/plan` | `{ membershipPlanId: string }` |
| Auto-renew | `PATCH /api/gyms/:gymId/members/:membershipId/membership/auto-roll` | `{ autoRoll: boolean }` |
| Suspend / resume | `PATCH /api/gyms/:gymId/members/:membershipId/status` | `{ status: 'active' \| 'inactive' }` |

**Design constraints (binding):**
- **One crimson only.** The single `variant="primary"` in the panel is **Save changes**. Everything else is `quiet`, except Suspend which is `variant="danger"` (Two Reds Rule — `Status.danger`, never the accent).
- Two registers: desktop = a fixed-width right-hand side panel with a hairline left border; mobile = a `Modal` bottom sheet with a dim backdrop and a drag handle, mirroring `SelectField`'s sheet.
- No success banner. After a save, show the quiet meta line `Saved` and call `onChanged()`.
- The auto-renew control reuses the `toggleTrack` / `toggleThumb` pattern from `gym-settings.styles.ts` (monochrome; active = `Ink.strong`) — copy those style keys into `MemberDetailsPanel.styles.ts` rather than importing across screens.
- Plan picker is `SelectField` — props `{ label, items, selectedId, onSelect, fetchState }`, `items: SelectItem[]` = `{ id, label }`. It handles its own mobile sheet, so the panel needs no extra work there. `SelectField` renders its desktop menu as an absolute overlay, so the plan field must sit **above** later rows in the panel's stacking order — put it directly under the header and give the rows below it no `zIndex`.
- Expiry is a plain `TextInput` accepting `YYYY-MM-DD` (there is no date-picker dependency in this project — do not add one). Validate the shape client-side and surface the backend's message on rejection.
- **The one-cycle default lives here.** Beside the expiry input sits a `quiet` "＋1 cycle" button that fills the input with `max(expiresAt, today) + billingCycle` for the member's current plan. This is the everyday renewal gesture; typing a date is the exception. Extending clears `autoRollCount` server-side (Task 5), so the panel's count line will read `Renewed 0 times` after the parent refetches.

- [ ] **Step 1: Write the failing tests**

Create `frontend/__tests__/MemberDetailsPanel.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

let mockIsMobile = false;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

const mockApiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };

jest.mock('@/utils/api-client', () => ({ createApiClient: () => mockApiClient }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-abc' }) }));

import { MemberDetailsPanel } from '@/components/MemberDetailsPanel';

/**
 * The +1-cycle default and the past-date guard both compare against "now", so
 * the fixture's expiry is pinned relative to today rather than hardcoded — a
 * hardcoded date would silently start testing the lapsed branch once real time
 * passed it. Fake timers are deliberately avoided: they deadlock `waitFor`,
 * which polls on real timers.
 */
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const FUTURE_EXPIRY = new Date(Date.now() + YEAR_MS);
const FUTURE_EXPIRY_ISO = FUTURE_EXPIRY.toISOString();

function oneMonthAfter(date: Date): string {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

const member = {
  id: 'gm-1',
  userId: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  status: 'active' as const,
  joinedAt: '2026-01-15T10:00:00.000Z',
  planId: 'plan-1',
  planName: 'Unlimited',
  expiresAt: FUTURE_EXPIRY_ISO,
  membershipStatus: 'active' as const,
  autoRoll: true,
  autoRollCount: 2,
};

const plansResponse = {
  plans: [
    { id: 'plan-1', name: 'Unlimited', pricing: 15000, billingCycle: 'monthly', classTypes: [], status: 'active', subscriberCount: 4 },
    { id: 'plan-2', name: '3x / week', pricing: 11000, billingCycle: 'monthly', classTypes: [], status: 'active', subscriberCount: 2 },
  ],
};

function renderPanel(overrides = {}) {
  const onClose = jest.fn();
  const onChanged = jest.fn();
  render(
    <MemberDetailsPanel member={{ ...member, ...overrides }} onClose={onClose} onChanged={onChanged} />,
  );
  return { onClose, onChanged };
}

describe('MemberDetailsPanel', () => {
  beforeEach(() => {
    mockIsMobile = false;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
    mockApiClient.get.mockResolvedValue(plansResponse);
  });

  it('shows the member name, current plan and auto-renew count', async () => {
    renderPanel();

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
    expect(screen.getByText('Renewed 2× since you last confirmed')).toBeTruthy();
  });

  it('extends the expiry date', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '2030-12-31');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/expiry',
        { expiresAt: '2030-12-31' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('fills one billing cycle past the current expiry when +1 cycle is pressed', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-add-cycle-btn'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    // The plan is monthly and the fixture expiry is a year out, so the cycle
    // runs from the expiry (not from today) and lands one month later.
    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/expiry',
        { expiresAt: oneMonthAfter(FUTURE_EXPIRY) },
      );
    });
  });

  it('rejects a malformed expiry date without calling the API', async () => {
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '31/12/2026');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    expect(await screen.findByText('Use the format YYYY-MM-DD.')).toBeTruthy();
    expect(mockApiClient.patch).not.toHaveBeenCalled();
  });

  it('assigns a different plan', async () => {
    mockApiClient.put.mockResolvedValue({ id: 'amp-2' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-plan-select'));
    fireEvent.press(screen.getByText('3x / week'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/plan',
        { membershipPlanId: 'plan-2' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('toggles auto-renew off', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-auto-roll-toggle'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/auto-roll',
        { autoRoll: false },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('suspends an active member', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'gm-1', status: 'inactive' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-suspend-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/status',
        { status: 'inactive' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('offers Resume for a suspended member', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'gm-1', status: 'active' });
    renderPanel({ status: 'inactive', membershipStatus: 'inactive' });

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-resume-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/status',
        { status: 'active' },
      );
    });
  });

  it('sends only the fields that changed', async () => {
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
    expect(mockApiClient.patch).not.toHaveBeenCalled();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  it('surfaces a backend error message', async () => {
    mockApiClient.patch.mockRejectedValue(new Error('Membership expiry must be in the future'));
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '2020-01-01');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    expect(await screen.findByText('Membership expiry must be in the future')).toBeTruthy();
  });

  it('hides the plan and expiry controls for a member with no plan', async () => {
    renderPanel({ planId: null, planName: null, expiresAt: null, membershipStatus: 'expired' });

    await screen.findByText('Jane Doe');
    expect(screen.queryByTestId('member-expiry-input')).toBeNull();
    expect(screen.getByTestId('member-plan-select')).toBeTruthy();
    expect(screen.getByText('No plan assigned')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd frontend && npx jest __tests__/MemberDetailsPanel.test.tsx`
Expected: FAIL — `Cannot find module '@/components/MemberDetailsPanel'`.

- [ ] **Step 3: Write the styles**

Create `frontend/components/MemberDetailsPanel.styles.ts`:

```ts
import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Elevation, Status } from '@/constants/design';

export const styles = StyleSheet.create({
  // ── Desktop side panel ────────────────────────────────────────────────────
  panel: {
    width: 380,
    backgroundColor: Ground.surface,
    borderLeftWidth: 1,
    borderLeftColor: Line.divider,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.lg,
    gap: Space.lg,
  },

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.45)',
  },
  sheet: {
    backgroundColor: Ground.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Space.sm,
    paddingBottom: Space.xl,
    paddingHorizontal: Space.base,
    maxHeight: '85%',
    gap: Space.base,
    ...Elevation.raised,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Line.divider,
    marginBottom: Space.xs,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  headerInfo: {
    flex: 1,
    gap: Space.hair,
  },
  closeBtn: {
    padding: Space.xs,
  },

  // ── Field rows ────────────────────────────────────────────────────────────
  field: {
    gap: Space.xs,
  },
  // Lifts the plan picker above the rows below it so SelectField's desktop
  // floating menu overlays them instead of being clipped underneath.
  planField: {
    zIndex: 10,
    ...{ elevation: 10 },
  },
  input: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
    color: Ink.strong,
    minHeight: 46,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  expiryInput: {
    flex: 1,
  },
  inputError: {
    borderColor: Status.danger,
  },

  // ── Auto-renew toggle (monochrome; accent stays on Save) ──────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: Radius.chip,
    backgroundColor: Line.divider,
    padding: Space.hair,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: Ink.strong,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radius.chip,
    backgroundColor: Ground.surface,
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },

  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  actions: {
    gap: Space.sm,
  },
  errorText: {
    marginTop: Space.xs,
  },
});
```

- [ ] **Step 4: Write the panel**

Create `frontend/components/MemberDetailsPanel.tsx`:

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ink, Space, Status } from '@/constants/design';
import {
  Button,
  Icon,
  SelectField,
  StatusChip,
  Text,
  type SelectFetchState,
  type SelectItem,
} from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { membershipChipProps } from '@/app/members';
import type { components } from '@/types/api.gen';
import { styles } from './MemberDetailsPanel.styles';

type GymMember = components['schemas']['GymMemberItemDto'];
type MembershipPlanItem = components['schemas']['MembershipPlanItemDto'];
type GetMembershipPlansResponse = components['schemas']['GetMembershipPlansResponseDto'];

export interface MemberDetailsPanelProps {
  member: GymMember;
  onClose: () => void;
  onChanged: () => void;
}

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const SHEET_TRAVEL = 700;

/** ISO timestamp → the YYYY-MM-DD the expiry input edits. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Try again.';
}

/**
 * The one-cycle renewal default. Extends from max(expiresAt, today) so renewing
 * a plan that lapsed weeks ago gives a full cycle from today rather than a date
 * already in the past — the spec's rule, computed client-side so the server
 * keeps a single "must be in the future" check.
 */
function nextCycleDate(expiresAt: string | null, billingCycle: 'monthly' | 'annual'): string {
  const today = new Date();
  const from = expiresAt && new Date(expiresAt) > today ? new Date(expiresAt) : today;
  const next = new Date(from);
  if (billingCycle === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString().slice(0, 10);
}

export function MemberDetailsPanel({ member, onClose, onChanged }: MemberDetailsPanelProps) {
  const { isMobile } = useResponsiveLayout();
  const { token } = useAuth();
  const { currentGymId } = useGym();

  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [plansState, setPlansState] = useState<SelectFetchState>({ status: 'loading' });

  const [expiryInput, setExpiryInput] = useState(toDateInput(member.expiresAt));
  const [planId, setPlanId] = useState(member.planId ?? '');
  const [autoRoll, setAutoRoll] = useState(member.autoRoll);

  const [isSaving, setIsSaving] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);

  // Re-seed the draft whenever a different member is selected.
  useEffect(() => {
    setExpiryInput(toDateInput(member.expiresAt));
    setPlanId(member.planId ?? '');
    setAutoRoll(member.autoRoll);
    setError(null);
    setSavedAt(false);
  }, [member.id, member.expiresAt, member.planId, member.autoRoll]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      if (!token || !currentGymId) return;
      setPlansState({ status: 'loading' });
      try {
        const client = createApiClient({ token });
        const res = await client.get<GetMembershipPlansResponse>(
          `/api/gyms/${currentGymId}/configuration/membership-plans`,
        );
        if (cancelled) return;
        setPlans(res.plans);
        setPlansState({ status: 'success', data: res.plans });
      } catch (err) {
        if (cancelled) return;
        setPlansState({ status: 'error', message: errorMessage(err) });
      }
    }
    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [token, currentGymId]);

  // Only active plans can be newly assigned; an archived plan a member already
  // holds stays visible in the list so the current selection still resolves.
  // The member's currently-held plan, needed for its billingCycle when the
  // owner presses "+1 cycle".
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === member.planId) ?? null,
    [plans, member.planId],
  );

  const planItems: SelectItem[] = useMemo(
    () =>
      plans
        .filter((plan) => plan.status === 'active' || plan.id === member.planId)
        .map((plan) => ({ id: plan.id, label: plan.name })),
    [plans, member.planId],
  );

  const handleSave = useCallback(async () => {
    if (!token || !currentGymId) return;

    const expiryChanged = Boolean(member.planId) && expiryInput !== toDateInput(member.expiresAt);
    const planChanged = planId !== '' && planId !== (member.planId ?? '');
    const autoRollChanged = autoRoll !== member.autoRoll;

    if (expiryChanged && !DATE_SHAPE.test(expiryInput)) {
      setError('Use the format YYYY-MM-DD.');
      return;
    }

    setError(null);
    setSavedAt(false);

    if (!expiryChanged && !planChanged && !autoRollChanged) {
      setSavedAt(true);
      return;
    }

    setIsSaving(true);
    const client = createApiClient({ token });
    const base = `/api/gyms/${currentGymId}/members/${member.id}`;

    try {
      // Plan first: assigning a plan resets the expiry from the billing cycle,
      // so an explicit expiry edit in the same save must win.
      if (planChanged) {
        await client.put(`${base}/membership/plan`, { membershipPlanId: planId });
      }
      if (expiryChanged) {
        await client.patch(`${base}/membership/expiry`, { expiresAt: expiryInput });
      }
      if (autoRollChanged) {
        await client.patch(`${base}/membership/auto-roll`, { autoRoll });
      }
      setSavedAt(true);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [token, currentGymId, member, expiryInput, planId, autoRoll, onChanged]);

  const handleStatus = useCallback(
    async (next: 'active' | 'inactive') => {
      if (!token || !currentGymId) return;
      setError(null);
      setSavedAt(false);
      setIsStatusSaving(true);
      try {
        const client = createApiClient({ token });
        await client.patch(`/api/gyms/${currentGymId}/members/${member.id}/status`, {
          status: next,
        });
        onChanged();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setIsStatusSaving(false);
      }
    },
    [token, currentGymId, member.id, onChanged],
  );

  const chip = membershipChipProps(member.membershipStatus);
  const isSuspended = member.status === 'inactive';

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text size="title" weight="semibold">{member.name}</Text>
          <Text size="meta" tone="muted">{member.email}</Text>
        </View>
        <StatusChip tone={chip.tone} label={chip.label} />
        <TouchableOpacity
          testID="member-panel-close"
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}>
          <Icon name="close" size={20} tone="muted" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <SelectField
        label="Plan"
        testID="member-plan-select"
        items={planItems}
        selectedId={planId}
        onSelect={setPlanId}
        fetchState={plansState}
        style={styles.planField}
      />

      {member.planId ? (
        <>
          <View style={styles.field}>
            <Text size="label" weight="semibold" tone="faint" upper>Expires</Text>
            <View style={styles.expiryRow}>
              <TextInput
                testID="member-expiry-input"
                style={[styles.input, styles.expiryInput, error ? styles.inputError : null]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Ink.faint}
                value={expiryInput}
                onChangeText={setExpiryInput}
                editable={!isSaving}
                autoCorrect={false}
              />
              <Button
                testID="member-add-cycle-btn"
                label="+1 cycle"
                variant="quiet"
                disabled={isSaving || !currentPlan}
                onPress={() =>
                  currentPlan &&
                  setExpiryInput(nextCycleDate(member.expiresAt, currentPlan.billingCycle))
                }
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text size="label" weight="semibold" tone="faint" upper>Auto-renew</Text>
              <Text size="meta" tone="muted">
                {member.autoRollCount > 0
                  ? `Renewed ${member.autoRollCount}× since you last confirmed`
                  : 'No unconfirmed renewals'}
              </Text>
            </View>
            <TouchableOpacity
              testID="member-auto-roll-toggle"
              style={[styles.toggleTrack, autoRoll && styles.toggleTrackActive]}
              onPress={() => !isSaving && setAutoRoll((prev) => !prev)}
              activeOpacity={0.8}>
              <View style={[styles.toggleThumb, autoRoll && styles.toggleThumbRight]} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text size="meta" tone="muted">No plan assigned</Text>
      )}

      {error ? (
        <Text size="meta" tone="danger" style={styles.errorText}>{error}</Text>
      ) : savedAt ? (
        <Text size="meta" tone="muted" style={styles.errorText}>Saved</Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Button
          testID="member-save-btn"
          label="Save changes"
          variant="primary"
          onPress={handleSave}
          loading={isSaving}
        />
        {isSuspended ? (
          <Button
            testID="member-resume-btn"
            label="Resume membership"
            variant="quiet"
            onPress={() => handleStatus('active')}
            loading={isStatusSaving}
          />
        ) : (
          <Button
            testID="member-suspend-btn"
            label="Suspend membership"
            variant="danger"
            onPress={() => handleStatus('inactive')}
            loading={isStatusSaving}
          />
        )}
      </View>
    </>
  );

  if (!isMobile) {
    return <View style={styles.panel}>{body}</View>;
  }

  return <MemberDetailsSheet onClose={onClose}>{body}</MemberDetailsSheet>;
}

/**
 * Mobile register: a bottom sheet over a dimmed backdrop. The backdrop fades
 * while the sheet slides, matching SelectField's sheet so the two read as one
 * system when a picker opens on top of the panel.
 */
function MemberDetailsSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdropRoot} onPress={onClose}>
        <Animated.View style={[styles.backdropFill, { opacity: anim }]} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_TRAVEL, 0],
                  }),
                },
              ],
            },
          ]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <ScrollView
              contentContainerStyle={{ gap: Space.base, paddingBottom: Space.md }}
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
```

One correction to apply while typing this file: `Text`'s `tone` prop resolves against the `Ink` palette and falls through to the raw string otherwise — `Ink` has no `danger` key, so `tone="danger"` would set the CSS colour to the literal word. Import `Status` alongside `Ink` and `Space` from `@/constants/design` and write the error line as:

```tsx
        <Text size="meta" tone={Status.danger} style={styles.errorText}>{error}</Text>
```

(`Icon name="close"` is in the `IconName` union, so that one is fine as written.)

- [ ] **Step 5: Run the panel tests**

Run: `cd frontend && npx jest __tests__/MemberDetailsPanel.test.tsx`
Expected: PASS (11 tests).

- [ ] **Step 6: Wire the panel into the members screen**

In `frontend/app/members.tsx`, add the selection state and render:

```tsx
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMember = visibleMembers.find((m) => m.id === selectedId) ?? null;
```

Replace both Task 11 no-ops with `onPress={() => setSelectedId(member.id)}`.

Wrap the existing `<View style={styles.main}>` content and the panel in a row so the desktop panel sits beside the table, and render the panel unconditionally on mobile (it is its own Modal):

```tsx
      <View style={styles.contentRow}>
        <View style={[styles.main, isMobile && styles.mainMobile]}>
          {/* existing main content unchanged */}
        </View>
        {selectedMember && (
          <MemberDetailsPanel
            member={selectedMember}
            onClose={() => setSelectedId(null)}
            onChanged={fetchMembers}
          />
        )}
      </View>
```

Add to `frontend/app/members.styles.ts`:

```ts
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
```

`fetchMembers` must be stable enough to pass as `onChanged` — if it is currently defined inline inside the effect, lift it to a `useCallback` and call it from the effect.

- [ ] **Step 7: Run the full frontend suite and typecheck**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean, all green.

- [ ] **Step 8: Live review at both registers**

Log in as the owner, open Members, select a member. At **1280×832** and **390×844** verify:
- exactly one crimson in view (Save changes); Suspend is the deeper `Status.danger` outline and reads as distinct from it
- the desktop panel's plan menu overlays the rows below it and is not clipped
- the mobile sheet scrolls, and opening the plan picker inside it stacks correctly over the sheet
- structure is hairlines and tone, no shadows beyond the sheet's `Elevation.raised`
- **exercise all four actions against the live backend**: extend a date, change a plan, toggle auto-renew, suspend then resume. Confirm each one round-trips and the list row updates.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/MemberDetailsPanel.tsx frontend/components/MemberDetailsPanel.styles.ts \
        frontend/app/members.tsx frontend/app/members.styles.ts \
        frontend/__tests__/MemberDetailsPanel.test.tsx
git commit -m "feat(frontend): add the member details panel with the four membership actions"
```

---

### Task 13: Athlete schedule — quiet plan cutoff note

**Files:**
- Modify: `frontend/app/(tabs)/schedule.tsx`
- Modify: `frontend/app/(tabs)/schedule.styles.ts`
- Test: `frontend/__tests__/schedule-cutoff.test.tsx`

**Interfaces:**
- Consumes: `planExpiresAt: string | null` on `components['schemas']['GetClassScheduleResponseDto']` (Task 8, regenerated in Task 9).
- Produces: nothing downstream.

**What this is.** Task 8 makes the backend stop *returning* classes scheduled after the athlete's plan expiry. Without a note, the athlete sees the week simply end with no explanation. This adds one quiet meta line explaining the cutoff. It is **not** a banner, **not** an accent, and carries **no** call to action (athlete-side purchase is Future Work B in the spec — do not add a "Renew" button).

Copy: `Your plan covers classes through <date>. Talk to your coach to renew.` — e.g. `Your plan covers classes through Sep 1, 2026. Talk to your coach to renew.`

This wording is a deliberate change from the spec's `"Your plan ends <date> — renew to book later classes."` The spec's version implies the athlete can act ("renew to book"), but athlete-side renewal does not exist in this scope; the owner does it. Pointing at the coach is honest about who can help.

Render it only when `planExpiresAt !== null`. It goes at the **end** of the list at both registers — as the mobile `FlatList`'s `ListFooterComponent` (that list currently has `ListHeaderComponent` and `ListEmptyComponent` and no footer) and after the desktop `ScrollView`'s date groups.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/schedule-cutoff.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

let mockIsDesktop = true;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: !mockIsDesktop,
    isDesktop: mockIsDesktop,
    width: mockIsDesktop ? 1280 : 390,
  }),
}));

const mockApiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };

jest.mock('@/utils/api-client', () => ({ createApiClient: () => mockApiClient }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', isLoading: false }),
}));
jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({ currentGymId: 'gym-abc', isLoading: false }),
}));

import ScheduleScreen from '@/app/(tabs)/schedule';

function scheduleResponse(planExpiresAt: string | null) {
  return {
    gymName: 'CrossFit Downtown',
    planExpiresAt,
    classes: [],
  };
}

function mockSchedule(planExpiresAt: string | null) {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.includes('/classes')) return Promise.resolve(scheduleResponse(planExpiresAt));
    return Promise.resolve({ bookings: [] });
  });
}

// Task 8 returns planExpiresAt as a bare YYYY-MM-DD day string, not a
// timestamp. Held to that contract here, and computed relative to today so the
// fixture cannot drift into the past.
const CUTOFF_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const CUTOFF_DAY = CUTOFF_DATE.toISOString().slice(0, 10);
const CUTOFF_LABEL = `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][CUTOFF_DATE.getUTCMonth()]} ${CUTOFF_DATE.getUTCDate()}, ${CUTOFF_DATE.getUTCFullYear()}`;
const CUTOFF_COPY = `Your plan covers classes through ${CUTOFF_LABEL}. Talk to your coach to renew.`;

describe('Schedule plan cutoff note', () => {
  beforeEach(() => {
    mockIsDesktop = true;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('shows the cutoff note on desktop when the plan has an expiry', async () => {
    mockSchedule(CUTOFF_DAY);

    render(<ScheduleScreen />);

    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });

  it('shows the cutoff note on mobile too', async () => {
    mockIsDesktop = false;
    mockSchedule(CUTOFF_DAY);

    render(<ScheduleScreen />);

    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });

  it('shows nothing when the plan has no expiry', async () => {
    mockSchedule(null);

    render(<ScheduleScreen />);

    await screen.findByText('No classes match the selected filters.');
    expect(screen.queryByText(/Your plan covers classes through/)).toBeNull();
  });
});
```

If `ScheduleScreen` needs additional providers or mocks to render in isolation, copy the mock set from the existing schedule test suite (`frontend/__tests__/` — find it with `ls frontend/__tests__ | grep -i schedule`) rather than inventing new ones. Both registers are exercised here explicitly, so the `useResponsiveLayout` pin is doing real work.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd frontend && npx jest __tests__/schedule-cutoff.test.tsx`
Expected: FAIL — the note is not rendered.

- [ ] **Step 3: Add the style**

In the shared/mobile `styles` block of `frontend/app/(tabs)/schedule.styles.ts`:

```ts
  cutoffNote: {
    paddingHorizontal: Space.base,
    paddingTop: Space.lg,
    paddingBottom: Space.xl,
  },
```

- [ ] **Step 4: Render the note**

In `frontend/app/(tabs)/schedule.tsx`, add state next to `gymName`:

```tsx
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
```

In `fetchData`, right after `if (scheduleResponse.gymName) setGymName(scheduleResponse.gymName);`:

```tsx
      setPlanExpiresAt(scheduleResponse.planExpiresAt ?? null);
```

Build the note once, above the desktop branch so both registers use it:

```tsx
  // Quiet explanation for why the schedule stops where it does. No accent, no
  // CTA — athlete-side renewal is not in this scope.
  const cutoffNote = planExpiresAt ? (
    <View style={styles.cutoffNote}>
      <Text size="meta" tone={Ink.faint} style={{ textAlign: 'center' }}>
        {`Your plan covers classes through ${formatCutoffDate(planExpiresAt)}. Talk to your coach to renew.`}
      </Text>
    </View>
  ) : null;
```

Add the formatter next to the file's other date helpers:

```tsx
/**
 * "2026-09-01" → "Sep 1, 2026".
 *
 * Task 8 sends a bare day string. Formatted in UTC deliberately: a
 * `YYYY-MM-DD` string parses as UTC midnight, so a local-timezone format would
 * render the previous day for anyone west of Greenwich.
 */
function formatCutoffDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
```

Desktop: render `{cutoffNote}` inside the `ScrollView`, immediately after the `dateGroups.length === 0 ? … : …` expression.

Mobile: add the footer prop to the `FlatList`:

```tsx
        ListFooterComponent={cutoffNote}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd frontend && npx jest __tests__/schedule-cutoff.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck and run the full suite**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean, all green.

- [ ] **Step 7: Live review**

Log in as an athlete whose plan expires inside the visible window. At **1280×832** and **390×844** verify:
- classes after the expiry date are absent (Task 8's filter), and the note explains it
- the note is `Ink.faint` meta text, no border, no background, no accent — it must not read as a banner
- an athlete on an unlimited plan (`expiresAt` null) sees no note at all

- [ ] **Step 8: Commit**

```bash
git add "frontend/app/(tabs)/schedule.tsx" "frontend/app/(tabs)/schedule.styles.ts" \
        frontend/__tests__/schedule-cutoff.test.tsx
git commit -m "feat(frontend): explain the schedule cutoff when an athlete plan expires"
```

---

### Task 14: Documentation synchronization

**Files:**
- Create: `epics/MEMBERSHIP_PLANS_EPIC.md`
- Modify: `docs/DECISIONS.md` (append a new decision section)
- Modify: `docs/DATA_MODEL.md` (Membership Plan Lifecycle ~line 443; the archived-plan rule ~line 150; the stale waitlist wording ~line 493)
- Modify: `context/PROJECT_STATE.md` (epic pointer list + current phase)

This is the mandatory documentation-synchronization step from `CLAUDE.md`. It is a real task, not a formality: Tasks 1–13 introduce a **new binding rule** (per-member auto-renew with an hourly roll) that contradicts what `DATA_MODEL.md` currently says, and a Tier 1 doc that contradicts shipped behaviour is worse than no doc.

There is no test cycle here. The deliverable is the four files, reviewed for accuracy against the code that Tasks 1–13 actually landed.

- [ ] **Step 1: Append the decision to `docs/DECISIONS.md`**

Add at the end of the file:

```markdown
## Membership Renewal Is Per-Member Auto-Roll (Opt-Out)

An `AthleteMembershipPlan` carries its own `autoRoll` flag (default `true`) and an
`autoRollCount`. An hourly scheduler (`MembershipRenewalScheduler`) finds every
`active` plan row whose `expiresAt` has passed and either rolls it forward by its
plan's `billingCycle` (when `autoRoll` is true) or marks it `expired` (when it is
false). Renewal is therefore **opt-out per member**, not a property of the plan.

Rationale: owners manage a small roster and need per-person control — a member on
holiday should stop renewing without the owner having to move everyone off the plan.
Putting the flag on the plan would force a plan-per-policy explosion.

Rules:

- Turning auto-renew back ON resets `autoRollCount` to 0; turning it OFF leaves the
  count intact as a record of how many cycles were served.
- A roll that is overdue by several cycles advances to the first **future** cycle in
  one pass (bounded by `MAX_CATCH_UP_CYCLES = 240`) rather than one cycle per tick.
- The scheduler is a **convenience, not the enforcement boundary.** Both the athlete
  schedule read model and the booking command re-check `expiresAt` at request time, so
  a row left stale between hourly ticks can never leak a bookable class.
- `expiresAt === null` means unlimited: no expiry, nothing to roll.
- Owners get four actions per member: extend expiry, change plan, toggle auto-renew,
  and suspend/resume the gym membership.
- Athlete-side plan purchase and payment are **out of scope**; a plan is assigned by
  the owner. The athlete only sees a quiet note explaining where their coverage ends.

Supersedes the `DATA_MODEL.md` implication that expiry is a one-way transition to
`expired`.

## Class Visibility Is Bounded by Plan Expiry

A class is visible and bookable to an athlete only if it is scheduled **on or before**
the day their `AthleteMembershipPlan` expires. An athlete whose plan expires mid-week
sees the schedule stop at that day rather than seeing classes they cannot attend.

Rationale: showing a bookable class the athlete's plan does not cover is a promise the
system cannot keep; discovering it at the booking button is worse than not seeing it.

This adds a fifth condition to the Class Visibility invariant in `DATA_MODEL.md`.
```

- [ ] **Step 2: Correct `docs/DATA_MODEL.md` — Membership Plan Lifecycle**

Replace the `### Membership Plan Lifecycle` **Rules** block (~line 447) with:

```markdown
**Rules:**
- New assignments → `active`
- On `expires_at` passing, an hourly scheduler either rolls the row forward by the
  plan's `billing_cycle` (when `auto_roll` is true) or transitions it to `expired`
  (when it is false) — see DECISIONS.md, "Membership Renewal Is Per-Member Auto-Roll"
- Only one `active` plan per GymMembership; assigning a new plan expires the old one
  in the same transaction
- `expires_at = NULL` means unlimited coverage: no expiry, no roll
- Expired athletes cannot see or book classes but can view booking history
- Expiry is re-checked at request time by the schedule read model and the booking
  command; the scheduler is a convenience, not the enforcement boundary
```

Add to the **AthleteMembershipPlan** entity's Key Fields:

```markdown
- `auto_roll` (boolean, default true; whether the row renews on expiry)
- `auto_roll_count` (integer, default 0; cycles served since auto-renew was last enabled)
```

- [ ] **Step 3: Correct `docs/DATA_MODEL.md` — Class Visibility**

In `### Class Visibility to Athlete`, add a fifth condition:

```markdown
5. The class's `scheduled_date` falls on or before the day the AthleteMembershipPlan's
   `expires_at` lands on (an unlimited plan, `expires_at = NULL`, imposes no bound)
```

- [ ] **Step 4: Correct `docs/DATA_MODEL.md` — the two stale lines**

The archived-plan rule (~line 152) currently reads "cannot be purchased by new athletes". Purchase is not the mechanism — assignment is. Replace with:

```markdown
- Archived plans remain in force for athletes who already hold them until their
  current cycle expires, but cannot be assigned to anyone new
```

The Waitlist Promotion rule (~line 493) still says "cancels **or is marked absent**". Commit `cba33b1` removed absence-triggered promotion. This is unrelated to this epic but it is a Tier 1 doc contradicting shipped behaviour in a file this task is already editing — fix it:

```markdown
1. When a `booked` athlete cancels, the system checks for waitlisted athletes
```

- [ ] **Step 5: Write `epics/MEMBERSHIP_PLANS_EPIC.md`**

Follow the shape of `epics/MEMBERS_EPIC.md` (Objective / Current State / Scope with Included + Excluded / API Surface / Tasks / Verification). Content:

- **Status:** ✅ COMPLETE (2026-08-11) — set this only once every task above is committed and live-verified. If any task is outstanding, write `🚧 IN PROGRESS` and list what remains.
- **Depends on:** `epics/GYM_SETTINGS_EPIC.md`, `epics/MEMBERS_EPIC.md` (both ✅)
- **Objective:** owners can define membership plans, assign them to members, control renewal per member, and the platform enforces plan expiry on class visibility and booking.
- **Current State** (as it was before this epic): plan CRUD commands existed with no read endpoint and no UI; `activeMembershipPlan` was never surfaced on the members list; nothing enforced `expiresAt`.
- **Scope — Included:** the plans read endpoint, the enriched members read model, the four owner commands, the renewal scheduler, expiry enforcement in the schedule read model and the booking command, the Plans settings tab, the enriched members list, the member details panel, the athlete cutoff note.
- **Scope — Excluded (Future Work):** athlete-side plan purchase and payment (spec's Future Work B); class-count-limited plans ("10 classes/month" — the entity has `billing_cycle` but no usage counter); proration; plan change history; email/push notification on renewal or expiry.
- **API Surface:** the five endpoints — `GET /api/gyms/:gymId/configuration/membership-plans`, `PATCH /api/gyms/:gymId/members/:membershipId/membership/expiry`, `PUT …/membership/plan`, `PATCH …/membership/auto-roll`, `PATCH /api/gyms/:gymId/members/:membershipId/status` — each with method, role, and one-line purpose.
- **Tasks:** the 14 task titles from this plan with their commit SHAs filled in.
- **Verification:** note that expiry enforcement was live-proved end to end (an athlete with a plan expiring mid-week could not see or book past the cutoff), not just unit-tested.

- [ ] **Step 6: Update `context/PROJECT_STATE.md`**

Add to the epic pointer list at the top:

```markdown
**→ See `epics/MEMBERSHIP_PLANS_EPIC.md` for completed epic details**
```

Then, under the current-phase section, record the outcome — including that this closes the Phase 2 gym-owner audit finding **"Membership Plans feature entirely missing"** (that card is explicitly named in the Phase 2 walkthrough status). Keep it to a few lines; the epic file carries the detail.

- [ ] **Step 7: Verify the docs against the code**

Re-read the four files and check each claim against what actually shipped:
- every endpoint path in the epic matches its controller decorator
- `autoRoll` / `autoRollCount` names match the entity columns
- `MAX_CATCH_UP_CYCLES = 240` matches the scheduler constant
- no doc promises athlete-side purchase, notifications, or class-count limits

- [ ] **Step 8: Commit**

```bash
git add docs/DECISIONS.md docs/DATA_MODEL.md context/PROJECT_STATE.md epics/MEMBERSHIP_PLANS_EPIC.md
git commit -m "docs: record per-member auto-roll renewal and plan-expiry visibility"
```

---

## Deferred: Trello

The Phase 2 audit card for the missing Membership Plans feature (and any 🐞 cards this epic closes) move to **To Verify** with the commit refs, per the board's lifecycle. That happens **after** the user's go-ahead, not as part of a task above.
