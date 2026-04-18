# CreateClass Command

## Overview

The `CreateClass` command implements the **CreateClass** operation from COMMAND_MODEL.md, allowing gym owners to schedule new training sessions.

**Actor:** Gym Owner  
**State Change:** Creates a new Class with state = `published`  
**Authority:** COMMAND_MODEL.md (lines 1092-1140)

---

## Specification (from COMMAND_MODEL.md)

### Intent
Schedule a new class for upcoming delivery.

### Required Inputs
- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `class_type_id` (string)
- `coach_user_id` (string; coach assigned to class)
- `space_id` (string)
- `scheduled_date` (date)
- `scheduled_time` (time)
- `capacity` (integer; optional; defaults to space.base_capacity)

### Preconditions
- User is gym owner for the gym
- Gym exists and `status = active`
- ClassType exists and belongs to gym
- Coach is active GymStaff with role = `coach` in the gym
- Space exists and belongs to gym
- scheduled_date + scheduled_time is in the future
- Capacity > 0

### State Changes
- Create Class with:
  - `state = published`
  - `created_at = now`
  - All provided fields
- Class is immediately visible to eligible athletes

### Failure Cases
- User not gym owner
- Gym not found or suspended
- ClassType not found or belongs to different gym
- Coach not found or not a valid GymStaff member
- Space not found or belongs to different gym
- Scheduled date/time is in the past
- Invalid capacity

### Affected Entities
- Class (create)

---

## Implementation Structure

### Files

```
backend/src/
├── commands/
│   └── class/
│       ├── create-class.command.ts           # CQRS Command class
│       ├── create-class.handler.spec.ts      # Unit tests
│       ├── handlers/
│       │   └── create-class.handler.ts       # Command handler with business logic
│       └── dto/
│           ├── create-class.dto.ts           # HTTP request DTO
│           └── create-class-response.dto.ts  # HTTP response DTO
├── domain/
│   ├── class/
│   │   ├── class.service.ts                  # Class domain service
│   │   ├── class.module.ts                   # Class module
│   │   └── entities/
│   │       └── class.entity.ts               # TypeORM Class entity
│   ├── gym/
│   ├── gym-staff/
│   ├── space/
│   ├── class-type/
│   ├── user/
│   ├── booking/
│   ├── programming/
│   ├── attendance/
│   ├── result/
│   └── membership-plan/
└── api/
    └── class/
        ├── class.controller.ts               # HTTP endpoint
        └── class.module.ts                   # API module
```

### Architecture

1. **HTTP Layer** (Controller)
   - `POST /api/gyms/:gymId/classes`
   - Validates input via DTO
   - Maps request to CQRS Command

2. **CQRS Layer** (Command & Handler)
   - `CreateClassCommand`: Encapsulates the intent
   - `CreateClassHandler`: Orchestrates validation and execution
   - Uses dependency injection for services

3. **Domain Layer** (Services)
   - `ClassService`: Creates and queries classes
   - `GymService`: Validates gym existence and status
   - `GymStaffService`: Validates gym ownership and coach assignment
   - `SpaceService`: Validates space existence and ownership
   - `ClassTypeService`: Validates class type existence and ownership

4. **Data Layer** (TypeORM)
   - `ClassEntity`: Maps to `classes` table
   - Related entities for data validation and relationships

---

## Usage Example

### HTTP Request
```http
POST /api/gyms/gym-123/classes
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "classTypeId": "class-type-456",
  "coachUserId": "coach-789",
  "spaceId": "space-101",
  "scheduledDate": "2026-05-01",
  "scheduledTime": "10:00",
  "capacity": 20
}
```

### HTTP Response (200 OK)
```json
{
  "id": "class-new-id",
  "gymId": "gym-123",
  "classTypeId": "class-type-456",
  "coachUserId": "coach-789",
  "spaceId": "space-101",
  "scheduledDate": "2026-05-01",
  "scheduledTime": "10:00",
  "capacity": 20,
  "state": "published",
  "createdAt": "2026-04-18T15:30:00Z",
  "lastModifiedAt": "2026-04-18T15:30:00Z"
}
```

### CQRS Usage (Direct)
```typescript
const command = new CreateClassCommand(
  'user-123',           // userId
  'gym-456',            // gymId
  'class-type-789',     // classTypeId
  'coach-101',          // coachUserId
  'space-202',          // spaceId
  new Date('2026-05-01'), // scheduledDate
  '14:00',              // scheduledTime
  25                    // capacity (optional)
);

const result = await commandBus.execute(command);
// result: CreateClassResponseDto
```

---

## Validation Rules

### DTO Validation (CreateClassDto)
- `classTypeId`: Required, non-empty string
- `coachUserId`: Required, non-empty string
- `spaceId`: Required, non-empty string
- `scheduledDate`: Required, ISO 8601 date format
- `scheduledTime`: Required, HH:mm format
- `capacity`: Optional, integer ≥ 1

### Command Handler Validation (CreateClassHandler)
1. User is gym owner for the specified gym
2. Gym exists and is active (not suspended)
3. ClassType exists and belongs to the specified gym
4. Coach is active GymStaff with role = `coach` in the gym
5. Space exists and belongs to the specified gym
6. Scheduled date/time is in the future
7. Capacity > 0 (or defaults to space.baseCapacity)

### Multi-Tenant Isolation
All validations enforce gym scoping:
- ClassType.gymId must match the provided gymId
- Space.gymId must match the provided gymId
- Coach's GymStaff must be in the specified gym

---

## Error Handling

| Error | Status | Cause |
|-------|--------|-------|
| `ForbiddenException` | 403 | User is not a gym owner |
| `NotFoundException` | 404 | Gym, ClassType, Coach, or Space not found |
| `BadRequestException` | 400 | Gym suspended, ClassType/Space wrong gym, Coach inactive/not coach, time in past, invalid capacity |

---

## Testing

### Unit Tests (create-class.handler.spec.ts)
- ✅ Successful class creation with all preconditions met
- ✅ Rejects if user is not gym owner
- ✅ Rejects if gym not found or suspended
- ✅ Rejects if ClassType not found or wrong gym
- ✅ Rejects if Coach inactive or not assigned
- ✅ Rejects if Space not found or wrong gym
- ✅ Rejects if scheduled time is in the past
- ✅ Uses space.baseCapacity when capacity not provided

### Integration Tests (Recommended)
- Test with real database and authentication
- Verify class visibility to eligible athletes after creation
- Test booking flow after class creation
- Verify multi-tenant isolation (athlete from other gym cannot see class)

---

## Class Lifecycle Post-Creation

After a class is created with `state = published`:

1. **Visibility:** Class appears in schedules for eligible athletes (with active GymMembership and matching MembershipPlan.class_types)
2. **Booking:** Athletes can immediately book spots or join the waitlist
3. **Booking Closure:** At configured freeze time (e.g., 30 min before start), class transitions to `booking_closed`
4. **In Progress:** When class starts, transitions to `in_progress` and attendance can be marked
5. **Completed:** After class ends, transitions to `completed` and athletes can log results (if loggable)
6. **Archived:** Eventually transitions to `archived` for historical records

See DATA_MODEL.md for the complete class lifecycle state machine.

---

## Dependencies

### NestJS Modules
- `@nestjs/cqrs` — Command handling
- `@nestjs/typeorm` — ORM and database
- `@nestjs/common` — Exception handling and decorators
- `class-validator` — DTO validation

### Services
- `ClassService` — Class creation and queries
- `GymService` — Gym validation
- `GymStaffService` — Staff role validation
- `SpaceService` — Space validation
- `ClassTypeService` — Class type validation

---

## References

- **COMMAND_MODEL.md** — Full command specification (lines 1092-1140)
- **DATA_MODEL.md** — Class entity and relationships
- **PRODUCT.md** — Product vision and class lifecycle
- **USER_JOURNEYS.md** — Gym owner journey (Step 3: Create Class Schedule)
