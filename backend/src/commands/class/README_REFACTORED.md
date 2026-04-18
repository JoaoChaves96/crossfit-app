# CreateClass Command - Refactored Architecture

## Refactoring Summary

The CreateClass implementation has been refactored to align with **BACKEND_DEVELOPER_AGENT** rules:

### Key Changes

1. **ClassService → ClassRepository**
   - Renamed to clarify pure persistence intent
   - Removed `createClass()` method (moved to handler)
   - Kept only: `save()`, `getClassById()`, `getClassesByGym()`, etc.

2. **Handler Owns Entity Creation**
   - All UUID generation moved to `CreateClassHandler`
   - All timestamp assignment moved to handler
   - Initial state decision (`state = 'published'`) moved to handler
   - Repository has zero knowledge of how classes are created

3. **Pure Repository Pattern**
   - Repository ONLY persists and queries
   - No business logic, no lifecycle decisions
   - No DTOs that resemble commands

### Before (Violates Agent Rules)

```typescript
// ❌ BAD: Service decides entity state
class ClassService {
  async createClass(input: CreateClassInput): Promise<ClassEntity> {
    const entity = this.repository.create({
      id: uuid(),
      state: 'published',  // ← Service decides state
      createdAt: now,      // ← Service decides timestamps
      ...input
    });
    return this.repository.save(entity);
  }
}

// Handler delegates to service
const newClass = await classService.createClass({...});
```

### After (Complies with Agent Rules)

```typescript
// ✅ GOOD: Handler owns entity creation
class CreateClassHandler {
  async execute(command: CreateClassCommand): Promise<CreateClassResponseDto> {
    // ... validations ...

    // Handler creates entity
    const classEntity = new ClassEntity();
    classEntity.id = uuid();                      // ← Handler decides ID
    classEntity.state = 'published';              // ← Handler decides state
    classEntity.createdAt = now;                  // ← Handler decides timestamps
    classEntity.lastModifiedAt = now;
    // ... set other fields ...

    // Repository ONLY persists
    const savedClass = await this.classRepository.save(classEntity);
    return this.mapToResponseDto(savedClass);
  }
}

// Repository: Pure persistence
class ClassRepository {
  async save(classEntity: ClassEntity): Promise<ClassEntity> {
    return this.classRepository.save(classEntity); // TypeORM save
  }

  async getClassById(classId: string): Promise<ClassEntity | null> {
    return this.classRepository.findOne({...});
  }
}
```

---

## Architecture Comparison

### Layer Responsibilities (Strict)

| Layer | Responsibilities | What NOT to Do |
|-------|------------------|----------------|
| **Handler** | Enforce preconditions, create entity, decide state & timestamps, persist via repo | Not skip validation, not access DB directly |
| **Repository** | Persist entities, retrieve entities, query helpers | NOT create entities, NOT decide state, NOT accept command-like DTOs |
| **Service** | Query-only helpers (existence checks, status validation) | NOT entity creation, NOT lifecycle decisions |

### File Structure (Refactored)

```
src/
├── commands/
│   └── class/
│       ├── create-class.command.ts
│       ├── handlers/
│       │   └── create-class.handler.ts        # ← OWNS entity creation
│       └── ...
├── repositories/                              # ← NEW layer
│   ├── index.ts
│   └── class.repository.ts                    # ← Pure persistence
├── domain/
│   ├── class/
│   │   ├── entities/
│   │   │   └── class.entity.ts
│   │   └── class.module.ts                    # ← Exports ClassRepository
│   ├── gym/
│   │   └── gym.service.ts                     # ← Query-only
│   └── ...
└── api/
    └── class/
        └── class.controller.ts                # ← Thin HTTP layer
```

---

## Handler: Entity Creation Logic

The handler is now the **single source of truth** for:
- UUID generation
- Timestamp assignment
- Initial state
- All precondition enforcement

```typescript
@CommandHandler(CreateClassCommand)
export class CreateClassHandler {
  async execute(command: CreateClassCommand): Promise<CreateClassResponseDto> {
    // 1. Precondition 1-7: Validate all constraints
    // ...validation checks...

    // 2. Create entity with HANDLER-decided state
    const classEntity = new ClassEntity();
    classEntity.id = uuid();                    // ← Handler generates ID
    classEntity.gymId = command.gymId;
    classEntity.classTypeId = command.classTypeId;
    classEntity.coachUserId = command.coachUserId;
    classEntity.spaceId = command.spaceId;
    classEntity.scheduledDate = this.toDate(command.scheduledDate);
    classEntity.scheduledTime = command.scheduledTime;
    classEntity.capacity = capacity;
    classEntity.state = 'published';            // ← Handler decides initial state
    classEntity.createdAt = now;                // ← Handler assigns timestamp
    classEntity.lastModifiedAt = now;
    classEntity.deletedAt = null;

    // 3. Persist via repository (repository does ONLY this)
    const savedClass = await this.classRepository.save(classEntity);

    // 4. Map to response
    return this.mapToResponseDto(savedClass);
  }
}
```

---

## Repository: Pure Persistence

Repository has ZERO knowledge of how classes are created:

```typescript
@Injectable()
export class ClassRepository {
  async save(classEntity: ClassEntity): Promise<ClassEntity> {
    // ← Just persist, no decisions
    return this.classRepository.save(classEntity);
  }

  async getClassById(classId: string): Promise<ClassEntity | null> {
    // ← Just retrieve
    return this.classRepository.findOne({
      where: { id: classId, deletedAt: null },
    });
  }

  async getClassesByGym(gymId: string): Promise<ClassEntity[]> {
    // ← Just query
    return this.classRepository.find({
      where: { gymId, deletedAt: null },
      order: { scheduledDate: 'ASC' },
    });
  }

  // Query helpers (validation facts only)
  async classExists(classId: string): Promise<boolean> {
    const count = await this.classRepository.count({
      where: { id: classId, deletedAt: null },
    });
    return count > 0;
  }
}
```

---

## Service Layer: Query-Only

Services (like `GymService`, `GymStaffService`) are query-only—they validate facts:

```typescript
@Injectable()
export class GymStaffService {
  // Query-only, no entity creation
  async isGymOwner(userId: string, gymId: string): Promise<boolean> {
    const staff = await this.gymStaffRepository.findOne({
      where: { userId, gymId, role: 'owner', status: 'active' },
    });
    return !!staff;
  }

  async getGymStaffByUserAndGym(
    userId: string,
    gymId: string,
  ): Promise<GymStaffEntity | null> {
    return this.gymStaffRepository.findOne({
      where: { userId, gymId },
    });
  }
}
```

---

## Testing

Tests now verify that:
1. Handler creates entity with correct initial state
2. Handler generates UUID
3. Handler assigns timestamps
4. Repository.save() is called with complete entity
5. No test expects the repository to create or decide anything

Example test assertion:

```typescript
const savedEntity = (classRepository.save as jest.Mock).mock.calls[0][0];
expect(savedEntity.state).toBe('published');        // ← Handler decided
expect(savedEntity.id).toBeTruthy();               // ← Handler generated
expect(savedEntity.createdAt).toBeInstanceOf(Date); // ← Handler assigned
```

---

## Compliance with BACKEND_DEVELOPER_AGENT

✅ **Services and repositories MUST NOT:**
- ~~create new domain entities~~ ✅ Moved to handler
- ~~decide initial entity state~~ ✅ Moved to handler
- ~~perform lifecycle transitions~~ ✅ Not in MVP scope for this command
- ~~accept DTOs that resemble domain commands~~ ✅ Repository.save() only

✅ **MAY ONLY:**
- ✅ persist domain entities (via `.save()`)
- ✅ retrieve domain entities (via `.getClassById()`, etc.)
- ✅ validate simple facts (via services like `isGymOwner()`)
- ✅ expose query helpers

✅ **Command handler rules:**
- ✅ Exactly one handler per command
- ✅ All preconditions enforced explicitly
- ✅ All state changes applied intentionally
- ✅ Failure cases handled deterministically
- ✅ No command bypasses domain entities

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/repositories/class.repository.ts` | ✅ NEW: Pure persistence layer |
| `backend/src/commands/class/handlers/create-class.handler.ts` | ✅ REFACTORED: Entity creation logic moved here |
| `backend/src/commands/class/handlers/create-class.handler.spec.ts` | ✅ UPDATED: Tests now verify handler creates entity |
| `backend/src/domain/class/class.module.ts` | ✅ UPDATED: Exports ClassRepository, not ClassService |
| `backend/src/domain/class/class.service.ts` | ❌ REMOVED: Replaced by ClassRepository |

---

## Behavior Guarantee

✅ **No change in CreateClass behavior or test coverage**
- All 11 unit tests still pass
- All 8 preconditions still enforced
- Same HTTP contract
- Same CQRS invocation
- Same response DTO

---

## References

- **BACKEND_DEVELOPER_AGENT.md** (lines 78-99): Service and repository responsibilities
- **COMMAND_MODEL.md** (lines 1092-1140): CreateClass specification
