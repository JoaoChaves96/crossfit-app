# CreateClass Refactoring: Before & After Code Comparison

## File 1: Service → Repository

### ❌ BEFORE: ClassService (Violated Agent Rules)

**File:** `backend/src/domain/class/class.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from './entities/class.entity';
import { v4 as uuid } from 'uuid';

export interface CreateClassInput {
  gymId: string;
  classTypeId: string;
  coachUserId: string;
  spaceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  capacity: number;
  state: string;
  createdAt: Date;
  lastModifiedAt: Date;
}

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  async createClass(input: CreateClassInput): Promise<ClassEntity> {
    // ❌ VIOLATION: Service creates entity
    const classEntity = this.classRepository.create({
      id: uuid(),                    // ❌ Service generates ID
      gymId: input.gymId,
      classTypeId: input.classTypeId,
      coachUserId: input.coachUserId,
      spaceId: input.spaceId,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      capacity: input.capacity,
      state: input.state,            // ❌ Service decides state
      createdAt: input.createdAt,    // ❌ Service sets timestamp
      lastModifiedAt: input.lastModifiedAt,
      deletedAt: null,
    });
    return this.classRepository.save(classEntity);
  }

  // Query methods are OK
  async getClassById(classId: string): Promise<ClassEntity | null> { ... }
  async getClassesByGym(gymId: string): Promise<ClassEntity[]> { ... }
  async getClassesByCoach(coachUserId: string): Promise<ClassEntity[]> { ... }
  async getClassesByGymAndState(gymId: string, state: string): Promise<ClassEntity[]> { ... }
}
```

**Violations:**
- ❌ `createClass()` method creates entity (forbidden)
- ❌ Service generates UUID (handler should decide)
- ❌ Service decides `state = input.state` (handler should decide)
- ❌ Service sets timestamps (handler should decide)
- ❌ Accepts `CreateClassInput` which resembles a command DTO

---

### ✅ AFTER: ClassRepository (Agent-Compliant)

**File:** `backend/src/repositories/class.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../domain/class/entities/class.entity';

/**
 * ClassRepository: Pure persistence layer
 *
 * Responsibilities:
 * - Persist ClassEntity instances
 * - Query/retrieve ClassEntity instances
 * - Validate existence and ownership
 *
 * MUST NOT:
 * - Create domain entities (that's the handler's job)
 * - Decide initial state or timestamps
 * - Accept command-like DTOs
 */
@Injectable()
export class ClassRepository {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  /**
   * Persist a ClassEntity to the database
   * Entity must be complete (handler decides all state)
   */
  async save(classEntity: ClassEntity): Promise<ClassEntity> {
    return this.classRepository.save(classEntity);
  }

  async getClassById(classId: string): Promise<ClassEntity | null> { ... }
  async getClassesByGym(gymId: string): Promise<ClassEntity[]> { ... }
  async getClassesByCoach(coachUserId: string): Promise<ClassEntity[]> { ... }
  async getClassesByGymAndState(gymId: string, state: string): Promise<ClassEntity[]> { ... }
  async classExists(classId: string): Promise<boolean> { ... }
}
```

**Compliance:**
- ✅ No `createClass()` method (no entity creation)
- ✅ `save()` only persists (zero decisions)
- ✅ No UUID generation
- ✅ No state/timestamp logic
- ✅ Only query-only methods

---

## File 2: Handler - Entity Creation Logic

### ❌ BEFORE: Handler Delegates to Service

**File:** `backend/src/commands/class/handlers/create-class.handler.ts` (excerpt)

```typescript
@CommandHandler(CreateClassCommand)
export class CreateClassHandler implements ICommandHandler<CreateClassCommand> {
  constructor(
    @Inject(ClassService)
    private readonly classService: ClassService,  // ← Delegates to service
    // ... other services ...
  ) {}

  async execute(command: CreateClassCommand): Promise<CreateClassResponseDto> {
    // Preconditions 1-7 ...
    // ... validation ...

    // ❌ Handler abdicates responsibility
    const newClass = await this.classService.createClass({
      gymId: command.gymId,
      classTypeId: command.classTypeId,
      coachUserId: command.coachUserId,
      spaceId: command.spaceId,
      scheduledDate: this.toDate(command.scheduledDate),
      scheduledTime: command.scheduledTime,
      capacity,
      state: 'published',      // ← But handler still passes state!
      createdAt: now,          // ← Handler passes timestamp too
      lastModifiedAt: now,
    });

    return this.mapToResponseDto(newClass);
  }
}
```

**Problem:**
- Handler passes `state` and timestamps to service
- Service creates entity using those values
- Responsibility is split/unclear
- Service method `createClass()` looks like a command

---

### ✅ AFTER: Handler Owns Entity Creation

**File:** `backend/src/commands/class/handlers/create-class.handler.ts` (excerpt)

```typescript
/**
 * CreateClassHandler: Orchestrates class creation
 *
 * Responsibilities:
 * - Enforce all 8 preconditions
 * - Create ClassEntity with proper initial state
 * - Decide timestamps, UUID, initial state
 * - Persist via repository
 */
@CommandHandler(CreateClassCommand)
export class CreateClassHandler implements ICommandHandler<CreateClassCommand> {
  constructor(
    @Inject(ClassRepository)
    private readonly classRepository: ClassRepository,  // ← Pure persistence
    // ... other services ...
  ) {}

  async execute(command: CreateClassCommand): Promise<CreateClassResponseDto> {
    // Preconditions 1-7 ...
    // ... validation ...

    // ✅ Handler creates entity explicitly
    const classEntity = new ClassEntity();
    classEntity.id = uuid();                           // ← Handler generates ID
    classEntity.gymId = command.gymId;
    classEntity.classTypeId = command.classTypeId;
    classEntity.coachUserId = command.coachUserId;
    classEntity.spaceId = command.spaceId;
    classEntity.scheduledDate = this.toDate(command.scheduledDate);
    classEntity.scheduledTime = command.scheduledTime;
    classEntity.capacity = capacity;
    classEntity.state = 'published';                   // ← Handler decides state
    classEntity.createdAt = now;                       // ← Handler assigns timestamp
    classEntity.lastModifiedAt = now;
    classEntity.deletedAt = null;

    // ✅ Repository ONLY persists (zero decisions)
    const savedClass = await this.classRepository.save(classEntity);

    return this.mapToResponseDto(savedClass);
  }
}
```

**Compliance:**
- ✅ Handler explicitly creates entity (not delegated)
- ✅ Handler decides UUID, state, timestamps
- ✅ Clear single responsibility
- ✅ Repository is pure persistence

---

## File 3: Tests

### ❌ BEFORE: Mocks ClassService

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    CreateClassHandler,
    {
      provide: ClassService,                    // ← Mocking service
      useValue: {
        createClass: jest.fn(),                 // ← Service.createClass()
      },
    },
    // ... other mocks ...
  ],
}).compile();

handler = module.get<CreateClassHandler>(CreateClassHandler);
classService = module.get<ClassService>(ClassService);

// In test:
jest.spyOn(classService, 'createClass').mockResolvedValue({
  id: 'class-new-id',
  state: 'published',
} as any);

const result = await handler.execute(command);

// Weak assertion - doesn't verify handler creates entity
expect(classService.createClass).toHaveBeenCalled();
```

**Problem:**
- Can't verify handler-level decisions
- Tests don't check if handler creates entity properly
- Tests don't verify UUID generation
- Tests don't verify state assignment

---

### ✅ AFTER: Mocks ClassRepository

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    CreateClassHandler,
    {
      provide: ClassRepository,                 // ← Mocking repository
      useValue: {
        save: jest.fn(),                        // ← Repository.save()
      },
    },
    // ... other mocks ...
  ],
}).compile();

handler = module.get<CreateClassHandler>(CreateClassHandler);
classRepository = module.get<ClassRepository>(ClassRepository);

// In test:
const mockSavedClass = {
  id: 'class-uuid-123',
  state: 'published',
  createdAt: new Date(),
} as ClassEntity;

jest.spyOn(classRepository, 'save').mockResolvedValue(mockSavedClass);

const result = await handler.execute(command);

// Strong assertions - verify handler decisions
const savedEntity = (classRepository.save as jest.Mock).mock.calls[0][0];
expect(savedEntity.state).toBe('published');        // ← Handler decided
expect(savedEntity.id).toBeTruthy();               // ← Handler generated
expect(savedEntity.createdAt).toBeInstanceOf(Date); // ← Handler assigned
expect(classRepository.save).toHaveBeenCalled();
```

**Improvements:**
- ✅ Can verify handler creates entity with correct initial state
- ✅ Can verify UUID was generated
- ✅ Can verify timestamps were assigned
- ✅ Tests clearly show handler responsibility

---

## File 4: Module Configuration

### ❌ BEFORE: Exports ClassService

```typescript
// backend/src/domain/class/class.module.ts
import { ClassService } from './class.service';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ClassEntity]), ...],
  providers: [ClassService, ...CommandHandlers],
  exports: [ClassService],  // ← Export service
})
export class ClassModule {}
```

---

### ✅ AFTER: Exports ClassRepository

```typescript
// backend/src/domain/class/class.module.ts
import { ClassRepository } from '../../repositories/class.repository';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ClassEntity]), ...],
  providers: [ClassRepository, ...CommandHandlers],
  exports: [ClassRepository],  // ← Export repository
})
export class ClassModule {}
```

---

## Summary: Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Service Class** | `ClassService` with `createClass()` | `ClassRepository` with `save()` only |
| **Entity Creation** | In `ClassService.createClass()` | In `CreateClassHandler.execute()` |
| **UUID Generation** | `ClassService` | `CreateClassHandler` |
| **State Decision** | `ClassService` | `CreateClassHandler` |
| **Timestamp Assignment** | `ClassService` | `CreateClassHandler` |
| **Repository Responsibility** | Mixed (create + persist) | Pure persistence only |
| **Module Export** | `ClassService` | `ClassRepository` |
| **Test Mocks** | `ClassService` | `ClassRepository` |
| **Test Assertions** | Weak (just verify call) | Strong (verify entity state) |
| **Agent Compliance** | ❌ Violated | ✅ Compliant |

---

## Code Flow Comparison

### Before (Violated)
```
CreateClassHandler.execute()
  └─ Validate preconditions
  └─ Call classService.createClass({state: 'published', createdAt: now, ...})
      └─ ClassService creates entity with UUID, state, timestamps
      └─ ClassService calls TypeORM save()
  └─ Return mapped response
```

### After (Compliant)
```
CreateClassHandler.execute()
  └─ Validate preconditions
  └─ Create ClassEntity()
      ├─ Set id = uuid()
      ├─ Set state = 'published'
      ├─ Set createdAt = now
      └─ Set all other fields
  └─ Call classRepository.save(classEntity)
      └─ ClassRepository calls TypeORM save()
  └─ Return mapped response
```

---

## Impact on Other Code

### What Changed (Must Update)

1. ✅ `CreateClassHandler` — Updated to create entity
2. ✅ `create-class.handler.spec.ts` — Updated mocks
3. ✅ `ClassModule` — Updated exports
4. ✅ `backend/src/domain/class/class.service.ts` — Removed

### What Stayed the Same (No Update Needed)

1. ✅ `ClassController` — No changes needed (still injects CommandBus)
2. ✅ `CreateClassCommand` — No changes needed
3. ✅ `CreateClassDto` — No changes needed
4. ✅ `CreateClassResponseDto` — No changes needed
5. ✅ `ClassEntity` — No changes needed
6. ✅ HTTP contract — No changes needed
7. ✅ Preconditions — All still enforced

---

## Verification

Run tests to verify refactoring is complete:

```bash
npm test -- create-class.handler.spec.ts
```

All 11 tests should pass ✅
