# Recurring Class Series (B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a gym owner define a weekly recurring pattern that expands into concrete published `Class` rows in one action, recording a `ClassSeries` breadcrumb for future management.

**Architecture:** A new `ClassSeries` entity stores the full recurrence rule. A new owner-only CQRS command handler validates the rule, expands weekdays across the date range, skips past + exact-duplicate occurrences, bulk-inserts the surviving classes (each stamped with `seriesId`), and returns a summary. Frontend adds a Single/Recurring toggle to the existing create-class screen (built with Impeccable on the real code). Generated classes are ordinary classes — nothing reads `seriesId` in B1.

**Tech Stack:** NestJS 10 + CQRS + TypeORM (Postgres, `synchronize: true`), class-validator DTOs, Swagger; Jest for backend unit tests. Expo/React Native Web frontend with generated API types.

## Global Constraints

- **Multi-tenant:** every query/mutation enforces `gymId` scoping; no cross-gym access. (CLAUDE.md invariant)
- **Owner-only:** the recurring endpoint uses the same guard stack as single create — `JwtAuthGuard, GymOwnershipGuard, RolesGuard` + `@Role('owner')`.
- **Recurrence rule (option B):** multiple weekdays share one time/duration/coach/space/class-type/capacity. Weekday encoding: `0=Sunday … 6=Saturday` (matches JS `Date.getDay()`).
- **Boundary:** end-date only. Reject if `endDate` is more than **6 calendar months** after `startDate`.
- **Skip, don't block:** skip past occurrences (`skippedPast`); skip exact duplicates — same `classTypeId+coachUserId+spaceId+scheduledDate+scheduledTime` non-deleted class exists (`skippedDuplicate`). Two *different* classes sharing space+time is allowed — no collision check.
- **Zero survivors:** return `{ seriesId: null, created: 0, ... }` and persist **no** series row.
- **Generated classes:** `state: 'published'`, same defaults as single-create (duration default 60, capacity default → `space.baseCapacity`).
- **Swagger is authoritative:** update `@Api*`/`@ApiProperty` decorators; frontend runs `npm run generate:api-types` and imports generated types (never hand-authored).
- **All backend paths from repo root** `backend/` unless noted. Run tests from `backend/`.

---

### Task 1: `ClassSeries` entity + `seriesId` on `ClassEntity`

**Files:**
- Create: `backend/src/domain/class-series/entities/class-series.entity.ts`
- Modify: `backend/src/domain/class/entities/class.entity.ts` (add nullable `seriesId` column)
- Modify: `backend/src/config/database.config.ts` (register `ClassSeriesEntity`)

**Interfaces:**
- Produces: `ClassSeriesEntity` with fields `id, gymId, classTypeId, coachUserId, spaceId, weekdays (int[]), scheduledTime (string), duration (number), capacity (number|null), startDate (Date), endDate (Date), createdByUserId, createdAt`. `ClassEntity.seriesId: string | null`.

- [ ] **Step 1: Create the entity**

`backend/src/domain/class-series/entities/class-series.entity.ts`:

```typescript
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('class_series')
@Index(['gymId'])
export class ClassSeriesEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('uuid')
  classTypeId: string;

  @Column('uuid')
  coachUserId: string;

  @Column('uuid')
  spaceId: string;

  // Days of week the series runs on. 0=Sunday … 6=Saturday.
  @Column('int', { array: true })
  weekdays: number[];

  @Column('time')
  scheduledTime: string;

  @Column('integer', { default: 60 })
  duration: number;

  @Column('integer', { nullable: true })
  capacity: number | null;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('uuid')
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Add `seriesId` to `ClassEntity`**

In `backend/src/domain/class/entities/class.entity.ts`, add after the `duration` column (around line 51):

```typescript
  @Column('uuid', { nullable: true })
  seriesId: string | null;
```

- [ ] **Step 3: Register the entity**

In `backend/src/config/database.config.ts`, import and add `ClassSeriesEntity` to the `entities` array:

```typescript
import { ClassSeriesEntity } from '../domain/class-series/entities/class-series.entity';
```
Add `ClassSeriesEntity,` to the `entities: [ ... ]` list.

- [ ] **Step 4: Verify it compiles and the app boots**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors (pre-existing test-file errors unrelated to this change may remain).

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/class-series/entities/class-series.entity.ts backend/src/domain/class/entities/class.entity.ts backend/src/config/database.config.ts
git commit -m "feat(backend): add ClassSeries entity + nullable seriesId on Class"
```

---

### Task 2: Recurrence expansion utility (pure function, fully unit-tested)

This isolates the date math — the part most prone to off-by-one and DST bugs — into a pure, dependency-free function so it can be exhaustively tested without mocks.

**Files:**
- Create: `backend/src/commands/class/recurrence/expand-occurrences.ts`
- Test: `backend/src/commands/class/recurrence/expand-occurrences.spec.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function expandOccurrences(input: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    weekdays: number[]; // 0..6, JS getDay()
  }): string[]; // ordered YYYY-MM-DD dates whose weekday ∈ weekdays, inclusive of both ends
  ```
- Consumed by Task 5 (handler).

- [ ] **Step 1: Write the failing tests**

`backend/src/commands/class/recurrence/expand-occurrences.spec.ts`:

```typescript
import { expandOccurrences } from './expand-occurrences';

describe('expandOccurrences', () => {
  it('returns each matching weekday across the range, inclusive', () => {
    // 2026-08-03 is a Monday. Mon/Wed/Fri = [1,3,5].
    const result = expandOccurrences({
      startDate: '2026-08-03',
      endDate: '2026-08-14',
      weekdays: [1, 3, 5],
    });
    expect(result).toEqual([
      '2026-08-03', // Mon
      '2026-08-05', // Wed
      '2026-08-07', // Fri
      '2026-08-10', // Mon
      '2026-08-12', // Wed
      '2026-08-14', // Fri
    ]);
  });

  it('includes the start date when it matches a weekday', () => {
    // 2026-08-03 is a Monday
    expect(
      expandOccurrences({ startDate: '2026-08-03', endDate: '2026-08-03', weekdays: [1] }),
    ).toEqual(['2026-08-03']);
  });

  it('returns empty when no day in range matches', () => {
    // 2026-08-03 Mon .. 2026-08-04 Tue, asking for Sunday only
    expect(
      expandOccurrences({ startDate: '2026-08-03', endDate: '2026-08-04', weekdays: [0] }),
    ).toEqual([]);
  });

  it('is stable across a DST boundary (US spring-forward 2026-03-08)', () => {
    // Sundays [0] spanning the DST change; must not drift a day.
    const result = expandOccurrences({
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      weekdays: [0],
    });
    expect(result).toEqual(['2026-03-01', '2026-03-08', '2026-03-15']);
  });

  it('returns dates in ascending order for multiple weekdays', () => {
    const result = expandOccurrences({
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      weekdays: [5, 1, 3], // unordered input
    });
    expect(result).toEqual(['2026-08-03', '2026-08-05', '2026-08-07']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest expand-occurrences`
Expected: FAIL — `expandOccurrences is not a function` / module not found.

- [ ] **Step 3: Implement the utility**

`backend/src/commands/class/recurrence/expand-occurrences.ts`:

```typescript
/**
 * Expand a weekly recurrence rule into concrete calendar dates.
 *
 * Uses UTC date arithmetic to step day-by-day so results never drift across
 * daylight-saving boundaries. Weekday encoding matches JS Date.getUTCDay():
 * 0=Sunday … 6=Saturday. Both ends of the range are inclusive.
 */
export function expandOccurrences(input: {
  startDate: string;
  endDate: string;
  weekdays: number[];
}): string[] {
  const weekdaySet = new Set(input.weekdays);
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const end = new Date(`${input.endDate}T00:00:00.000Z`);
  const dates: string[] = [];

  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (weekdaySet.has(d.getUTCDay())) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest expand-occurrences`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/commands/class/recurrence/
git commit -m "feat(backend): add pure weekly recurrence expansion utility"
```

---

### Task 3: Repository — bulk save + existing-occurrence lookup

**Files:**
- Modify: `backend/src/repositories/class.repository.ts`
- Test: `backend/src/repositories/class.repository.spec.ts` (create if absent)

**Interfaces:**
- Produces on `ClassRepository`:
  - `saveMany(classes: ClassEntity[]): Promise<ClassEntity[]>` — **already exists**, reuse it.
  - `findMatchingOccurrences(params: { gymId: string; classTypeId: string; coachUserId: string; spaceId: string; dates: string[]; scheduledTime: string; }): Promise<Array<{ scheduledDate: string }>>` — returns non-deleted classes matching the shared series fields whose `scheduledDate` ∈ `dates` and same `scheduledTime`. Used to detect exact duplicates.
- Consumed by Task 5 (handler).

- [ ] **Step 1: Write the failing test**

Add to `backend/src/repositories/class.repository.spec.ts` (create the file with the standard `TypeOrmModule` in-memory-style mock if it does not exist; if a repo spec pattern is absent in the codebase, use a mocked `Repository` via `getRepositoryToken(ClassEntity)`):

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClassRepository } from './class.repository';
import { ClassEntity } from '../domain/class/entities/class.entity';

describe('ClassRepository.findMatchingOccurrences', () => {
  let repo: ClassRepository;
  const find = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassRepository,
        { provide: getRepositoryToken(ClassEntity), useValue: { find } },
      ],
    }).compile();
    repo = moduleRef.get(ClassRepository);
    find.mockReset();
  });

  it('queries non-deleted classes matching all shared fields, dates, and time', async () => {
    find.mockResolvedValueOnce([{ scheduledDate: '2026-08-03' }]);
    const result = await repo.findMatchingOccurrences({
      gymId: 'g1',
      classTypeId: 'ct1',
      coachUserId: 'c1',
      spaceId: 's1',
      dates: ['2026-08-03', '2026-08-05'],
      scheduledTime: '08:00',
    });
    expect(find).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ scheduledDate: '2026-08-03' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest class.repository`
Expected: FAIL — `findMatchingOccurrences is not a function`.

- [ ] **Step 3: Implement the method**

In `backend/src/repositories/class.repository.ts`, ensure `In`, `IsNull` are imported (they are), then add:

```typescript
  /**
   * Find non-deleted classes that exactly match a series' shared fields on any
   * of the given dates at the given time. Used to skip exact-duplicate
   * occurrences when generating a recurring series (idempotent re-runs).
   */
  async findMatchingOccurrences(params: {
    gymId: string;
    classTypeId: string;
    coachUserId: string;
    spaceId: string;
    dates: string[];
    scheduledTime: string;
  }): Promise<Array<{ scheduledDate: string }>> {
    if (params.dates.length === 0) return [];
    const rows = await this.classRepository.find({
      where: {
        gymId: params.gymId,
        classTypeId: params.classTypeId,
        coachUserId: params.coachUserId,
        spaceId: params.spaceId,
        scheduledTime: params.scheduledTime,
        scheduledDate: In(params.dates) as unknown as Date,
        deletedAt: IsNull(),
      },
      select: ['scheduledDate'],
    });
    return rows.map((r) => ({
      scheduledDate:
        r.scheduledDate instanceof Date
          ? r.scheduledDate.toISOString().slice(0, 10)
          : String(r.scheduledDate),
    }));
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest class.repository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/class.repository.ts backend/src/repositories/class.repository.spec.ts
git commit -m "feat(backend): add findMatchingOccurrences to ClassRepository"
```

---

### Task 4: ClassSeries repository + DTOs

**Files:**
- Create: `backend/src/repositories/class-series.repository.ts`
- Create: `backend/src/commands/class/dto/create-recurring-classes.dto.ts`
- Create: `backend/src/commands/class/dto/create-recurring-classes-response.dto.ts`

**Interfaces:**
- Produces:
  - `ClassSeriesRepository.save(series: ClassSeriesEntity): Promise<ClassSeriesEntity>`.
  - `CreateRecurringClassesDto` (request) and `CreateRecurringClassesResponseDto` (`{ seriesId: string | null; created: number; skippedPast: number; skippedDuplicate: number }`).
- Consumed by Tasks 5, 6.

- [ ] **Step 1: Create the ClassSeries repository**

`backend/src/repositories/class-series.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSeriesEntity } from '../domain/class-series/entities/class-series.entity';

@Injectable()
export class ClassSeriesRepository {
  constructor(
    @InjectRepository(ClassSeriesEntity)
    private readonly repo: Repository<ClassSeriesEntity>,
  ) {}

  async save(series: ClassSeriesEntity): Promise<ClassSeriesEntity> {
    return this.repo.save(series);
  }
}
```

- [ ] **Step 2: Create the request DTO**

`backend/src/commands/class/dto/create-recurring-classes.dto.ts`:

```typescript
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecurringClassesDto {
  @ApiProperty({ example: 'uuid-class-type-id' })
  @IsString()
  classTypeId: string;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  @IsString()
  coachUserId: string;

  @ApiProperty({ example: 'uuid-space-id' })
  @IsString()
  spaceId: string;

  @ApiProperty({
    example: [1, 3, 5],
    description: 'Days of week. 0=Sunday … 6=Saturday. At least one, unique.',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  weekdays: number[];

  @ApiProperty({ example: '08:00', description: 'Time in HH:mm format' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  scheduledTime: string;

  @ApiProperty({ example: '2026-08-03', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 20, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  capacity?: number;

  @ApiProperty({ example: 60, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'duration must be at least 1' })
  duration?: number;
}
```

Note: `weekdays` upper bound (≤6) is enforced in the handler (Task 5) since class-validator lacks a per-element `Max`+`each` combo cleanly here; add `@Max(6, { each: true })` from `class-validator` as well for defense-in-depth.

- [ ] **Step 3: Create the response DTO**

`backend/src/commands/class/dto/create-recurring-classes-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecurringClassesResponseDto {
  @ApiProperty({
    example: 'uuid-series-id',
    nullable: true,
    description: 'The created series id, or null when no classes were created.',
  })
  seriesId: string | null;

  @ApiProperty({ example: 24, description: 'Number of classes created.' })
  created: number;

  @ApiProperty({ example: 2, description: 'Occurrences skipped for being in the past.' })
  skippedPast: number;

  @ApiProperty({ example: 1, description: 'Occurrences skipped as exact duplicates.' })
  skippedDuplicate: number;
}
```

- [ ] **Step 4: Verify compile**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/class-series.repository.ts backend/src/commands/class/dto/create-recurring-classes.dto.ts backend/src/commands/class/dto/create-recurring-classes-response.dto.ts
git commit -m "feat(backend): add ClassSeries repository + recurring DTOs"
```

---

### Task 5: Command + handler (the core — TDD)

**Files:**
- Create: `backend/src/commands/class/create-recurring-classes.command.ts`
- Create: `backend/src/commands/class/handlers/create-recurring-classes.handler.ts`
- Test: `backend/src/commands/class/handlers/create-recurring-classes.handler.spec.ts`

**Interfaces:**
- Consumes: `expandOccurrences` (Task 2); `ClassRepository.saveMany` + `findMatchingOccurrences` (Task 3); `ClassSeriesRepository.save` (Task 4); `GymService`, `GymStaffService`, `SpaceService`, `ClassTypeService` (existing, same as create-class); exceptions `notFound/forbidden/invalidState`.
- Produces: `CreateRecurringClassesCommand(userId, gymId, dto: CreateRecurringClassesDto)` and `CreateRecurringClassesHandler` returning `CreateRecurringClassesResponseDto`.

- [ ] **Step 1: Create the command**

`backend/src/commands/class/create-recurring-classes.command.ts`:

```typescript
import { ICommand } from '@nestjs/cqrs';
import { CreateRecurringClassesDto } from './dto/create-recurring-classes.dto';

export class CreateRecurringClassesCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly dto: CreateRecurringClassesDto,
  ) {}
}
```

- [ ] **Step 2: Write the failing tests**

`backend/src/commands/class/handlers/create-recurring-classes.handler.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateRecurringClassesHandler } from './create-recurring-classes.handler';
import { CreateRecurringClassesCommand } from '../create-recurring-classes.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassSeriesRepository } from '../../../repositories/class-series.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';

// A fixed "now" far in the past so all 2026 test dates are in the future.
// Handler reads current time via `new Date()`; we fake it with jest timers.
const NOW = new Date('2026-08-01T09:00:00.000Z');

describe('CreateRecurringClassesHandler', () => {
  let handler: CreateRecurringClassesHandler;
  let classRepository: ClassRepository;
  let seriesRepository: ClassSeriesRepository;
  let gymService: GymService;
  let gymStaffService: GymStaffService;
  let spaceService: SpaceService;
  let classTypeService: ClassTypeService;

  const gymId = 'gym-1';
  const userId = 'owner-1';

  const baseDto = {
    classTypeId: 'ct-1',
    coachUserId: 'coach-1',
    spaceId: 'space-1',
    weekdays: [1, 3, 5], // Mon/Wed/Fri
    scheduledTime: '08:00',
    startDate: '2026-08-03', // Monday
    endDate: '2026-08-14',
  };

  const okPreconditions = () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
    jest.spyOn(gymService, 'getGymById').mockResolvedValue({ status: 'active' } as any);
    jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({ gymId } as any);
    jest
      .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
      .mockResolvedValue({ role: 'coach', status: 'active' } as any);
    jest
      .spyOn(spaceService, 'getSpaceById')
      .mockResolvedValue({ gymId, baseCapacity: 30 } as any);
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRecurringClassesHandler,
        {
          provide: ClassRepository,
          useValue: { saveMany: jest.fn((c) => Promise.resolve(c)), findMatchingOccurrences: jest.fn().mockResolvedValue([]) },
        },
        { provide: ClassSeriesRepository, useValue: { save: jest.fn((s) => Promise.resolve(s)) } },
        { provide: GymService, useValue: { getGymById: jest.fn() } },
        { provide: GymStaffService, useValue: { isGymOwner: jest.fn(), getGymStaffByUserAndGym: jest.fn() } },
        { provide: SpaceService, useValue: { getSpaceById: jest.fn() } },
        { provide: ClassTypeService, useValue: { getClassTypeById: jest.fn() } },
      ],
    }).compile();

    handler = module.get(CreateRecurringClassesHandler);
    classRepository = module.get(ClassRepository);
    seriesRepository = module.get(ClassSeriesRepository);
    gymService = module.get(GymService);
    gymStaffService = module.get(GymStaffService);
    spaceService = module.get(SpaceService);
    classTypeService = module.get(ClassTypeService);
  });

  afterEach(() => jest.useRealTimers());

  it('creates one class per matching occurrence and persists the series', async () => {
    okPreconditions();
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );
    // Mon/Wed/Fri across 08-03..08-14 = 6 occurrences, all future.
    expect(result.created).toBe(6);
    expect(result.skippedPast).toBe(0);
    expect(result.skippedDuplicate).toBe(0);
    expect(result.seriesId).toBeTruthy();
    expect(seriesRepository.save).toHaveBeenCalledTimes(1);
    const saved = (classRepository.saveMany as jest.Mock).mock.calls[0][0];
    expect(saved).toHaveLength(6);
    expect(saved.every((c: any) => c.state === 'published')).toBe(true);
    expect(saved.every((c: any) => c.seriesId === result.seriesId)).toBe(true);
    expect(saved.every((c: any) => c.capacity === 30)).toBe(true); // space base capacity
  });

  it('skips past occurrences and reports them', async () => {
    okPreconditions();
    // startDate before NOW: 07-27 Mon .. 08-07 Fri. Occurrences before 08-01 09:00 are past.
    const dto = { ...baseDto, startDate: '2026-07-27', endDate: '2026-08-07' };
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    // Mon/Wed/Fri: 07-27,07-29,07-31 (past) + 08-03,08-05,08-07 (future) = 3 created, 3 skipped past.
    expect(result.created).toBe(3);
    expect(result.skippedPast).toBe(3);
  });

  it('skips exact duplicates and reports them', async () => {
    okPreconditions();
    (classRepository.findMatchingOccurrences as jest.Mock).mockResolvedValueOnce([
      { scheduledDate: '2026-08-05' },
    ]);
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, baseDto as any),
    );
    expect(result.created).toBe(5);
    expect(result.skippedDuplicate).toBe(1);
  });

  it('returns created:0 and null seriesId when everything is skipped, persisting no series', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-07-06', endDate: '2026-07-10' }; // all past
    const result = await handler.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto as any),
    );
    expect(result.created).toBe(0);
    expect(result.seriesId).toBeNull();
    expect(seriesRepository.save).not.toHaveBeenCalled();
    expect(classRepository.saveMany).not.toHaveBeenCalled();
  });

  it('rejects a range exceeding 6 months', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-08-03', endDate: '2027-03-01' };
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, dto as any)),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects endDate before startDate', async () => {
    okPreconditions();
    const dto = { ...baseDto, startDate: '2026-08-14', endDate: '2026-08-03' };
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, dto as any)),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws Forbidden if not gym owner', async () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, baseDto as any)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFound if class type not found', async () => {
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
    jest.spyOn(gymService, 'getGymById').mockResolvedValue({ status: 'active' } as any);
    jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue(null);
    await expect(
      handler.execute(new CreateRecurringClassesCommand(userId, gymId, baseDto as any)),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest create-recurring-classes.handler`
Expected: FAIL — handler module not found.

- [ ] **Step 4: Implement the handler**

`backend/src/commands/class/handlers/create-recurring-classes.handler.ts`:

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateRecurringClassesCommand } from '../create-recurring-classes.command';
import { CreateRecurringClassesResponseDto } from '../dto/create-recurring-classes-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassSeriesRepository } from '../../../repositories/class-series.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { ClassSeriesEntity } from '../../../domain/class-series/entities/class-series.entity';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { expandOccurrences } from '../recurrence/expand-occurrences';

@CommandHandler(CreateRecurringClassesCommand)
export class CreateRecurringClassesHandler
  implements ICommandHandler<CreateRecurringClassesCommand>
{
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(ClassSeriesRepository)
    private readonly seriesRepository: ClassSeriesRepository,
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @Inject(ClassTypeService) private readonly classTypeService: ClassTypeService,
  ) {}

  async execute(
    command: CreateRecurringClassesCommand,
  ): Promise<CreateRecurringClassesResponseDto> {
    const { userId, gymId, dto } = command;

    // Rule validation
    if (dto.weekdays.some((w) => w < 0 || w > 6)) {
      throw invalidState('weekdays must be between 0 and 6');
    }
    const start = new Date(`${dto.startDate}T00:00:00.000Z`);
    const end = new Date(`${dto.endDate}T00:00:00.000Z`);
    if (end.getTime() < start.getTime()) {
      throw invalidState('endDate must be on or after startDate');
    }
    const sixMonthsOut = new Date(start);
    sixMonthsOut.setUTCMonth(sixMonthsOut.getUTCMonth() + 6);
    if (end.getTime() > sixMonthsOut.getTime()) {
      throw invalidState('Recurring series cannot span more than 6 months');
    }

    // Shared-entity preconditions (mirror create-class)
    if (!(await this.gymStaffService.isGymOwner(userId, gymId))) {
      throw forbidden('User is not a gym owner for this gym');
    }
    const gym = await this.gymService.getGymById(gymId);
    if (!gym) throw notFound('Gym not found');
    if (gym.status !== 'active') throw invalidState('Gym is not active');

    const classType = await this.classTypeService.getClassTypeById(dto.classTypeId);
    if (!classType) throw notFound('ClassType not found');
    if (classType.gymId !== gymId) {
      throw invalidState('ClassType does not belong to this gym');
    }

    const coachStaff = await this.gymStaffService.getGymStaffByUserAndGym(
      dto.coachUserId,
      gymId,
    );
    if (!coachStaff) throw notFound('Coach is not assigned to this gym');
    if (coachStaff.role !== 'coach') throw invalidState('Staff member is not a coach');
    if (coachStaff.status !== 'active') throw invalidState('Coach is not active');

    const space = await this.spaceService.getSpaceById(dto.spaceId);
    if (!space) throw notFound('Space not found');
    if (space.gymId !== gymId) throw invalidState('Space does not belong to this gym');

    const capacity = dto.capacity ?? space.baseCapacity;
    if (capacity <= 0) throw invalidState('Capacity must be greater than 0');
    const duration = dto.duration ?? 60;

    // Expand + filter
    const allDates = expandOccurrences({
      startDate: dto.startDate,
      endDate: dto.endDate,
      weekdays: dto.weekdays,
    });

    const now = new Date();
    let skippedPast = 0;
    const futureDates = allDates.filter((date) => {
      const dt = new Date(`${date}T${dto.scheduledTime}:00`);
      if (dt.getTime() <= now.getTime()) {
        skippedPast++;
        return false;
      }
      return true;
    });

    const existing = await this.classRepository.findMatchingOccurrences({
      gymId,
      classTypeId: dto.classTypeId,
      coachUserId: dto.coachUserId,
      spaceId: dto.spaceId,
      dates: futureDates,
      scheduledTime: dto.scheduledTime,
    });
    const existingDates = new Set(existing.map((e) => e.scheduledDate));
    let skippedDuplicate = 0;
    const finalDates = futureDates.filter((date) => {
      if (existingDates.has(date)) {
        skippedDuplicate++;
        return false;
      }
      return true;
    });

    if (finalDates.length === 0) {
      return { seriesId: null, created: 0, skippedPast, skippedDuplicate };
    }

    // Persist series then classes
    const seriesId = uuid();
    const series = new ClassSeriesEntity();
    series.id = seriesId;
    series.gymId = gymId;
    series.classTypeId = dto.classTypeId;
    series.coachUserId = dto.coachUserId;
    series.spaceId = dto.spaceId;
    series.weekdays = dto.weekdays;
    series.scheduledTime = dto.scheduledTime;
    series.duration = duration;
    series.capacity = dto.capacity ?? null;
    series.startDate = start;
    series.endDate = end;
    series.createdByUserId = userId;
    series.createdAt = now;
    await this.seriesRepository.save(series);

    const classes = finalDates.map((date) => {
      const c = new ClassEntity();
      c.id = uuid();
      c.gymId = gymId;
      c.classTypeId = dto.classTypeId;
      c.coachUserId = dto.coachUserId;
      c.spaceId = dto.spaceId;
      c.scheduledDate = new Date(`${date}T00:00:00.000Z`);
      c.scheduledTime = dto.scheduledTime;
      c.capacity = capacity;
      c.duration = duration;
      c.state = 'published';
      c.seriesId = seriesId;
      c.createdAt = now;
      c.lastModifiedAt = now;
      c.deletedAt = null;
      return c;
    });
    await this.classRepository.saveMany(classes);

    return {
      seriesId,
      created: classes.length,
      skippedPast,
      skippedDuplicate,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest create-recurring-classes.handler`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add backend/src/commands/class/create-recurring-classes.command.ts backend/src/commands/class/handlers/create-recurring-classes.handler.ts backend/src/commands/class/handlers/create-recurring-classes.handler.spec.ts
git commit -m "feat(backend): add recurring-class generation handler"
```

---

### Task 6: Wire module + controller endpoint + Swagger

**Files:**
- Modify: `backend/src/domain/class/class.module.ts` (register entity, repository, handler)
- Modify: `backend/src/api/class/class-scheduling.controller.ts` (add `POST /recurring`)

**Interfaces:**
- Consumes: `CreateRecurringClassesCommand`, DTOs (Tasks 4–5).
- Produces: live endpoint `POST /api/gyms/:gymId/classes/recurring`.

- [ ] **Step 1: Register in the module**

In `backend/src/domain/class/class.module.ts`:
- Import `ClassSeriesEntity`, `ClassSeriesRepository`, `CreateRecurringClassesHandler`.
- Add `ClassSeriesEntity` to `TypeOrmModule.forFeature([...])`.
- Add `CreateRecurringClassesHandler` to the `CommandHandlers` array.
- Add `ClassSeriesRepository` to `providers`.

- [ ] **Step 2: Add the controller endpoint**

In `backend/src/api/class/class-scheduling.controller.ts`, add imports for `CreateRecurringClassesDto`, `CreateRecurringClassesCommand`, `CreateRecurringClassesResponseDto`, then add this method after `createClass`:

```typescript
  @Post('/recurring')
  @Role('owner')
  @ApiOperation({
    summary: 'Create a recurring series of classes',
    description:
      'Generate multiple classes from a weekly recurrence rule (weekdays + shared time, bounded by an end date within 6 months). Skips past and exact-duplicate occurrences and returns a summary. Only gym owners can create classes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateRecurringClassesDto })
  @ApiResponse({
    status: 201,
    description: 'Series generated',
    type: CreateRecurringClassesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid rule (bad range, >6 months, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createRecurringClasses(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) dto: CreateRecurringClassesDto,
    @CurrentUser() userId: string,
  ): Promise<CreateRecurringClassesResponseDto> {
    return this.commandBus.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto),
    );
  }
```

Note: route ordering — `/recurring` must be declared **before** the `@Get('/:classId')` dynamic route is not a concern here (that's a GET; this is POST with no conflicting POST param route), so placement after `createClass` is fine.

- [ ] **Step 3: Verify the app boots and endpoint appears in Swagger**

Run: `cd backend && npm run start:dev` (or existing dev script); open `http://localhost:3000/api-docs` and confirm `POST /api/gyms/{gymId}/classes/recurring` is listed with the DTO schema. Then stop the server.

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: new tests pass; no regressions beyond any pre-existing known failures.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/class/class.module.ts backend/src/api/class/class-scheduling.controller.ts
git commit -m "feat(backend): expose POST /classes/recurring endpoint + swagger"
```

---

### Task 7: Regenerate frontend API types

**Files:**
- Modify: `frontend/types/api.gen.ts` (generated — do not hand-edit)

- [ ] **Step 1: Ensure backend is running (types are generated from live Swagger)**

Run backend dev server per the existing workflow (`backend/` start script).

- [ ] **Step 2: Regenerate**

Run: `cd frontend && npm run generate:api-types`

- [ ] **Step 3: Verify the new types exist**

Confirm `frontend/types/api.gen.ts` contains `CreateRecurringClassesDto` and `CreateRecurringClassesResponseDto` under `components['schemas']`.

- [ ] **Step 4: Commit**

```bash
git add frontend/types/api.gen.ts
git commit -m "chore(frontend): regenerate API types for recurring classes"
```

---

### Task 8: Frontend — Single/Recurring toggle on create-class (Impeccable)

This task is built with the **Impeccable** skill directly on the real code, matching the current owner create-class screen styling (the incumbent visual world). No `.pen` mock. Load `impeccable` and run its `context.mjs` targeting `frontend/app/create-class.tsx` first.

**Files:**
- Modify: `frontend/app/create-class.tsx`
- Modify: `frontend/app/create-class.styles.ts` (if new styles needed — follow existing tokens)

**Interfaces:**
- Consumes: `components['schemas']['CreateRecurringClassesDto']` / `...ResponseDto` from `@/types/api.gen`; existing `PickerField`, `TextField`, `DateTimeField` components in the file; `createApiClient`.

- [ ] **Step 1: Add mode state + toggle UI**

Add `const [mode, setMode] = useState<'single' | 'recurring'>('single');` and a segmented toggle (two buttons "Single" / "Recurring") at the top of the form card, styled with existing tokens. Single mode renders the current form unchanged.

- [ ] **Step 2: Add recurring-only fields**

When `mode === 'recurring'`:
- Replace the single "Date" `DateTimeField` with two: **Start Date** and **End Date** (both `mode="date"`).
- Add a **weekday selector**: seven toggle chips (Mon–Sun) mapping to `[1,2,3,4,5,6,0]`; track `selectedWeekdays: number[]` in form state. At least one must be selected.
- Keep Time, Class Type, Coach, Space, Capacity, Duration as-is.

- [ ] **Step 3: Branch submit + validation**

Extend `validate` for recurring mode: ≥1 weekday, valid start/end (`end >= start`), valid time. In `handleSubmit`, when recurring, POST to `/api/gyms/${currentGymId}/classes/recurring` with a `CreateRecurringClassesDto` payload; on success capture the `CreateRecurringClassesResponseDto`.

- [ ] **Step 4: Show the summary result**

On recurring success, before `router.back()`, surface a summary message, e.g. *"Created {created} classes · {skippedPast} skipped (past) · {skippedDuplicate} skipped (already scheduled)."* If `created === 0`, show an explanatory banner (reuse the `submitError`/banner style, non-error variant) and do **not** navigate away, so the owner can adjust.

- [ ] **Step 5: Verify types + lint**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Live-verify with Impeccable**

Run the app; in both mobile (390×844) and desktop widths, switch to Recurring, pick Mon/Wed/Fri, a time, a 2-week range, submit, and confirm the summary. Run Impeccable's finish review (batched desktop+mobile screenshots) and apply fixes in one pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/create-class.tsx frontend/app/create-class.styles.ts
git commit -m "feat(frontend): add recurring-series mode to create-class screen"
```

---

### Task 9: Documentation sync

**Files:**
- Modify: `docs/DATA_MODEL.md` (add `ClassSeries` entity; note `seriesId` on Class)
- Modify: `context/PROJECT_STATE.md` (mark B1 endpoint done)
- Modify: `epics/RECURRING_CLASSES_EPIC.md` (status → in progress/done)

- [ ] **Step 1: Update DATA_MODEL.md**

Add a `ClassSeries` entity section (fields per Task 1) after the `Class` section, and add `series_id (nullable FK to ClassSeries)` to the `Class` field list. Note B1 does not read it.

- [ ] **Step 2: Update PROJECT_STATE.md**

Add `✅ POST /api/gyms/:gymId/classes/recurring (owner — generate recurring series)` to the class endpoints list.

- [ ] **Step 3: Update the epic status**

Set the epic `Status:` appropriately and check off the Included scope items delivered.

- [ ] **Step 4: Commit**

```bash
git add docs/DATA_MODEL.md context/PROJECT_STATE.md epics/RECURRING_CLASSES_EPIC.md
git commit -m "docs: sync data model + project state for recurring classes (B1)"
```

---

## Self-Review

**Spec coverage:** Data model → Task 1. Generation contract (validate/cap/expand/skip-past/skip-dup/zero-survivor/summary) → Tasks 2,3,5. Endpoint + Swagger → Task 6. Type generation → Task 7. Frontend toggle + summary → Task 8. Doc sync → Task 9. All spec sections mapped.

**Placeholder scan:** No TBD/TODO; all code steps carry concrete code; test bodies are real.

**Type consistency:** `findMatchingOccurrences` signature identical in Tasks 3 and 5; `expandOccurrences` signature identical in Tasks 2 and 5; `CreateRecurringClassesResponseDto` shape (`seriesId|created|skippedPast|skippedDuplicate`) identical across Tasks 4, 5, 6, 8; weekday encoding `0=Sun..6=Sat` consistent across entity, DTO, util, and frontend chip mapping.

**Known nuance flagged:** the handler reads "now" via `new Date()`; the handler spec uses `jest.useFakeTimers().setSystemTime()` to make 2026 test dates deterministically future/past. The `expandOccurrences` util is UTC-based to avoid DST drift; the past-check combines date + local `scheduledTime` — acceptable for MVP (server timezone). If the team runs servers in a non-UTC zone and wants strict box-local past semantics, that's a future refinement, not B1 scope.
