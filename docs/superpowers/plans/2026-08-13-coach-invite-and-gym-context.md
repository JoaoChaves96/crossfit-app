# Coach Invites With Acceptance & Switchable Gym Context — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn coach invitation into a real token-based invite that an account-less person can accept, and make gym context switchable so a coach staffing two gyms can actually reach both.

**Architecture:** Add `role: 'athlete' | 'coach'` to the existing `invites` subsystem rather than build a parallel one — the token, 7-day expiry, public acceptance screen, register-then-accept bounce, and list/revoke are then inherited. `InviteCoachHandler` stops writing users and staff rows and becomes an owner-authorized wrapper around `InviteService.createInvite(..., 'coach')`. Acceptance branches on role and re-signs the JWT via the existing `AuthService.issueTokenForUser`. Phase 2 generalises gym-context resolution so a token can be re-signed for any gym the caller is provably attached to.

**Tech Stack:** NestJS 11 + TypeORM + Postgres + CQRS (backend), Expo / React Native Web + expo-router (frontend), Jest (both), Playwright (e2e), Swagger/OpenAPI as the API contract.

**Spec:** `docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md`

## Global Constraints

- **Swagger is the API contract.** Every endpoint or DTO change updates `@Api*` / `@ApiProperty` decorators, and a `T | null` property always needs an explicit `type:`. Verify at http://localhost:3000/api-docs.
- **Frontend types are generated, never hand-written.** After any backend DTO change run `npm run generate:api-types` in `frontend/` and import from `@/types/api.gen`.
- **Design tokens only.** `frontend/constants/design.ts` — never raw hex, never `theme.ts` / `AppColors` / `Spacing`. All text through the `Text` primitive (Named-Face Rule). Compose from `frontend/components/cleanink/`.
- **One Accent Rule:** one crimson `#E23B4E` emphasis per view. On `coaches.tsx` that is already the `Invite Coach` CTA — per-row actions are `quiet`, destructive is `Status.danger` (Two Reds Rule). **There is no success role** — confirm with quiet meta text, not a green banner.
- **Tenant isolation:** every query and mutation stays `gymId`-scoped; cross-gym access is forbidden at all layers.
- **`synchronize: true` in non-production** (`backend/src/config/database.config.ts:46`) applies entity changes to the dev DB automatically. `src/migrations/` is **not registered** in the datasource and has no CLI script — migration files exist for production parity and review, by convention. Write the file; do not expect it to run locally.
- **Commit only on the user's explicit go-ahead.** Steps below say `Commit`; stage and prepare, and take the user's approval before each commit as the workflow requires.
- **Test commands:** backend `cd backend && npm test`, single spec `npm test -- <pattern>`; frontend `cd frontend && npm test`, `npx tsc --noEmit`; e2e `cd frontend && npx playwright test e2e/journeys/<file>`.
- **Pre-existing failure, out of scope:** `frontend/__tests__/useRefreshOnAppActive.test.tsx:76` fails `tsc`. Do not fix; do not let it hide a new error.
- **E2E owns `crossfit_box_e2e` only** and may truncate it. It must never touch `crossfit_box_dev`. Keep `workers: 1` — settled, measured, do not re-propose.
- **Mutation-prove every e2e journey:** reintroduce the defect, confirm red, revert. A mutation that changes no observable behaviour is discarded, not counted.

---

## File Structure

**Backend — moved**
- `src/api/invite/invite.service.ts` → `src/domain/invite/invite.service.ts`
- `src/api/invite/invite.errors.ts` → `src/domain/invite/invite.errors.ts`

**Backend — created**
- `src/migrations/1786579200000-AddRoleToInvites.ts` — the `role` column, for production parity
- `src/domain/invite/invite.service.spec.ts` — unit coverage for role branching
- `src/commands/gym-configuration/dto/invite-coach-response.dto.ts` — rewritten in place (invite shape)
- `src/api/auth/dto/switch-gym-context.dto.ts` — `{ gymId }` request body (Phase 2)
- `src/queries/user/get-user-gyms.service.ts` + `src/queries/user/dto/user-gyms-response.dto.ts` (Phase 2)
- `src/domain/auth/auth.service.spec.ts` — `resolveGymContextFor` coverage (Phase 2)

**Backend — modified**
- `src/domain/invite/entities/invite.entity.ts` — `role` column + `InviteRole` type
- `src/api/invite/invite.controller.ts` — `?role=` filter, 409 mappings, renamed error
- `src/api/invite/dto/{invite-response,validate-invite-response,invite-list-item,accept-invite-response}.dto.ts`
- `src/commands/gym-configuration/handlers/invite-coach.handler.ts` + `.spec.ts`
- `src/api/invite/invite.module.ts`, `src/domain/gym-configuration/gym-configuration.module.ts`, `src/api/user/user.module.ts`
- `src/domain/auth/auth.service.ts`, `src/api/auth/auth.controller.ts`, `src/api/user/user.controller.ts`
- `test/invite-coach.e2e-spec.ts`, `test/invite-lifecycle-and-profile.e2e-spec.ts`

**Frontend — created**
- `utils/routeForRole.ts` — extracted from `app/login.tsx`
- `components/GymSwitcher.tsx` (Phase 2)
- `__tests__/invite-acceptance.test.tsx`, `__tests__/coaches.test.tsx`, `__tests__/GymSwitcher.test.tsx`

**Frontend — modified**
- `app/invite/[inviteToken].tsx`, `app/login.tsx`, `app/coaches.tsx`, `app/coaches.styles.ts`
- `context/GymContext.tsx` (Phase 2), `app/(tabs)/schedule.tsx` + `app/coach-classes.tsx` (switcher mount, Phase 2)
- `e2e/journeys/11-invites-bring-people-in.spec.ts`, `e2e/journeys/16-coach-switches-gyms.spec.ts` (new)

**Docs**
- `docs/DECISIONS.md`, `epics/EMAIL_SERVICE_EPIC.md` (new), `epics/E2E_JOURNEYS.md`, `context/PROJECT_STATE.md`

---

# PHASE 1 — Coach invites with acceptance

## Task 1: Move `InviteService` into the domain layer

Two consumers now need it, and importing an api-layer service into a command handler is the wrong direction. Pure move — no behaviour change, so the existing suite is the test.

**Files:**
- Move: `backend/src/api/invite/invite.service.ts` → `backend/src/domain/invite/invite.service.ts`
- Move: `backend/src/api/invite/invite.errors.ts` → `backend/src/domain/invite/invite.errors.ts`
- Modify: `backend/src/api/invite/invite.module.ts`, `backend/src/api/invite/invite.controller.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `InviteService` importable from `../../domain/invite/invite.service`; error classes from `../../domain/invite/invite.errors`.

- [ ] **Step 1: Record the green baseline**

```bash
cd backend && npm test 2>&1 | tail -5
```

Expected: all suites pass (424 tests on HEAD). Note the number — later tasks compare against it.

- [ ] **Step 2: Move both files with git**

```bash
cd backend
git mv src/api/invite/invite.service.ts src/domain/invite/invite.service.ts
git mv src/api/invite/invite.errors.ts src/domain/invite/invite.errors.ts
```

- [ ] **Step 3: Fix the moved file's own relative imports**

In `src/domain/invite/invite.service.ts` the depth changed by zero (`src/api/invite/` → `src/domain/invite/` are both two levels deep), so `../../domain/...` paths still resolve. The one import that must change is the sibling errors import — it stays `./invite.errors`, and the DTO imports must now reach back into the api layer:

```ts
import { InviteResponseDto } from '../../api/invite/dto/invite-response.dto';
import { InviteListItemDto } from '../../api/invite/dto/invite-list-item.dto';
import { RevokeInviteResponseDto } from '../../api/invite/dto/revoke-invite-response.dto';
import { ValidateInviteResponseDto } from '../../api/invite/dto/validate-invite-response.dto';
import { AcceptInviteResponseDto } from '../../api/invite/dto/accept-invite-response.dto';
import { InviteEntity } from './entities/invite.entity';
```

- [ ] **Step 4: Repoint every other importer**

```bash
cd backend && grep -rln "api/invite/invite.service\|api/invite/invite.errors\|from './invite.service'\|from './invite.errors'" src test
```

Update each hit to `domain/invite/invite.service` / `domain/invite/invite.errors` (for `src/api/invite/invite.controller.ts` and `invite.module.ts` that is `../../domain/invite/...`).

- [ ] **Step 5: Verify compile and suite are unchanged**

```bash
cd backend && npx tsc --noEmit && npm test 2>&1 | tail -5
```

Expected: tsc clean, same test count and all green as Step 1.

- [ ] **Step 6: Commit**

```bash
git add -A backend/src backend/test
git commit -m "refactor(backend): move InviteService into the domain layer

Two consumers now need it and an api-layer service injected into a
command handler is the wrong direction. Pure move; no behaviour change."
```

---

## Task 2: Invites carry a role, and coach invites can be created

**Files:**
- Modify: `backend/src/domain/invite/entities/invite.entity.ts`
- Create: `backend/src/migrations/1786579200000-AddRoleToInvites.ts`
- Modify: `backend/src/domain/invite/invite.service.ts`, `backend/src/domain/invite/invite.errors.ts`
- Modify: `backend/src/api/invite/dto/invite-response.dto.ts`
- Create: `backend/src/domain/invite/invite.service.spec.ts`

**Interfaces:**
- Consumes: `InviteService` at its new domain path (Task 1).
- Produces:
  - `type InviteRole = 'athlete' | 'coach'` exported from `domain/invite/entities/invite.entity.ts`
  - `InviteService.createInvite(gymId: string, createdByUserId: string, inviteeEmail: string, role?: InviteRole): Promise<InviteResponseDto>` — `role` defaults to `'athlete'`
  - `InviteResponseDto.role: InviteRole`
  - `CoachAlreadyStaffError`, `CoachInvitePendingError` from `domain/invite/invite.errors.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/domain/invite/invite.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { InviteService } from './invite.service';
import { InviteEntity } from './entities/invite.entity';
import { GymEntity } from '../gym/entities/gym.entity';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';
import { AuthService } from '../auth/auth.service';
import { CoachAlreadyStaffError, CoachInvitePendingError } from './invite.errors';

const GYM_ID = 'gym-1';
const OWNER_ID = 'owner-1';
const EMAIL = 'newcoach@example.com';

describe('InviteService — coach invites', () => {
  let service: InviteService;
  let inviteRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock; update: jest.Mock };
  let userFindOne: jest.Mock;
  let staffFindOne: jest.Mock;

  beforeEach(async () => {
    inviteRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    userFindOne = jest.fn().mockResolvedValue(null);
    staffFindOne = jest.fn().mockResolvedValue(null);

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === GymEntity) {
          return { findOne: jest.fn().mockResolvedValue({ id: GYM_ID, name: 'Box One', location: 'Lisbon' }) };
        }
        if (entity === UserEntity) return { findOne: userFindOne };
        if (entity === GymStaffEntity) return { findOne: staffFindOne };
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: jest.fn(),
      manager: { findOne: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: getRepositoryToken(InviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { findOne: jest.fn() } },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuthService, useValue: { issueTokenForUser: jest.fn() } },
      ],
    }).compile();

    service = module.get(InviteService);
  });

  it('defaults to an athlete invite when no role is given', async () => {
    const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

    expect(result.role).toBe('athlete');
    expect((inviteRepo.save.mock.calls[0][0] as InviteEntity).role).toBe('athlete');
  });

  it('persists role=coach and returns it', async () => {
    const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

    expect(result.role).toBe('coach');
    expect((inviteRepo.save.mock.calls[0][0] as InviteEntity).role).toBe('coach');
    expect(result.inviteLink).toContain(`/invite/${result.inviteToken}`);
  });

  it('rejects a coach invite when the email already has a gym_staff row at this gym', async () => {
    userFindOne.mockResolvedValue({ id: 'user-9', email: EMAIL });
    staffFindOne.mockResolvedValue({ id: 'staff-9', gymId: GYM_ID, userId: 'user-9', status: 'inactive' });

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachAlreadyStaffError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a second pending coach invite for the same gym and email', async () => {
    const future = new Date(Date.now() + 86_400_000);
    inviteRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'pending', expiresAt: future });

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachInvitePendingError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('allows a new coach invite when the previous one has expired', async () => {
    const past = new Date(Date.now() - 86_400_000);
    inviteRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'pending', expiresAt: past });

    const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

    expect(result.role).toBe('coach');
    expect(inviteRepo.save).toHaveBeenCalledTimes(1);
  });

  it('does not apply coach preconditions to athlete invites', async () => {
    userFindOne.mockResolvedValue({ id: 'user-9', email: 'athlete@example.com' });
    staffFindOne.mockResolvedValue({ id: 'staff-9', gymId: GYM_ID, userId: 'user-9', status: 'active' });

    const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

    expect(result.role).toBe('athlete');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && npm test -- invite.service.spec 2>&1 | tail -20
```

Expected: FAIL — `CoachAlreadyStaffError` is not exported, `createInvite` takes 3 args, `result.role` is undefined.

- [ ] **Step 3: Add the `role` column to the entity**

In `backend/src/domain/invite/entities/invite.entity.ts`, add the type and column:

```ts
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type InviteRole = 'athlete' | 'coach';
```

and inside the class, after `status`:

```ts
  /**
   * What accepting this invite makes the invitee.
   *
   * 'athlete' creates a gym_membership; 'coach' creates a gym_staff row.
   * Defaults to 'athlete' so every pre-existing row is correct without a
   * backfill — coach invites did not exist before this column.
   */
  @Column({
    type: 'varchar',
    enum: ['athlete', 'coach'],
    default: 'athlete',
  })
  role: InviteRole;
```

- [ ] **Step 4: Write the migration file**

Create `backend/src/migrations/1786579200000-AddRoleToInvites.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `role` to invites so one invite subsystem serves both athletes and
 * coaches.
 *
 * Coach invitation previously bypassed invites entirely: InviteCoachHandler
 * wrote an active gym_staff row on the spot. Every existing invite row is
 * therefore an athlete invite, which is exactly what the DEFAULT encodes — no
 * backfill statement is needed.
 */
export class AddRoleToInvites1786579200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invites"
      ADD COLUMN IF NOT EXISTS "role" varchar NOT NULL DEFAULT 'athlete'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invites" DROP COLUMN IF EXISTS "role"
    `);
  }
}
```

- [ ] **Step 5: Add the two error types**

Append to `backend/src/domain/invite/invite.errors.ts`:

```ts
export class CoachAlreadyStaffError extends Error {
  constructor(gymId: string) {
    super(`This person is already staff at gym: ${gymId}`);
    this.name = 'CoachAlreadyStaffError';
  }
}

export class CoachInvitePendingError extends Error {
  constructor(email: string) {
    super(`A coach invite for ${email} is already pending at this gym`);
    this.name = 'CoachInvitePendingError';
  }
}
```

- [ ] **Step 6: Add `role` to `InviteResponseDto`**

In `backend/src/api/invite/dto/invite-response.dto.ts`, add:

```ts
  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;
```

with `import type { InviteRole } from '../../../domain/invite/entities/invite.entity';` at the top.

- [ ] **Step 7: Implement the role parameter and coach preconditions**

In `backend/src/domain/invite/invite.service.ts`, change the signature and add the guard block before the token is generated:

```ts
  async createInvite(
    gymId: string,
    createdByUserId: string,
    inviteeEmail: string,
    role: InviteRole = 'athlete',
  ): Promise<InviteResponseDto> {
    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: gymId },
    });
    if (!gym) {
      throw new GymNotFoundError(gymId);
    }

    if (role === 'coach') {
      await this.assertCoachInvitable(gymId, inviteeEmail);
    }

    // …existing token generation, expiry, save…
```

set `invite.role = role;` alongside the other assignments, and return `role` in the response object. Then add the private helper:

```ts
  /**
   * Coach-specific preconditions.
   *
   * Any gym_staff row blocks, not just an active one: a deactivated coach is
   * brought back through the coach-status endpoint, not re-invited, and
   * re-inviting them would collide on acceptance anyway.
   *
   * A live pending invite also blocks, so an impatient owner cannot mint a
   * second link; they revoke the first or copy it from the invite list. An
   * expired pending row does not block — that is the legitimate re-invite.
   */
  private async assertCoachInvitable(gymId: string, inviteeEmail: string): Promise<void> {
    const existingUser = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email: inviteeEmail } });

    if (existingUser) {
      const existingStaff = await this.dataSource
        .getRepository(GymStaffEntity)
        .findOne({ where: { gymId, userId: existingUser.id } });
      if (existingStaff) {
        throw new CoachAlreadyStaffError(gymId);
      }
    }

    const pending = await this.inviteRepository.findOne({
      where: { gymId, inviteeEmail, role: 'coach', status: 'pending' },
    });
    if (pending && new Date() <= pending.expiresAt) {
      throw new CoachInvitePendingError(inviteeEmail);
    }
  }
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
cd backend && npm test -- invite.service.spec 2>&1 | tail -10 && npx tsc --noEmit
```

Expected: 6 passing, tsc clean.

- [ ] **Step 9: Commit**

```bash
git add backend/src/domain/invite backend/src/migrations backend/src/api/invite/dto/invite-response.dto.ts
git commit -m "feat(backend): give invites a role, and coach invites their preconditions"
```

---

## Task 3: `InviteCoachHandler` creates a pending invite instead of active staff

**Files:**
- Modify: `backend/src/commands/gym-configuration/handlers/invite-coach.handler.ts`
- Modify: `backend/src/commands/gym-configuration/dto/invite-coach-response.dto.ts`
- Modify: `backend/src/api/gym-configuration/gym-configuration.controller.ts:651-691`
- Modify: `backend/src/domain/gym-configuration/gym-configuration.module.ts`
- Rewrite: `backend/src/commands/gym-configuration/handlers/invite-coach.handler.spec.ts`

**Interfaces:**
- Consumes: `InviteService.createInvite(gymId, createdByUserId, email, 'coach')`, `CoachAlreadyStaffError`, `CoachInvitePendingError` (Task 2).
- Produces: `InviteCoachResponseDto { inviteToken: string; inviteLink: string; expiresAt: string; inviteeEmail: string; role: 'coach' }`.

- [ ] **Step 1: Rewrite the handler spec as the failing test**

Replace the whole body of `invite-coach.handler.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InviteCoachHandler } from './invite-coach.handler';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { InviteService } from '../../../domain/invite/invite.service';
import { CoachAlreadyStaffError, CoachInvitePendingError } from '../../../domain/invite/invite.errors';

describe('InviteCoachHandler', () => {
  let handler: InviteCoachHandler;
  let gymService: { getGymById: jest.Mock };
  let gymStaffService: { isGymOwner: jest.Mock };
  let inviteService: { createInvite: jest.Mock };

  const OWNER_ID = 'owner-user-123';
  const GYM_ID = 'gym-123';
  const COACH_EMAIL = 'newcoach@example.com';
  const command = new InviteCoachCommand(OWNER_ID, GYM_ID, COACH_EMAIL);

  const activeGym = { id: GYM_ID, status: 'active' };
  const createdInvite = {
    inviteToken: 'tok-abc',
    inviteLink: 'http://localhost:8081/invite/tok-abc',
    expiresAt: '2026-08-20T00:00:00.000Z',
    inviteeEmail: COACH_EMAIL,
    role: 'coach' as const,
  };

  beforeEach(async () => {
    gymService = { getGymById: jest.fn().mockResolvedValue(activeGym) };
    gymStaffService = { isGymOwner: jest.fn().mockResolvedValue(true) };
    inviteService = { createInvite: jest.fn().mockResolvedValue(createdInvite) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteCoachHandler,
        { provide: GymService, useValue: gymService },
        { provide: GymStaffService, useValue: gymStaffService },
        { provide: InviteService, useValue: inviteService },
      ],
    }).compile();

    handler = module.get(InviteCoachHandler);
  });

  it('creates a coach-role invite and returns the link', async () => {
    const result = await handler.execute(command);

    expect(inviteService.createInvite).toHaveBeenCalledWith(GYM_ID, OWNER_ID, COACH_EMAIL, 'coach');
    expect(result).toEqual(createdInvite);
  });

  it('throws ForbiddenException when the caller is not the gym owner', async () => {
    gymStaffService.isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the gym does not exist', async () => {
    gymService.getGymById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the gym is not active', async () => {
    gymService.getGymById.mockResolvedValue({ id: GYM_ID, status: 'suspended' });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(inviteService.createInvite).not.toHaveBeenCalled();
  });

  it('maps CoachAlreadyStaffError to ConflictException', async () => {
    inviteService.createInvite.mockRejectedValue(new CoachAlreadyStaffError(GYM_ID));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('maps CoachInvitePendingError to ConflictException', async () => {
    inviteService.createInvite.mockRejectedValue(new CoachInvitePendingError(COACH_EMAIL));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('never creates a user or a gym_staff row itself', async () => {
    await handler.execute(command);

    // The handler has no DataSource dependency at all any more — constructing
    // it above without one is the assertion. This test documents why.
    expect(Object.keys(handler)).not.toContain('dataSource');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd backend && npm test -- invite-coach.handler.spec 2>&1 | tail -20
```

Expected: FAIL — Nest cannot resolve the handler's `DataSource` dependency, and `createInvite` is never called.

- [ ] **Step 3: Rewrite the handler**

Replace `backend/src/commands/gym-configuration/handlers/invite-coach.handler.ts` entirely:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { InviteService } from '../../../domain/invite/invite.service';
import {
  CoachAlreadyStaffError,
  CoachInvitePendingError,
} from '../../../domain/invite/invite.errors';
import { InviteCoachResponseDto } from '../dto/invite-coach-response.dto';

/**
 * InviteCoachHandler: owner-authorized entry point for a coach invite.
 *
 * It no longer creates anything itself. It used to create a `pending` user with
 * a random 32-byte password nobody held and an ACTIVE gym_staff row on the
 * spot — so an invited coach without an account could never log in, and an
 * owner could make any registered user staff without their consent. Both are
 * now the invite subsystem's job: a coach-role token the invitee accepts.
 *
 * What stays here is authorization, which the generic invite endpoint cannot
 * express: creating a COACH is owner-only.
 */
@CommandHandler(InviteCoachCommand)
export class InviteCoachHandler implements ICommandHandler<InviteCoachCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(InviteService) private readonly inviteService: InviteService,
  ) {}

  async execute(command: InviteCoachCommand): Promise<InviteCoachResponseDto> {
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    try {
      const invite = await this.inviteService.createInvite(
        command.gymId,
        command.userId,
        command.coachEmail,
        'coach',
      );

      return {
        inviteToken: invite.inviteToken,
        inviteLink: invite.inviteLink,
        expiresAt: invite.expiresAt,
        inviteeEmail: invite.inviteeEmail,
        role: 'coach',
      };
    } catch (err) {
      if (
        err instanceof CoachAlreadyStaffError ||
        err instanceof CoachInvitePendingError
      ) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
```

Note: the transaction is gone with the writes. The TOCTOU comment it carried protected a user + staff insert that no longer happens; `InviteService.createInvite` writes one row.

- [ ] **Step 4: Rewrite the response DTO**

Replace `backend/src/commands/gym-configuration/dto/invite-coach-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class InviteCoachResponseDto {
  @ApiProperty({
    description: 'Opaque token identifying the invite',
    example: 'AbC123...',
  })
  inviteToken: string;

  @ApiProperty({
    description:
      'Full acceptance URL. Email delivery is not implemented, so the owner copies this and sends it themselves.',
    example: 'https://app.crossfitbox.com/invite/AbC123...',
  })
  inviteLink: string;

  @ApiProperty({
    description: 'ISO timestamp when the invite expires (7 days out)',
    example: '2026-08-20T10:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Email address the invite was created for',
    example: 'coach@example.com',
  })
  inviteeEmail: string;

  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['coach'],
    example: 'coach',
  })
  role: 'coach';
}
```

- [ ] **Step 5: Update the controller's Swagger block**

In `backend/src/api/gym-configuration/gym-configuration.controller.ts`, on the `POST /coaches` route: change `@ApiOperation` description to "Creates a pending coach invite and returns the acceptance link. The invitee accepts it to become staff. Gym owners only.", update the `**Postconditions:**` docblock to "Pending coach-role invite created; no gym_staff row until acceptance", and add:

```ts
  @ApiResponse({
    status: 409,
    description:
      'Already staff at this gym, or a coach invite for this email is already pending',
  })
```

- [ ] **Step 6: Wire `InviteModule` into `GymConfigurationModule`**

In `backend/src/domain/gym-configuration/gym-configuration.module.ts` add `import { InviteModule } from '../../api/invite/invite.module';` and add `InviteModule` to the `imports` array.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd backend && npm test -- invite-coach.handler.spec 2>&1 | tail -10 && npx tsc --noEmit
```

Expected: 7 passing, tsc clean.

- [ ] **Step 8: Commit**

```bash
git add backend/src
git commit -m "feat(backend): coach invitation creates a pending invite, not active staff"
```

---

## Task 4: Accepting an invite honours its role and re-signs the token

**Files:**
- Modify: `backend/src/domain/invite/invite.service.ts`
- Modify: `backend/src/domain/invite/invite.errors.ts`
- Modify: `backend/src/api/invite/dto/accept-invite-response.dto.ts`, `validate-invite-response.dto.ts`, `invite-list-item.dto.ts`
- Modify: `backend/src/api/invite/invite.controller.ts`
- Modify: `backend/src/api/invite/invite.module.ts`
- Modify: `backend/src/domain/invite/invite.service.spec.ts`

**Interfaces:**
- Consumes: `AuthService.issueTokenForUser(userId: string): Promise<string>` (`domain/auth/auth.service.ts:90`); `InviteRole`, `CoachAlreadyStaffError` (Task 2).
- Produces:
  - `AcceptInviteResponseDto { gym: {id,name}; user: {id,email}; role: InviteRole; token: string; message: string }`
  - `ValidateInviteResponseDto.role: InviteRole`
  - `InviteListItemDto.role: InviteRole`
  - `InviteService.listInvites(gymId: string, role?: InviteRole)`
  - `InviteeNotRegisteredError` replaces `AthleteNotRegisteredError`

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/domain/invite/invite.service.spec.ts` (inside the same file, a second `describe`). The mocked `dataSource.transaction` must now execute its callback with a manager:

```ts
describe('InviteService — accepting by role', () => {
  let service: InviteService;
  let inviteRepo: { findOne: jest.Mock; update: jest.Mock; save: jest.Mock; find: jest.Mock };
  let membershipRepo: { findOne: jest.Mock };
  let staffFindOne: jest.Mock;
  let saved: Array<{ entity: unknown; row: Record<string, unknown> }>;
  let issueTokenForUser: jest.Mock;

  const GYM_ID = 'gym-1';
  const USER = { id: 'user-7', email: 'dana@example.com' };

  function pendingInvite(role: 'athlete' | 'coach') {
    return {
      id: 'inv-1',
      gymId: GYM_ID,
      inviteeEmail: USER.email,
      inviteToken: 'tok-abc',
      role,
      status: 'pending',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdByUserId: 'owner-1',
    };
  }

  beforeEach(async () => {
    saved = [];
    inviteRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    membershipRepo = { findOne: jest.fn().mockResolvedValue(null) };
    staffFindOne = jest.fn().mockResolvedValue(null);
    issueTokenForUser = jest.fn().mockResolvedValue('re-signed.jwt.token');

    const manager = {
      save: jest.fn((entity: unknown, row: Record<string, unknown>) => {
        saved.push({ entity, row });
        return Promise.resolve(row);
      }),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(USER),
    };

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === GymEntity) return { findOne: jest.fn().mockResolvedValue({ id: GYM_ID, name: 'Box One', location: 'Lisbon' }) };
        if (entity === UserEntity) return { findOne: jest.fn().mockResolvedValue(USER) };
        if (entity === GymStaffEntity) return { findOne: staffFindOne };
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) => cb(manager)),
      manager: { findOne: jest.fn().mockResolvedValue(USER) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: getRepositoryToken(InviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: membershipRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuthService, useValue: { issueTokenForUser } },
      ],
    }).compile();

    service = module.get(InviteService);
  });

  it('creates a gym_staff row for a coach invite, not a membership', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    const entities = saved.map((s) => s.entity);
    expect(entities).toContain(GymStaffEntity);
    expect(entities).not.toContain(GymMembershipEntity);

    const staffRow = saved.find((s) => s.entity === GymStaffEntity)!.row;
    expect(staffRow).toMatchObject({ gymId: GYM_ID, userId: USER.id, role: 'coach', status: 'active' });
    expect(result.role).toBe('coach');
  });

  it('still creates a membership for an athlete invite', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('athlete'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    const entities = saved.map((s) => s.entity);
    expect(entities).toContain(GymMembershipEntity);
    expect(entities).not.toContain(GymStaffEntity);
    expect(result.role).toBe('athlete');
  });

  it('returns a re-signed token so the new context is usable without re-login', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    expect(issueTokenForUser).toHaveBeenCalledWith(USER.id);
    expect(result.token).toBe('re-signed.jwt.token');
  });

  it('refuses a coach invite when the invitee is already staff at that gym', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
    staffFindOne.mockResolvedValue({ id: 'staff-1', gymId: GYM_ID, userId: USER.id, status: 'active' });

    await expect(service.acceptInvite('tok-abc', USER.id)).rejects.toThrow(CoachAlreadyStaffError);
    expect(saved).toHaveLength(0);
  });

  it('filters the invite list by role when asked', async () => {
    await service.listInvites(GYM_ID, 'coach');

    expect(inviteRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: GYM_ID, role: 'coach' } }),
    );
  });

  it('lists every invite when no role filter is given', async () => {
    await service.listInvites(GYM_ID);

    expect(inviteRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: GYM_ID } }),
    );
  });
});
```

Add `CoachAlreadyStaffError` and `GymStaffEntity` to the file's imports if the first `describe` did not already need them.

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && npm test -- invite.service.spec 2>&1 | tail -25
```

Expected: FAIL — `AuthService` is not a provider the service asks for, coach acceptance writes a membership, `result.role`/`result.token` undefined.

- [ ] **Step 3: Inject `AuthService` and branch acceptance on role**

In `backend/src/domain/invite/invite.service.ts`:

```ts
  constructor(
    @InjectRepository(InviteEntity)
    private readonly inviteRepository: Repository<InviteEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}
```

Replace the body of `acceptInvite` from the invitee lookup onward:

```ts
    let invitee: UserEntity | null = null;

    if (currentUserId) {
      invitee = await this.dataSource.manager.findOne(UserEntity, {
        where: { id: currentUserId },
      });
    } else {
      invitee = await this.dataSource.manager.findOne(UserEntity, {
        where: { email: invite.inviteeEmail },
      });
    }

    if (!invitee) {
      throw new InviteeNotRegisteredError(invite.inviteeEmail);
    }

    // Each role has its own "already attached" shape: a coach collides on
    // gym_staff, an athlete on gym_membership. Checking the wrong one would
    // let a coach be added twice.
    if (invite.role === 'coach') {
      const existingStaff = await this.dataSource
        .getRepository(GymStaffEntity)
        .findOne({ where: { gymId: invite.gymId, userId: invitee.id } });
      if (existingStaff) {
        throw new CoachAlreadyStaffError(invite.gymId);
      }
    } else {
      const existingMembership = await this.gymMembershipRepository.findOne({
        where: { gymId: invite.gymId, userId: invitee.id },
      });
      if (existingMembership) {
        throw new AthleteAlreadyMemberError(invite.gymId);
      }
    }

    const gym = await this.dataSource.getRepository(GymEntity).findOne({
      where: { id: invite.gymId },
    });

    await this.dataSource.transaction(async (manager) => {
      if (invite.role === 'coach') {
        const staff = new GymStaffEntity();
        staff.id = uuid();
        staff.gymId = invite.gymId;
        staff.userId = invitee!.id;
        staff.role = 'coach';
        staff.status = 'active';
        staff.assignedAt = new Date();

        await manager.save(GymStaffEntity, staff);
      } else {
        const membership = new GymMembershipEntity();
        membership.id = uuid();
        membership.gymId = invite.gymId;
        membership.userId = invitee!.id;
        membership.status = 'active';

        await manager.save(GymMembershipEntity, membership);
      }

      await manager.update(InviteEntity, invite.id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: invitee!.id,
      });
    });

    // The JWT carries gymId and role as claims fixed at sign time, so without
    // this the invitee keeps whatever context they had — `gymId: null` for a
    // fresh registration — and every gym-scoped request 403s until they log in
    // again. Same reason CreateGymHandler re-issues.
    const token = await this.authService.issueTokenForUser(invitee.id);

    return {
      gym: { id: gym?.id ?? invite.gymId, name: gym?.name ?? '' },
      user: { id: invitee.id, email: invitee.email },
      role: invite.role,
      token,
      message:
        invite.role === 'coach'
          ? 'Successfully joined gym as coach'
          : 'Successfully joined gym',
    };
```

- [ ] **Step 4: Rename the not-registered error**

In `invite.errors.ts` replace `AthleteNotRegisteredError` with:

```ts
export class InviteeNotRegisteredError extends Error {
  constructor(email: string) {
    super(`No account exists for ${email}. Please register first.`);
    this.name = 'InviteeNotRegisteredError';
  }
}
```

Then repoint every usage:

```bash
cd backend && grep -rln "AthleteNotRegisteredError" src test
```

- [ ] **Step 5: Add `role` to validate and list, and the role filter**

`validateInvite` returns `role: invite.role`; `ValidateInviteResponseDto` gains:

```ts
  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;
```

`listInvites` becomes:

```ts
  async listInvites(gymId: string, role?: InviteRole): Promise<InviteListItemDto[]> {
    const invites = await this.inviteRepository.find({
      where: role ? { gymId, role } : { gymId },
      order: { createdAt: 'DESC' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      inviteeEmail: invite.inviteeEmail,
      inviteToken: invite.inviteToken,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    }));
  }
```

`InviteListItemDto` gains the same `role` `@ApiProperty` as above.

- [ ] **Step 6: Rewrite `AcceptInviteResponseDto`**

In `accept-invite-response.dto.ts` rename `AcceptInviteAthleteDto` → `AcceptInviteUserDto` (a coach is not an athlete) and set the response class to:

```ts
export class AcceptInviteResponseDto {
  @ApiProperty({ description: 'Gym details', type: AcceptInviteGymDto })
  gym: AcceptInviteGymDto;

  @ApiProperty({ description: 'The accepting user', type: AcceptInviteUserDto })
  user: AcceptInviteUserDto;

  @ApiProperty({
    description: 'What the invitee became at this gym',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;

  @ApiProperty({
    description:
      'Freshly signed JWT carrying the new gym context. The client MUST replace its stored token with this one.',
    example: 'eyJhbGciOi...',
  })
  token: string;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Successfully joined gym as coach',
  })
  message: string;
}
```

- [ ] **Step 7: Update the controller — role filter, 409 mapping, renamed error, Swagger**

In `backend/src/api/invite/invite.controller.ts`:

```ts
  async listInvites(
    @Param('gymId') gymId: string,
    @Query('role') role?: string,
  ): Promise<InviteListItemDto[]> {
    if (role !== undefined && role !== 'athlete' && role !== 'coach') {
      throw new BadRequestException('role must be "athlete" or "coach"');
    }
    return await this.inviteService.listInvites(gymId, role);
  }
```

with `Query` imported from `@nestjs/common` and an `@ApiQuery({ name: 'role', required: false, enum: ['athlete', 'coach'], description: 'Filter to invites of one role' })` decorator. In `acceptInvite`'s catch, swap `AthleteNotRegisteredError` → `InviteeNotRegisteredError` and add `CoachAlreadyStaffError` to the `ConflictException` branch alongside `AthleteAlreadyMemberError`. Update the accept `@ApiOperation` description to state that it creates a membership **or** a staff row depending on the invite's role and returns a re-signed token.

- [ ] **Step 8: Give `InviteModule` access to `AuthService`**

In `backend/src/api/invite/invite.module.ts` add `AuthModule` to `imports` (`import { AuthModule } from '../auth/auth.module';`) and add `GymEntity`, `UserEntity`, `GymStaffEntity` to `TypeOrmModule.forFeature` only if a repository resolution error appears — the service reaches them through `DataSource`, which needs no registration. `AuthModule` imports only TypeOrm + Jwt, so there is no cycle.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
cd backend && npm test -- invite.service.spec 2>&1 | tail -10 && npx tsc --noEmit
```

Expected: 12 passing (6 from Task 2 + 6 here), tsc clean.

- [ ] **Step 10: Commit**

```bash
git add backend/src
git commit -m "feat(backend): accepting an invite honours its role and re-signs the token"
```

---

## Task 5: Bring the backend e2e specs onto the new behaviour

`test/invite-coach.e2e-spec.ts` is heavily invested in the deleted behaviour: Test 2 / 2b / 2c assert an auto-created user with `status: 'pending'` and `name: 'Coach'`, and a whole `Coach Invitation — Transaction Rollback (e2e)` block asserts that a failed staff save rolls back the user insert. None of that exists any more.

**Files:**
- Modify: `backend/test/invite-coach.e2e-spec.ts`
- Modify: `backend/test/invite-lifecycle-and-profile.e2e-spec.ts`

**Interfaces:**
- Consumes: the endpoints as changed in Tasks 3 and 4.
- Produces: no new code surface.

- [ ] **Step 1: Rewrite the coach-invite e2e expectations**

In `test/invite-coach.e2e-spec.ts`:

- **Test 1** (existing user): assert `201` with `inviteToken`, `inviteLink` containing `/invite/`, `inviteeEmail`, `role: 'coach'`, and **no** `gym_staff` row yet:

```ts
      const staffRows = await dataSource.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, existingCoachUserId],
      );
      expect(staffRows).toHaveLength(0);

      const inviteRows = await dataSource.query(
        `SELECT * FROM invites WHERE "gymId" = $1 AND "inviteeEmail" = $2`,
        [gymId, existingCoachEmail],
      );
      expect(inviteRows).toHaveLength(1);
      expect(inviteRows[0].role).toBe('coach');
      expect(inviteRows[0].status).toBe('pending');
```

- **Tests 2, 2b, 2c** (auto-created user): replace all three with one test — an unknown email is invitable and creates **no** user row:

```ts
    it('POST with an unknown email → 201 and no user row is created', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coachEmail: 'nobody-yet@example.com' })
        .expect(201);

      expect(res.body.role).toBe('coach');
      expect(res.body.inviteToken).toBeTruthy();

      const users = await dataSource.query(`SELECT * FROM users WHERE email = $1`, [
        'nobody-yet@example.com',
      ]);
      expect(users).toHaveLength(0);
    });
```

- **Test 3** (duplicate): expect `409` instead of `400`, and add a second case for a duplicate *pending invite* also returning `409`.
- **Transaction rollback describe block**: delete it. It tested a two-row insert that no longer exists; the single invite insert has nothing to roll back. Replace the block with a comment recording why it was removed.
- Tests 4–7 (authz, validation, gym scoping) stay as they are.

- [ ] **Step 2: Extend the invite lifecycle e2e spec**

In `test/invite-lifecycle-and-profile.e2e-spec.ts`:

- rename the `athlete` assertions in the accept happy path to `user`, and assert the new fields:

```ts
      expect(res.body).toHaveProperty('role', 'athlete');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3);
      expect(res.body.user).toHaveProperty('email', athleteEmail);
```

- add a coach-invite acceptance test that seeds a coach-role invite directly and asserts the staff row and the token's claims:

```ts
    it('accepting a coach invite creates active staff and returns a coach token', async () => {
      const token = 'coach-invite-token-e2e';
      await dataSource.query(
        `INSERT INTO invites (id, "gymId", "createdByUserId", "inviteeEmail", "inviteToken", "expiresAt", status, role)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', 'pending', 'coach')`,
        [randomUUID(), gymId, ownerUserId, newCoachEmail, token],
      );

      const res = await request(app.getHttpServer())
        .post(`/api/invites/${token}/accept`)
        .set('Authorization', `Bearer ${newCoachToken}`)
        .expect(200);

      expect(res.body.role).toBe('coach');

      const staff = await dataSource.query(
        `SELECT * FROM gym_staff WHERE "gymId" = $1 AND "userId" = $2`,
        [gymId, newCoachUserId],
      );
      expect(staff).toHaveLength(1);
      expect(staff[0].role).toBe('coach');
      expect(staff[0].status).toBe('active');

      const claims = JSON.parse(
        Buffer.from(res.body.token.split('.')[1], 'base64').toString('utf8'),
      );
      expect(claims.gymId).toBe(gymId);
      expect(claims.role).toBe('coach');
    });
```

- add a list-filter test: `GET /api/gyms/:gymId/invites?role=coach` returns only coach invites, and `?role=bogus` → `400`.

- [ ] **Step 3: Run the full backend suite**

```bash
cd backend && npm test 2>&1 | tail -15
```

Expected: all green. The total will differ from Task 1's baseline (three tests removed, several added) — confirm every delta is accounted for by this task.

- [ ] **Step 4: Verify Swagger by eye**

Start the backend and open http://localhost:3000/api-docs. Confirm: `POST /api/gyms/{gymId}/configuration/coaches` shows the invite response shape and the 409; `POST /api/invites/{inviteToken}/accept` shows `user`, `role`, `token`; `GET /api/gyms/{gymId}/invites` shows the `role` query parameter.

- [ ] **Step 5: Commit**

```bash
git add backend/test
git commit -m "test(backend): move the invite e2e specs onto acceptance-based coach invites"
```

---

## Task 6: The acceptance screen understands coaches

**Files:**
- Create: `frontend/utils/routeForRole.ts`
- Modify: `frontend/app/login.tsx:183-195`
- Modify: `frontend/app/invite/[inviteToken].tsx`
- Create: `frontend/__tests__/invite-acceptance.test.tsx`

**Interfaces:**
- Consumes: generated types `components['schemas']['ValidateInviteResponseDto']` (now with `role`) and `AcceptInviteResponseDto` (now with `role` + `token`).
- Produces: `routeForRole(router: { replace: (href: never) => void }, role: string | null): void` from `@/utils/routeForRole`.

- [ ] **Step 1: Regenerate the API types**

```bash
cd backend && npm run start:dev   # in one shell, so the schema is served
cd frontend && npm run generate:api-types
git diff --stat frontend/types/api.gen.ts
```

Expected: `ValidateInviteResponseDto.role`, `AcceptInviteResponseDto.{user,role,token}`, `InviteListItemDto.role`, and the new `InviteCoachResponseDto` shape all appear.

- [ ] **Step 2: Write the failing test**

Create `frontend/__tests__/invite-acceptance.test.tsx`. Follow the mocking style of `__tests__/coach-class-details.test.tsx` (expo-router and `createApiClient` mocked); pin the desktop register in the suites that need it — jsdom is 750px, i.e. mobile, by default.

```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import InviteAcceptanceScreen from '@/app/invite/[inviteToken]';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockLogin = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ inviteToken: 'tok-abc' }),
}));

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet, post: mockPost }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super('api error');
      this.status = status;
    }
  },
}));

// The screen reads AuthContext via useContext, so render inside a real
// provider rather than mocking React itself.
import { AuthContext, AuthContextType } from '@/context/AuthContext';

let authValue: AuthContextType;

function renderScreen() {
  return render(
    <AuthContext.Provider value={authValue}>
      <InviteAcceptanceScreen />
    </AuthContext.Provider>,
  );
}

const coachInvite = {
  gymId: 'gym-1',
  gymName: 'Box One',
  gymLocation: 'Lisbon',
  inviteeEmail: 'dana@example.com',
  inviterName: 'Olivia Owner',
  inviterRole: 'owner',
  expiresAt: '2026-08-20T00:00:00.000Z',
  status: 'pending',
  role: 'coach',
};

describe('invite acceptance — coach invites', () => {
  const authenticated: AuthContextType = {
    user: { id: 'user-7', email: 'dana@example.com', role: null, gymId: null },
    token: 'old.jwt.token',
    isAuthenticated: true,
    isLoading: false,
    login: mockLogin,
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authValue = authenticated;
  });

  it('announces a coaching invite, not a membership', async () => {
    mockGet.mockResolvedValue(coachInvite);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(`Coach at ${coachInvite.gymName} on CrossFit Box`)).toBeTruthy();
    });
    expect(screen.getByText('Accept & Join as Coach')).toBeTruthy();
  });

  it('stores the re-signed token and lands the new coach on their classes', async () => {
    mockGet.mockResolvedValue(coachInvite);
    mockPost.mockResolvedValue({
      gym: { id: 'gym-1', name: 'Box One' },
      user: { id: 'user-7', email: 'dana@example.com' },
      role: 'coach',
      token: 'new.jwt.token',
      message: 'Successfully joined gym as coach',
    });

    renderScreen();
    await waitFor(() => expect(screen.getByTestId('invite-join-btn')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('new.jwt.token'));
    expect(mockReplace).toHaveBeenCalledWith('/coach-classes');
  });

  it('sends an unauthenticated coach invitee to register with the token', async () => {
    authValue = { ...authenticated, user: null, token: null, isAuthenticated: false };
    mockGet.mockResolvedValue(coachInvite);

    renderScreen();
    await waitFor(() => expect(screen.getByTestId('invite-join-btn')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/register',
      params: { inviteToken: 'tok-abc', email: 'dana@example.com' },
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('keeps athlete copy and routing for an athlete invite', async () => {
    mockGet.mockResolvedValue({ ...coachInvite, role: 'athlete' });
    mockPost.mockResolvedValue({
      gym: { id: 'gym-1', name: 'Box One' },
      user: { id: 'user-7', email: 'dana@example.com' },
      role: 'athlete',
      token: 'new.jwt.token',
      message: 'Successfully joined gym',
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Join Box One on CrossFit Box')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/schedule'));
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd frontend && npm test -- invite-acceptance 2>&1 | tail -20
```

Expected: FAIL — coach copy absent, `login` never called, replace target wrong.

- [ ] **Step 4: Extract `routeForRole`**

Create `frontend/utils/routeForRole.ts`:

```ts
/**
 * Send a user to their role's home screen.
 *
 * Extracted from the login screen because invite acceptance now needs the same
 * map: accepting a coach invite hands back a token with a new role, and the
 * screen has to land the user where that role lives.
 */
export function routeForRole(
  router: { replace: (href: never) => void },
  role: string | null,
): void {
  if (role === 'owner') {
    router.replace('/schedule-dashboard' as never);
  } else if (role === 'coach') {
    router.replace('/coach-classes' as never);
  } else if (role === 'athlete') {
    router.replace('/(tabs)/schedule' as never);
  } else {
    router.replace('/no-gym' as never);
  }
}
```

In `frontend/app/login.tsx` delete the private `routeForRole` (`:183-195`) and import this one. Run `npm test -- login` if a login suite exists, plus `npx tsc --noEmit`.

- [ ] **Step 5: Make the acceptance screen role-aware**

In `frontend/app/invite/[inviteToken].tsx`:

```tsx
const isCoachInvite = invite.role === 'coach';
```

- `HeroSection` subtitle: `` `Coach at ${invite.gymName} on CrossFit Box` `` when coach, else today's `` `Join ${invite.gymName} on CrossFit Box` ``. Title for coach: `"You've been invited to coach"`.
- `GymCard`: add a Role meta row above `Invited to`, reading `Coach` or `Athlete`.
- `JoinButton` label: `Accept & Join as Coach` when coach, `Join Gym` otherwise.
- `handleJoin` success path:

```tsx
      const client = createApiClient({ token: auth?.token });
      const result = await client.post<AcceptInviteResponse>(
        `/api/invites/${inviteToken}/accept`,
      );

      // The token we arrived with predates this acceptance: its gymId/role
      // claims are stale (null for a fresh registration), and every gym-scoped
      // request would 403. Replacing it is what makes the next screen work.
      await auth?.login(result.token);
      routeForRole(router, result.role);
```

with `type AcceptInviteResponse = components['schemas']['AcceptInviteResponseDto'];` added to the generated-types block. The `accepting` phase text should read `Joining gym...` for athletes and `Setting you up as coach...` for coaches.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd frontend && npm test -- invite-acceptance 2>&1 | tail -10 && npx tsc --noEmit 2>&1 | grep -v useRefreshOnAppActive
```

Expected: 4 passing; no tsc errors other than the known `useRefreshOnAppActive.test.tsx:76`.

- [ ] **Step 7: Commit**

```bash
git add frontend/app frontend/utils frontend/__tests__ frontend/types/api.gen.ts
git commit -m "feat(frontend): the invite screen accepts coaches and adopts the re-signed token"
```

---

## Task 7: The owner sees, copies and revokes pending coach invites

**Files:**
- Modify: `frontend/app/coaches.tsx`, `frontend/app/coaches.styles.ts`
- Create: `frontend/__tests__/coaches.test.tsx`

**Interfaces:**
- Consumes: `GET /api/gyms/:gymId/invites?role=coach` → `InviteListItemDto[]`; `DELETE /api/gyms/:gymId/invites/:token`; `POST /api/gyms/:gymId/configuration/coaches` → `InviteCoachResponseDto` (Task 3).
- Produces: testIDs `pending-invite-row-<inviteToken>`, `copy-invite-link-<inviteToken>`, `revoke-invite-<inviteToken>`, `coach-invite-link-text`.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/coaches.test.tsx`, mocking `@/hooks/useAuth`, `@/hooks/useGym`, `expo-router` and `@/utils/api-client` in the style of `__tests__/members.test.tsx`:

```tsx
  const pendingInvite = {
    id: 'inv-1',
    inviteeEmail: 'dana@example.com',
    inviteToken: 'tok-abc',
    role: 'coach',
    status: 'pending',
    createdAt: '2026-08-13T10:00:00.000Z',
    expiresAt: '2026-08-20T10:00:00.000Z',
    acceptedAt: null,
  };

  it('lists a pending coach invite alongside active coaches', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites')
        ? Promise.resolve([pendingInvite])
        : Promise.resolve({ coaches: [activeCoach] }),
    );

    render(<CoachesScreen />);

    await waitFor(() => expect(screen.getByTestId('pending-invite-row-tok-abc')).toBeTruthy());
    expect(screen.getByText('dana@example.com')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    // Positive anchor: the active coach is still on screen, so the pending row
    // was added rather than replacing the list.
    expect(screen.getByText(activeCoach.email)).toBeTruthy();
  });

  it('only asks for coach invites, never the athlete ones', async () => {
    mockGet.mockResolvedValue({ coaches: [] });

    render(<CoachesScreen />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/gyms/gym-1/invites?role=coach'));
  });

  it('copies the invite link for a pending row', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites') ? Promise.resolve([pendingInvite]) : Promise.resolve({ coaches: [] }),
    );

    render(<CoachesScreen />);
    await waitFor(() => expect(screen.getByTestId('copy-invite-link-tok-abc')).toBeTruthy());

    fireEvent.press(screen.getByTestId('copy-invite-link-tok-abc'));

    expect(mockSetString).toHaveBeenCalledWith(expect.stringContaining('/invite/tok-abc'));
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  it('revokes a pending invite and refetches', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites') ? Promise.resolve([pendingInvite]) : Promise.resolve({ coaches: [] }),
    );
    mockDelete.mockResolvedValue({ message: 'Invite revoked' });

    render(<CoachesScreen />);
    await waitFor(() => expect(screen.getByTestId('revoke-invite-tok-abc')).toBeTruthy());

    fireEvent.press(screen.getByTestId('revoke-invite-tok-abc'));

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/api/gyms/gym-1/invites/tok-abc'),
    );
  });

  it('shows the generated link after sending an invite, instead of claiming success', async () => {
    mockGet.mockResolvedValue({ coaches: [] });
    mockPost.mockResolvedValue({
      inviteToken: 'tok-new',
      inviteLink: 'http://localhost:8081/invite/tok-new',
      expiresAt: '2026-08-20T10:00:00.000Z',
      inviteeEmail: 'new@example.com',
      role: 'coach',
    });

    render(<CoachesScreen />);
    fireEvent.press(screen.getByTestId('invite-coach-btn'));
    fireEvent.changeText(screen.getByTestId('invite-coach-email-input'), 'new@example.com');
    fireEvent.press(screen.getByTestId('modal-confirm-btn'));

    await waitFor(() => expect(screen.getByTestId('coach-invite-link-text')).toBeTruthy());
    expect(screen.getByText('http://localhost:8081/invite/tok-new')).toBeTruthy();
  });
```

Mock the clipboard the way `app/invites.tsx` uses it (`Clipboard.setString` from `react-native`) — no new dependency:

```tsx
const mockSetString = jest.fn();
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  setString: (v: string) => mockSetString(v),
}));
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && npm test -- coaches 2>&1 | tail -20
```

Expected: FAIL — no invites request, no pending rows, no link display.

- [ ] **Step 3: Fetch pending coach invites**

In `frontend/app/coaches.tsx` add to the types block:

```tsx
type CoachInvite = components['schemas']['InviteListItemDto'];
type InviteCoachResponse = components['schemas']['InviteCoachResponseDto'];
```

Add state and a fetch that runs alongside `fetchCoaches`:

```tsx
  const [pendingInvites, setPendingInvites] = useState<CoachInvite[]>([]);

  const fetchPendingInvites = useCallback(async () => {
    if (!token || !currentGymId) return;
    try {
      const client = createApiClient({ token });
      const invites = await client.get<CoachInvite[]>(
        `/api/gyms/${currentGymId}/invites?role=coach`,
      );
      setPendingInvites(invites.filter((i) => i.status === 'pending'));
    } catch {
      // A failed invite fetch must not blank the coach list — the roster is the
      // screen's primary job and it has its own error state.
      setPendingInvites([]);
    }
  }, [token, currentGymId]);
```

Call it from the same `useEffect` as `fetchCoaches`, from `handleInviteSuccess`, and after a revoke.

- [ ] **Step 4: Render pending rows**

Add a `PendingInviteRow` component above the coach list on both registers. Per the One Accent Rule the crimson stays on the header CTA, so both row actions are quiet and revoke is `Status.danger`:

```tsx
function PendingInviteRow({
  invite,
  onCopy,
  onRevoke,
  copiedToken,
  isRevoking,
}: {
  invite: CoachInvite;
  onCopy: (invite: CoachInvite) => void;
  onRevoke: (invite: CoachInvite) => void;
  copiedToken: string | null;
  isRevoking: boolean;
}) {
  return (
    <View testID={`pending-invite-row-${invite.inviteToken}`} style={styles.pendingRow}>
      <View style={styles.colName}>
        <Text size="body" weight="semibold" numberOfLines={1}>
          {invite.inviteeEmail}
        </Text>
      </View>
      <View style={styles.colStatus}>
        <StatusChip tone="neutral" label="Pending" />
      </View>
      <View style={styles.colClasses}>
        <Text size="meta" tone="muted">
          {`Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
        </Text>
      </View>
      <View style={styles.colActions}>
        <TouchableOpacity
          testID={`copy-invite-link-${invite.inviteToken}`}
          onPress={() => onCopy(invite)}
          activeOpacity={0.7}>
          <Text size="body" weight="medium" tone="muted">
            {copiedToken === invite.inviteToken ? 'Copied!' : 'Copy link'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`revoke-invite-${invite.inviteToken}`}
          onPress={() => onRevoke(invite)}
          disabled={isRevoking}
          activeOpacity={0.7}>
          <Text size="body" weight="medium" tone={Status.danger}>
            Revoke
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

Handlers on the screen:

```tsx
  function handleCopyInviteLink(invite: CoachInvite) {
    // The list endpoint returns the token, not the link the backend built, so
    // rebuild it against this origin. Email delivery does not exist yet, so
    // this string is the whole delivery mechanism.
    Clipboard.setString(inviteLinkFor(invite.inviteToken));
    setCopiedToken(invite.inviteToken);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleRevokeInvite(invite: CoachInvite) {
    if (!token || !currentGymId) return;
    setRevokingToken(invite.inviteToken);
    try {
      const client = createApiClient({ token });
      await client.delete(`/api/gyms/${currentGymId}/invites/${invite.inviteToken}`);
      await fetchPendingInvites();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invite.';
      Alert.alert('Error', msg);
    } finally {
      setRevokingToken(null);
    }
  }
```

with a small helper next to the other module-level helpers:

```tsx
function inviteLinkFor(inviteToken: string): string {
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '';
  return `${origin}/invite/${inviteToken}`;
}
```

The empty state must no longer say "No coaches yet" when invites are pending — gate it on `coaches.length === 0 && pendingInvites.length === 0`. Add `pendingRow` to `coaches.styles.ts` mirroring `coachRow`, and import `Status` from `@/constants/design` and `Clipboard` from `react-native`.

- [ ] **Step 5: Show the link in the invite modal**

In `InviteModal`, hold the created invite and render the link instead of closing immediately:

```tsx
  const [created, setCreated] = useState<InviteCoachResponse | null>(null);
```

On success `setCreated(response)` and call `onSuccess()` (so the list refetches) but keep the modal open. Render, per DESIGN.md — quiet meta text, no green banner, no success role:

```tsx
          {created !== null ? (
            <View style={styles.linkBox}>
              <Text size="meta" tone="muted">
                Invite created. Send this link to the coach — email delivery is not set up yet.
              </Text>
              <View style={styles.linkRow}>
                <Text testID="coach-invite-link-text" size="meta" numberOfLines={1}>
                  {created.inviteLink}
                </Text>
                <TouchableOpacity onPress={() => handleCopyCreatedLink(created)} activeOpacity={0.7}>
                  <Text size="meta" weight="semibold">{copyLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
```

Change the confirm button label to `Done` once `created !== null`, and have it close and reset.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd frontend && npm test -- coaches 2>&1 | tail -10 && npx tsc --noEmit 2>&1 | grep -v useRefreshOnAppActive
```

Expected: 5 passing, no new tsc errors.

- [ ] **Step 7: Live screenshot review**

Run the app, log in as an owner, open Coaches, and review at desktop 1280×832 and mobile 390×844. Check: exactly one crimson element per view (the CTA), Pending chip reads as neutral, Revoke is `Status.danger` and visibly a different red from the accent, hairlines not shadows, no raw hex introduced.

- [ ] **Step 8: Commit**

```bash
git add frontend/app frontend/__tests__
git commit -m "feat(frontend): owners see, copy and revoke pending coach invites"
```

---

## Task 8: Documentation

**Files:**
- Modify: `docs/DECISIONS.md`
- Create: `epics/EMAIL_SERVICE_EPIC.md`
- Modify: `epics/E2E_JOURNEYS.md`, `context/PROJECT_STATE.md`

- [ ] **Step 1: Add the Tier 1 decision**

Append to `docs/DECISIONS.md`, matching the existing heading + Rationale + Rules shape:

```markdown
## Coach Invites Require Acceptance

An owner cannot make someone staff unilaterally. `POST /api/gyms/:gymId/configuration/coaches`
creates a **pending coach-role invite**; a `gym_staff` row exists only once the
invitee accepts it.

Rationale: the previous handler wrote an active `gym_staff` row immediately and,
for an unknown email, a `pending` user with a random 32-byte password nobody
held — so an invited coach who had no account could never log in, and a
registered user could be made staff without consenting.

Rules:

- Coach invites live in the same `invites` table as athlete invites, separated by
  `role`. Same 7-day expiry, same revocation, same public acceptance screen.
- Creating a coach invite is **owner-only**. The generic
  `POST /api/gyms/:gymId/invites` route stays owner-or-coach and always creates
  an **athlete** invite: a coach cannot create a coach.
- An invitee with no account registers through the link and is returned to it;
  there is no separate set-password path.
- Any existing `gym_staff` row at that gym blocks a new invite, in any status —
  a deactivated coach is reactivated, not re-invited.
- A live pending coach invite for the same gym and email blocks a second one.
  An expired one does not.
- Acceptance re-signs the JWT (see *Gym Context Is Switchable*).
```

- [ ] **Step 2: Amend *Owner Gym Context After Creation***

That entry says "There is deliberately no general `/api/auth/refresh` endpoint in MVP. If another mid-session role change appears (e.g. accepting a coach invite), revisit this." Append the outcome of the revisit:

```markdown
**Revisited 2026-08-13.** Accepting a coach invite is that second case. It is
handled the same way — the accept response carries a freshly signed token the
client stores in place of the old one — and gym context switching adds one
narrow re-signing endpoint (`POST /api/auth/gym-context`). There is still no
general refresh endpoint: both paths re-sign only for a gym the caller is
provably attached to.
```

- [ ] **Step 3: Write the email-service epic**

Create `epics/EMAIL_SERVICE_EPIC.md` recording: no provider is wired anywhere; `InviteService.sendInviteEmail` logs in dev and `console.warn`s in production; coach invites deliberately ship with owner-copies-the-link as an **interim** mechanism; the copy-link UI in `app/coaches.tsx` and `app/invites.tsx` is what a real email would replace; scope when picked up = provider choice, templates for athlete + coach invites, and a delivery-failure story that does not lose the invite.

- [ ] **Step 4: Close the gaps in the tracking docs**

In `epics/E2E_JOURNEYS.md` § *Findings from Tier 2*, mark gaps 1 and 2 ✅ closed with the date and a pointer to this plan's spec; note that journey 11 is now a single test. Update `context/PROJECT_STATE.md` the same way.

- [ ] **Step 5: Commit**

```bash
git add docs/DECISIONS.md epics context
git commit -m "docs: coach invites require acceptance; record the email-service gap"
```

---

## Task 9: Journey 11 becomes one journey, end to end

**Files:**
- Rewrite: `frontend/e2e/journeys/11-invites-bring-people-in.spec.ts`

**Interfaces:**
- Consumes: `seedGym`, `seedUser` (`e2e/helpers/seed.ts`), `loginAs`, `fillStable`, `visibleTestId` (`e2e/helpers/auth.ts`), `openOwnerSection`, `createClassViaForm` (`e2e/helpers/actions.ts`), `bookableDay` (`e2e/helpers/dates.ts`), `newActorPage` (`e2e/fixtures.ts`).
- Produces: no new helpers — if the journey seems to need one, prefer a plain local function in the spec.

- [ ] **Step 1: Rewrite the spec**

Replace the file's header comment (which documents the now-fixed mismatch) and merge the two tests into one journey. The invitee is a **brand-new email with no account** — the case that was impossible before:

```ts
/**
 * Journey 11 — an invite turns an outsider into someone who can work in the gym.
 *
 * The whole chain in one test, because the value is in the chain: the owner
 * invites an address that has NO ACCOUNT, the link the UI showed is the link
 * that works, registering through it lands the invitee back on acceptance, and
 * accepting makes them a coach who can immediately operate — no re-login, which
 * is the part the re-signed token buys.
 *
 * The token is read off the screen rather than out of the database: that string
 * is the owner's only delivery mechanism until an email service exists, so it
 * is the seam worth testing.
 */
```

The body, in order:

1. `const gym = await seedGym('j11-invite-coach');`
2. Login as owner → `openOwnerSection(page, 'coaches')`. Assert the gym's one existing coach is listed and the new email is absent (`toHaveCount(0)`) — the before-state that makes the later row the invite's doing.
3. Invite a brand-new address: `page.getByTestId('invite-coach-btn').click()`, `fillStable(page.getByTestId('invite-coach-email-input'), newEmail)`, `page.getByTestId('modal-confirm-btn').click()`.
4. Read the link: `const linkText = page.getByTestId('coach-invite-link-text')`, then `tokenFromLink(await linkText.innerText())` (keep the existing local `tokenFromLink` helper and its comment about not opening the production host).
5. Assert **no coach yet**: a pending row is visible (`pending-invite-row-<token>`) and `coach-view-*` has count 0 for that person. Absence plus the positive pending anchor.
6. New actor page. `goto('/invite/<token>')`, assert the coach copy (`Coach at ${gym.name} on CrossFit Box`) and the invited email are on screen — both derived from the token alone.
7. Press `invite-join-btn` → the register screen (`toHaveURL(/register/)`), with the email prefilled. Fill name + password, submit.
8. Back on acceptance, press `invite-join-btn` again → assert the coach lands on their own classes: `await expect(coach).toHaveURL(/coach-classes/)`. **No login step anywhere in this test** — that absence is the token re-signing under test.
9. Owner side: `openOwnerSection(page, 'coaches')` again; the pending row is gone and `coach-view-<userId>` is visible with the registered name. Look the id up with `withDb` from `helpers/seed.ts` if needed, or address the row by email text within the desktop table.
10. Assignment reaches them: owner creates a class with `coachName` = the new coach's name via `createClassViaForm`, then on the coach's page `goto('/coach-classes')`, expect exactly one `coach-class-row-*`, open it, and expect `programming-wod-input` — a coach-only surface, so its presence is the permission check.
11. Token spent: re-open `/invite/<token>` and expect `This invite has already been accepted` with `invite-join-btn` at count 0.

Keep `visibleTestId` for anything that a pushed route may have mounted twice, and never use `.first()` to escape strict mode.

- [ ] **Step 2: Run the journey**

```bash
cd frontend && npx playwright test e2e/journeys/11-invites-bring-people-in.spec.ts
```

Expected: 1 test passing. Iterate until it is genuinely green — do not weaken an assertion to get there.

- [ ] **Step 3: Mutation-prove it (mutation 1 — the role branch)**

In `backend/src/domain/invite/invite.service.ts`, make coach acceptance write a membership instead of a staff row (swap the branch). Re-run the journey.

Expected: RED at step 9 or 10 (no coach row → no coach on the roster → not assignable). Then revert:

```bash
cd backend && git checkout src/domain/invite/invite.service.ts && git status --short
```

- [ ] **Step 4: Mutation-prove it (mutation 2 — the re-signed token)**

In `frontend/app/invite/[inviteToken].tsx`, delete the `await auth?.login(result.token)` line so the stale token survives acceptance. Re-run.

Expected: RED — the coach reaches `/coach-classes` with a token whose `role`/`gymId` predate acceptance, so the class list request 403s and the row assertion fails. If it stays GREEN, the journey is not proving the token claim: strengthen it (assert a coach-only surface that requires gym context, e.g. `programming-wod-input`) before moving on. Revert:

```bash
cd frontend && git checkout app/invite/\[inviteToken\].tsx && git status --short
```

- [ ] **Step 5: Full verification**

```bash
cd backend && npm test 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5 && npx playwright test 2>&1 | tail -5
```

Expected: backend green, frontend green, all 15 e2e journeys green (still 15 — journey 11 went from two tests to one, and no journey was added yet).

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e
git commit -m "test(e2e): journey 11 invites an account-less coach through to working"
```

---

# PHASE 2 — Switchable gym context

## Task 10: A token can be re-signed for any gym the caller is attached to

**Files:**
- Modify: `backend/src/domain/auth/auth.service.ts`
- Create: `backend/src/domain/auth/auth.service.spec.ts`
- Create: `backend/src/api/auth/dto/switch-gym-context.dto.ts`
- Modify: `backend/src/api/auth/auth.controller.ts`

**Interfaces:**
- Consumes: `GymStaffEntity`, `GymMembershipEntity` repositories already injected into `AuthService`.
- Produces:
  - `AuthService.resolveGymContextFor(userId: string, gymId: string): Promise<{ gymId: string; role: string }>` — throws `ForbiddenException` when unattached
  - `AuthService.issueTokenForGym(userId: string, gymId: string): Promise<string>`
  - `POST /api/auth/gym-context` body `{ gymId: string }` → `{ accessToken: string }`

- [ ] **Step 1: Write the failing test**

Create `backend/src/domain/auth/auth.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';

describe('AuthService.resolveGymContextFor', () => {
  let service: AuthService;
  let staffFindOne: jest.Mock;
  let membershipFindOne: jest.Mock;
  let sign: jest.Mock;

  const USER_ID = 'user-1';
  const GYM_ID = 'gym-b';

  beforeEach(async () => {
    staffFindOne = jest.fn().mockResolvedValue(null);
    membershipFindOne = jest.fn().mockResolvedValue(null);
    sign = jest.fn().mockReturnValue('signed.jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: { findOne: jest.fn().mockResolvedValue({ id: USER_ID, email: 'u@example.com' }) } },
        { provide: getRepositoryToken(GymStaffEntity), useValue: { findOne: staffFindOne } },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { findOne: membershipFindOne } },
        { provide: JwtService, useValue: { sign } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('resolves the named gym from an active staff row', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'coach', status: 'active' });

    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).resolves.toEqual({
      gymId: GYM_ID,
      role: 'coach',
    });
  });

  it('falls back to an active membership as athlete', async () => {
    membershipFindOne.mockResolvedValue({ gymId: GYM_ID, status: 'active' });

    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).resolves.toEqual({
      gymId: GYM_ID,
      role: 'athlete',
    });
  });

  it('prefers staff over membership at the same gym', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'owner', status: 'active' });
    membershipFindOne.mockResolvedValue({ gymId: GYM_ID, status: 'active' });

    const result = await service.resolveGymContextFor(USER_ID, GYM_ID);

    expect(result.role).toBe('owner');
    expect(membershipFindOne).not.toHaveBeenCalled();
  });

  it('refuses a gym the user is not attached to', async () => {
    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).rejects.toThrow(ForbiddenException);
  });

  it('refuses when the only staff row is inactive', async () => {
    // The active filter lives in the query, so assert the query asked for it.
    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).rejects.toThrow(ForbiddenException);
    expect(staffFindOne).toHaveBeenCalledWith({
      where: { userId: USER_ID, gymId: GYM_ID, status: 'active' },
    });
  });

  it('issueTokenForGym signs the named gym context', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'coach', status: 'active' });

    const token = await service.issueTokenForGym(USER_ID, GYM_ID);

    expect(token).toBe('signed.jwt');
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: USER_ID, gymId: GYM_ID, role: 'coach' }),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd backend && npm test -- auth.service.spec 2>&1 | tail -20
```

Expected: FAIL — `resolveGymContextFor` and `issueTokenForGym` are not functions.

- [ ] **Step 3: Implement both methods**

Add to `backend/src/domain/auth/auth.service.ts`:

```ts
  /**
   * Mint a token for one *named* gym the user is attached to.
   *
   * Distinct from issueTokenForUser, which re-resolves the default (oldest)
   * context. A coach may staff several gyms (DATA_MODEL.md) but the JWT carries
   * exactly one gymId and GymOwnershipGuard compares it to the route, so
   * without this every gym but the oldest is unreachable.
   */
  async issueTokenForGym(userId: string, gymId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const context = await this.resolveGymContextFor(userId, gymId);

    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      gymId: context.gymId,
      role: context.role,
    });
  }

  /**
   * Resolve the caller's role at one specific gym.
   *
   * Staff beats membership when both exist, matching resolveGymContext — an
   * owner or coach who also trains at their own gym operates as staff.
   * Refuses rather than falling back: silently handing back a different gym's
   * context would be a tenant-isolation hole.
   */
  async resolveGymContextFor(
    userId: string,
    gymId: string,
  ): Promise<{ gymId: string; role: string }> {
    const staffEntry = await this.gymStaffRepository.findOne({
      where: { userId, gymId, status: 'active' },
    });
    if (staffEntry) {
      return { gymId, role: staffEntry.role };
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { userId, gymId, status: 'active' },
    });
    if (membership) {
      return { gymId, role: 'athlete' };
    }

    throw new ForbiddenException('User is not attached to this gym');
  }
```

with `ForbiddenException` added to the `@nestjs/common` import.

Note deliberately **not** applied: `COMMAND_MODEL.md:203` lists an active membership plan as a precondition. It is dropped — see the spec § 2.3 and the `DECISIONS.md` entry in Task 15.

- [ ] **Step 4: Add the request DTO**

Create `backend/src/api/auth/dto/switch-gym-context.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchGymContextDto {
  @ApiProperty({
    description: 'The gym to switch the session context to',
    example: 'uuid-gym-id',
  })
  @IsUUID()
  gymId: string;
}
```

- [ ] **Step 5: Add the endpoint**

In `backend/src/api/auth/auth.controller.ts` add, guarded by `JwtAuthGuard` and returning the same shape as login (`{ accessToken }` — `login.tsx:65` reads `response.accessToken`):

```ts
  @Post('/gym-context')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch the active gym context',
    description:
      'Returns a token re-signed for the named gym. The caller must have an active staff row or an active membership there. Not a general refresh endpoint: it only re-signs for a gym the caller is provably attached to.',
  })
  @ApiBody({ type: SwitchGymContextDto })
  @ApiResponse({ status: 200, description: 'Token re-signed for the named gym', type: AuthTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not attached to this gym' })
  async switchGymContext(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) dto: SwitchGymContextDto,
  ): Promise<AuthTokenResponseDto> {
    const accessToken = await this.authService.issueTokenForGym(userId, dto.gymId);
    return { accessToken };
  }
```

Reuse the existing login response DTO for the return type rather than adding a second one — check its name in `src/api/auth/dto/` and use that class.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd backend && npm test -- auth.service.spec 2>&1 | tail -10 && npx tsc --noEmit
```

Expected: 6 passing, tsc clean.

- [ ] **Step 7: Commit**

```bash
git add backend/src
git commit -m "feat(backend): re-sign a token for any gym the caller is attached to"
```

---

## Task 11: `GET /api/me/gyms` lists the caller's gyms

Placed on the existing `/api/me` controller (`src/api/user/user.controller.ts:21`) rather than a new path, so it sits with the other user-scoped reads.

**Files:**
- Create: `backend/src/queries/user/get-user-gyms.service.ts`
- Create: `backend/src/queries/user/dto/user-gyms-response.dto.ts`
- Create: `backend/src/queries/user/get-user-gyms.service.spec.ts`
- Modify: `backend/src/api/user/user.controller.ts`, `backend/src/api/user/user.module.ts`

**Interfaces:**
- Consumes: `GymStaffEntity`, `GymMembershipEntity`, `GymEntity` repositories.
- Produces: `GetUserGymsService.getGyms(userId: string): Promise<GetUserGymsResponseDto>` where `GetUserGymsResponseDto { gyms: UserGymDto[] }` and `UserGymDto { gymId: string; gymName: string; role: 'owner' | 'coach' | 'athlete' }`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/queries/user/get-user-gyms.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetUserGymsService } from './get-user-gyms.service';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';

describe('GetUserGymsService', () => {
  let service: GetUserGymsService;
  let staffFind: jest.Mock;
  let membershipFind: jest.Mock;
  let gymFind: jest.Mock;

  const USER_ID = 'user-1';

  beforeEach(async () => {
    staffFind = jest.fn().mockResolvedValue([]);
    membershipFind = jest.fn().mockResolvedValue([]);
    gymFind = jest.fn().mockResolvedValue([
      { id: 'gym-a', name: 'Box A' },
      { id: 'gym-b', name: 'Box B' },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserGymsService,
        { provide: getRepositoryToken(GymStaffEntity), useValue: { find: staffFind } },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { find: membershipFind } },
        { provide: getRepositoryToken(GymEntity), useValue: { find: gymFind } },
      ],
    }).compile();

    service = module.get(GetUserGymsService);
  });

  it('returns both staffed and member gyms', async () => {
    staffFind.mockResolvedValue([{ gymId: 'gym-a', role: 'coach', status: 'active' }]);
    membershipFind.mockResolvedValue([{ gymId: 'gym-b', status: 'active' }]);

    const result = await service.getGyms(USER_ID);

    expect(result.gyms).toEqual([
      { gymId: 'gym-a', gymName: 'Box A', role: 'coach' },
      { gymId: 'gym-b', gymName: 'Box B', role: 'athlete' },
    ]);
  });

  it('reports one entry per gym, staff winning over membership', async () => {
    staffFind.mockResolvedValue([{ gymId: 'gym-a', role: 'owner', status: 'active' }]);
    membershipFind.mockResolvedValue([{ gymId: 'gym-a', status: 'active' }]);

    const result = await service.getGyms(USER_ID);

    expect(result.gyms).toEqual([{ gymId: 'gym-a', gymName: 'Box A', role: 'owner' }]);
  });

  it('returns an empty list for a user with no gym', async () => {
    await expect(service.getGyms(USER_ID)).resolves.toEqual({ gyms: [] });
  });

  it('only counts active attachments', async () => {
    await service.getGyms(USER_ID);

    expect(staffFind).toHaveBeenCalledWith({ where: { userId: USER_ID, status: 'active' } });
    expect(membershipFind).toHaveBeenCalledWith({ where: { userId: USER_ID, status: 'active' } });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd backend && npm test -- get-user-gyms 2>&1 | tail -20
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the DTOs**

Create `backend/src/queries/user/dto/user-gyms-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class UserGymDto {
  @ApiProperty({ description: 'Gym ID', example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ description: 'Gym name', example: 'CrossFit Downtown' })
  gymName: string;

  @ApiProperty({
    description: "The caller's role at this gym",
    enum: ['owner', 'coach', 'athlete'],
    example: 'coach',
  })
  role: 'owner' | 'coach' | 'athlete';
}

export class GetUserGymsResponseDto {
  @ApiProperty({
    description:
      'Every gym the caller is actively attached to, staff first. More than one entry means the gym switcher applies.',
    type: [UserGymDto],
  })
  gyms: UserGymDto[];
}
```

- [ ] **Step 4: Implement the service**

Create `backend/src/queries/user/get-user-gyms.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';
import { GetUserGymsResponseDto, UserGymDto } from './dto/user-gyms-response.dto';

/**
 * Every gym the caller can act in, which is what the gym switcher offers.
 *
 * Staff attachment wins over membership at the same gym, matching
 * AuthService.resolveGymContextFor — an owner or coach who also trains at their
 * own gym operates as staff, so offering "athlete at Box A" would hand them a
 * context the switcher could not reproduce.
 */
@Injectable()
export class GetUserGymsService {
  constructor(
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
  ) {}

  async getGyms(userId: string): Promise<GetUserGymsResponseDto> {
    const staffRows = await this.gymStaffRepository.find({
      where: { userId, status: 'active' },
    });
    const membershipRows = await this.gymMembershipRepository.find({
      where: { userId, status: 'active' },
    });

    const roleByGymId = new Map<string, UserGymDto['role']>();
    for (const staff of staffRows) {
      roleByGymId.set(staff.gymId, staff.role);
    }
    for (const membership of membershipRows) {
      if (!roleByGymId.has(membership.gymId)) {
        roleByGymId.set(membership.gymId, 'athlete');
      }
    }

    const gymIds = [...roleByGymId.keys()];
    if (gymIds.length === 0) {
      return { gyms: [] };
    }

    const gyms = await this.gymRepository.find({ where: { id: In(gymIds) } });
    const nameById = new Map(gyms.map((gym) => [gym.id, gym.name]));

    return {
      gyms: gymIds.map((gymId) => ({
        gymId,
        gymName: nameById.get(gymId) ?? '',
        role: roleByGymId.get(gymId)!,
      })),
    };
  }
}
```

- [ ] **Step 5: Expose it on `/api/me/gyms`**

In `backend/src/api/user/user.controller.ts`, inject `GetUserGymsService` and add:

```ts
  @Get('/gyms')
  @Role(['athlete', 'owner', 'coach'])
  @UserScoped()
  @ApiOperation({
    summary: "List the caller's gyms",
    description:
      'Every gym the authenticated user is actively attached to, as staff or as a member. Crosses all gyms (user-scoped endpoint); more than one entry is what makes the gym switcher appear.',
  })
  @ApiResponse({ status: 200, description: 'Gyms returned', type: GetUserGymsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserGyms(@CurrentUser() userId: string): Promise<GetUserGymsResponseDto> {
    return this.getUserGymsService.getGyms(userId);
  }
```

Register `GetUserGymsService` in `src/api/user/user.module.ts` and add `GymStaffEntity`, `GymMembershipEntity`, `GymEntity` to its `TypeOrmModule.forFeature`.

Place `/gyms` **above** the bare `@Get()` route so the literal path is matched first.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd backend && npm test -- get-user-gyms 2>&1 | tail -10 && npx tsc --noEmit
```

Expected: 4 passing, tsc clean.

- [ ] **Step 7: Commit**

```bash
git add backend/src
git commit -m "feat(backend): GET /api/me/gyms lists every gym the caller can act in"
```

---

## Task 12: Wire-level coverage for both new endpoints

**Files:**
- Modify: `backend/test/invite-lifecycle-and-profile.e2e-spec.ts` (it already covers `/api/me`)

- [ ] **Step 1: Write the failing tests**

Add a describe block:

```ts
  describe('GET /api/me/gyms and POST /api/auth/gym-context', () => {
    it('lists both gyms for a coach staffing two', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/me/gyms')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .expect(200);

      const ids = res.body.gyms.map((g: { gymId: string }) => g.gymId);
      expect(ids).toContain(gymId);
      expect(ids).toContain(otherGymId);
      expect(res.body.gyms.every((g: { role: string }) => g.role === 'coach')).toBe(true);
    });

    it('re-signs the token for the second gym', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .send({ gymId: otherGymId })
        .expect(200);

      const claims = JSON.parse(
        Buffer.from(res.body.accessToken.split('.')[1], 'base64').toString('utf8'),
      );
      expect(claims.gymId).toBe(otherGymId);
      expect(claims.role).toBe('coach');
    });

    it('the re-signed token opens the second gym, which the old one could not', async () => {
      // The claim this whole phase exists for: the guard compares route gymId
      // to the token, so the pre-switch token must be refused here.
      await request(app.getHttpServer())
        .get(`/api/gyms/${otherGymId}/configuration/coaches`)
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .expect(403);

      const switched = await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${twoGymCoachToken}`)
        .send({ gymId: otherGymId })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/gyms/${otherGymId}/coach/classes`)
        .set('Authorization', `Bearer ${switched.body.accessToken}`)
        .expect(200);
    });

    it('refuses a gym the caller is not attached to → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ gymId: otherGymId })
        .expect(403);
    });

    it('rejects a non-uuid gymId → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/gym-context')
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({ gymId: 'not-a-uuid' })
        .expect(400);
    });

    it('no auth token → 401', async () => {
      await request(app.getHttpServer()).get('/api/me/gyms').expect(401);
    });
  });
```

Seed a second gym and a coach staffed at both in this spec's setup (follow the existing setup's raw-SQL inserts for `gyms` and `gym_staff`), exposing `otherGymId` and `twoGymCoachToken`.

- [ ] **Step 2: Run to verify failure, then green**

```bash
cd backend && npm test -- invite-lifecycle 2>&1 | tail -15
```

Expected first: FAIL (404 on the new routes). After Tasks 10–11 are wired: all green.

- [ ] **Step 3: Commit**

```bash
git add backend/test
git commit -m "test(backend): cover gym-context switching at the wire"
```

---

## Task 13: The frontend can switch gyms

**Files:**
- Modify: `frontend/context/GymContext.tsx`
- Create: `frontend/components/GymSwitcher.tsx`
- Modify: `frontend/app/(tabs)/schedule.tsx`, `frontend/app/coach-classes.tsx`
- Create: `frontend/__tests__/GymSwitcher.test.tsx`
- Modify: `frontend/__tests__/useGym.test.tsx` (covers `switchGym` itself)

**Interfaces:**
- Consumes: `GET /api/me/gyms`, `POST /api/auth/gym-context`; `AuthContext.login(token)` as the token-storing entry point (`context/AuthContext.tsx:76`); `AuthProvider` wraps `GymProvider` (`app/_layout.tsx:73-75`), so `GymContext` may consume `AuthContext`.
- Produces: `GymContextType` gains `switchGym(gymId: string): Promise<void>`; `<GymSwitcher />` renders nothing when the caller has fewer than two gyms.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/GymSwitcher.test.tsx`:

```tsx
  const twoGyms = {
    gyms: [
      { gymId: 'gym-a', gymName: 'Box A', role: 'coach' },
      { gymId: 'gym-b', gymName: 'Box B', role: 'coach' },
    ],
  };

  it('renders nothing when the user has a single gym', async () => {
    mockGet.mockResolvedValue({ gyms: [twoGyms.gyms[0]] });

    render(<GymSwitcher />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/me/gyms'));
    expect(screen.queryByTestId('gym-switcher')).toBeNull();
  });

  it('offers every gym when there is more than one', async () => {
    mockGet.mockResolvedValue(twoGyms);

    render(<GymSwitcher />);

    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());
    expect(screen.getByText('Box A')).toBeTruthy();
    expect(screen.getByText('Box B')).toBeTruthy();
  });

  it('asks the context to switch to the chosen gym', async () => {
    mockGet.mockResolvedValue(twoGyms);

    render(<GymSwitcher />);
    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    await waitFor(() => expect(mockSwitchGym).toHaveBeenCalledWith('gym-b'));
  });

  it('surfaces a refused switch instead of failing silently', async () => {
    mockGet.mockResolvedValue(twoGyms);
    mockSwitchGym.mockRejectedValue(new Error('Forbidden'));

    render(<GymSwitcher />);
    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    await waitFor(() => expect(screen.getByText('Could not switch gym.')).toBeTruthy());
  });
```

with the context mocked so the component's contract is what is under test:

```tsx
const mockSwitchGym = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({
    currentGymId: 'gym-a',
    isLoading: false,
    setCurrentGymId: jest.fn(),
    switchGym: mockSwitchGym,
  }),
}));
```

The token-storing half of the switch belongs to `GymContext`, not to this component, so it is asserted in `__tests__/useGym.test.tsx` (Step 6) — where `switchGym` is the real implementation over a mocked api client, and the assertions are `login(newToken)` then `setCurrentGymId(gymId)`, in that order, and neither on failure.

Pin the desktop register in this suite (jsdom is 750px → mobile) so both registers get covered across the suite as a whole.

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && npm test -- GymSwitcher 2>&1 | tail -20
```

Expected: FAIL — module not found.

- [ ] **Step 3: Add `switchGym` to `GymContext`**

In `frontend/context/GymContext.tsx`:

```tsx
export interface GymContextType {
  currentGymId: string | null;
  isLoading: boolean;
  setCurrentGymId: (gymId: string) => Promise<void>;
  switchGym: (gymId: string) => Promise<void>;
}
```

```tsx
  /**
   * Switch which gym this session acts in.
   *
   * setCurrentGymId alone only writes local storage, which is why pointing it
   * at a second gym used to produce 403s rather than a switch: the backend
   * authorizes against the token's gymId claim (GymOwnershipGuard), not against
   * this context. The re-signed token is the actual switch; the local id keeps
   * the choice across reloads.
   */
  const switchGym = async (gymId: string): Promise<void> => {
    const client = createApiClient({ token: auth?.token });
    const { accessToken } = await client.post<{ accessToken: string }>(
      '/api/auth/gym-context',
      { gymId },
    );
    await auth?.login(accessToken);
    await setCurrentGymId(gymId);
  };
```

reading `auth` via `useContext(AuthContext)`. The token is stored **before** `currentGymId` moves, so a failure leaves both old — never a local id the token cannot authorize.

- [ ] **Step 4: Build the switcher**

Create `frontend/components/GymSwitcher.tsx` using existing primitives only — `SelectField` when there are more than three gyms, `SegmentedToggle` for two or three — with testIDs `gym-switcher` and `gym-switcher-option-<gymId>`. It fetches `/api/me/gyms` on mount, returns `null` when `gyms.length < 2`, and calls `switchGym(gymId)` on selection. On rejection it shows `Could not switch gym.` as quiet meta text — not a banner. There is no success role, so a successful switch is confirmed by the screen's own data changing.

- [ ] **Step 5: Mount it**

Add `<GymSwitcher />` to the header of `frontend/app/(tabs)/schedule.tsx` (per `MVP_SCREENS.md:49`) and `frontend/app/coach-classes.tsx`. It self-hides for single-gym users, so no conditional is needed at the call sites.

- [ ] **Step 6: Update the existing gym-context test**

`__tests__/useGym.test.tsx` asserts the context's shape; extend it for `switchGym` rather than leaving a partially-typed mock behind.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd frontend && npm test 2>&1 | tail -10 && npx tsc --noEmit 2>&1 | grep -v useRefreshOnAppActive
```

Expected: whole frontend suite green, no new tsc errors.

- [ ] **Step 8: Live screenshot review**

At 1280×832 and 390×844, as a coach staffed at two gyms: the switcher appears, switching redraws the class list for the other gym, and a single-gym athlete sees no switcher at all. Confirm one accent per view.

- [ ] **Step 9: Commit**

```bash
git add frontend/context frontend/components frontend/app frontend/__tests__
git commit -m "feat(frontend): a coach at two gyms can switch which one they act in"
```

---

## Task 14: Journey 16 — a coach staffed at two gyms reaches both

**Files:**
- Create: `frontend/e2e/journeys/16-coach-switches-gyms.spec.ts`

**Interfaces:**
- Consumes: `seedGym`, `withDb` (`e2e/helpers/seed.ts`), `loginAs` (`e2e/helpers/auth.ts`).
- Produces: no new helpers.

- [ ] **Step 1: Write the journey**

```ts
/**
 * Journey 16 — a coach staffed at two gyms can work in both.
 *
 * DATA_MODEL.md:105 grants multi-gym staffing to coaches and gym_staff stores
 * it, but the JWT carries exactly one gymId and GymOwnershipGuard compares it
 * to the route — so before the switcher, every gym but the oldest answered 403
 * in every session, forever. The switch is the whole subject: the class this
 * coach can see BEFORE switching is gym A's, and gym B's only afterwards.
 */
```

Body:

1. `const gymA = await seedGym('j16-gym-a'); const gymB = await seedGym('j16-gym-b');`
2. Staff gym A's coach at gym B too, with a **later** `assignedAt` so the default context stays gym A (that ordering is `DECISIONS.md:189` and is what makes the test meaningful) — a `withDb` insert into `gym_staff`.
3. Seed one class at each gym, with distinguishable class-type names, coached by that person.
4. `loginAs(page, gymA.coach)` → `/coach-classes`. Assert exactly one `coach-class-row-*` and that it contains gym A's class-type name, plus `toHaveCount(0)` for gym B's name — absence with a positive anchor on the same screen.
5. Switch: `page.getByTestId('gym-switcher').click()` then `page.getByTestId('gym-switcher-option-<gymB.id>').click()`.
6. Assert the list is now gym B's: one row, gym B's class-type name present, gym A's absent. Same shape of assertion, inverted — that symmetry is the proof.
7. Reload the page and assert gym B's class is still the one shown: the choice survives, since `currentGymId` persists and the stored token is the re-signed one.

- [ ] **Step 2: Run it**

```bash
cd frontend && npx playwright test e2e/journeys/16-coach-switches-gyms.spec.ts
```

Expected: 1 test passing.

- [ ] **Step 3: Mutation-prove it**

In `frontend/context/GymContext.tsx`, delete `await auth?.login(accessToken)` from `switchGym`, leaving only the local id write — i.e. exactly the pre-existing bug.

Expected: RED — gym B's requests 403 with a stale token, so step 6 finds no row. Revert and confirm:

```bash
cd frontend && git checkout context/GymContext.tsx && git status --short
```

- [ ] **Step 4: Second mutation — the guard itself**

In `backend/src/domain/auth/auth.service.ts`, make `resolveGymContextFor` fall back to `resolveGymContext` instead of throwing when the user is unattached.

Expected: RED in the backend e2e spec from Task 12 (`refuses a gym the caller is not attached to → 403`). If journey 16 stays green that is fine — this mutation is about the refusal, which the wire-level spec owns. Revert.

- [ ] **Step 5: Full verification**

```bash
cd backend && npm test 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5 && npx tsc --noEmit 2>&1 | grep -v useRefreshOnAppActive
cd frontend && npx playwright test 2>&1 | tail -5
```

Expected: backend green, frontend green, 16 e2e journeys green, no new tsc errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e
git commit -m "test(e2e): a coach staffed at two gyms reaches both, mutation-proved"
```

---

## Task 15: Phase 2 documentation and final verification

**Files:**
- Modify: `docs/DECISIONS.md`, `epics/E2E_JOURNEYS.md`, `context/PROJECT_STATE.md`

- [ ] **Step 1: Record the decision**

Append to `docs/DECISIONS.md`:

```markdown
## Gym Context Is Switchable

A user attached to more than one gym may switch which one their session acts in:
`POST /api/auth/gym-context` returns a token re-signed for the named gym, and
`GET /api/me/gyms` lists what they may switch to.

Rationale: `DATA_MODEL.md:105` grants coaches multi-gym staffing and `gym_staff`
stores it, but the JWT carries exactly one `gymId` and `GymOwnershipGuard`
compares it to the route — so every gym but the oldest was unreachable in every
session. Making coach invites work turned that from unreachable into a one-click
path an owner would find immediately.

Rules:

- The caller must have an **active** `gym_staff` row or an **active**
  `gym_membership` at the target gym. Anything else is `403` — never a silent
  fallback to another gym.
- Staff attachment beats membership at the same gym, matching login's own
  `resolveGymContext`.
- This is **not** a general refresh endpoint: it re-signs only for a gym the
  caller is provably attached to. See *Owner Gym Context After Creation*.
- **Deviation from `COMMAND_MODEL.md`:** `SelectActiveGym` lists an active
  `AthleteMembershipPlan` as a precondition. Deliberately not enforced — it
  would turn "joined but has not bought a plan yet" into "cannot see the gym you
  just joined", and class visibility and booking already gate on the plan
  downstream.
- Multi-gym **ownership** remains out of scope (*One Gym Per Owner*). An owner
  who also coaches elsewhere does get the switcher; that is coach staffing.
- The default context on login is still the oldest active attachment. The
  switcher's choice persists client-side in `currentGymId`, not server-side.
```

- [ ] **Step 2: Update tracking docs**

In `epics/E2E_JOURNEYS.md`: journey 16 added and mutation-proved; total 16 tests; note the new measured runtime. In `context/PROJECT_STATE.md`: both phases done, and the switcher recorded as the resolution of the multi-gym finding.

- [ ] **Step 3: Final full verification**

```bash
cd backend && npx tsc --noEmit && npm test 2>&1 | tail -5
cd ../frontend && npx tsc --noEmit 2>&1 | grep -v useRefreshOnAppActive; npm test 2>&1 | tail -5
cd frontend && npx playwright test 2>&1 | tail -5
```

Then Swagger by eye at http://localhost:3000/api-docs: `POST /api/auth/gym-context` and `GET /api/me/gyms` both present and accurate.

Confirm `git status` is clean of stray mutation edits before the last commit.

- [ ] **Step 4: Commit**

```bash
git add docs epics context
git commit -m "docs: gym context is switchable, and why the plan precondition was dropped"
```
