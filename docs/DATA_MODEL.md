# MVP Data Model

**Prepared by:** Data Model Agent  
**Date:** 2026-04-18  
**Authority:** PRODUCT.md, USER_JOURNEYS.md, MVP_SCREENS.md, DECISIONS.md

---

## Executive Summary

The MVP data model supports a multi-tenant fitness platform with three core user journeys:
- **Athlete:** Book classes, attend, log results, track training history
- **Gym Owner:** Configure gym, manage staff, publish schedules, track bookings
- **Coach:** Create programming, mark attendance, view results

The model enforces:
- Strict multi-tenant gym isolation
- Role-based access control through explicit relationships
- Class lifecycle states that gate all interactions
- Membership plan-based class visibility
- Automatic waitlist promotion without confirmation

---

## Domain Entities

### 1. Gym

**Purpose:** Root tenant entity; enforces multi-tenant isolation.

**Key Fields:**
- `id` (unique identifier)
- `name` (gym display name)
- `description` (marketing text)
- `location` (address or location identifier)
- `logo_url` (optional)
- `owner_user_id` (foreign key to User; the gym owner)
- `status` (enum: `active`, `suspended`)
- `created_at` (timestamp)

**Lifecycle:** Created by platform admin approval. Can be suspended at platform level.

---

### 2. User

**Purpose:** Generic user account; bridges all roles.

**Key Fields:**
- `id` (unique identifier)
- `email` (unique)
- `password_hash` (nullable for social-login-only users)
- `social_login_id` (nullable; OAuth provider + user ID)
- `name` (full or display name)
- `status` (enum: `active`, `inactive`)
- `created_at` (timestamp)

**Rules:**
- A user can hold multiple roles simultaneously (e.g., athlete at gym A, coach at gym B)
- Email uniqueness is platform-wide
- Social login is optional; email+password is primary auth
- Role-specific data (unit preference, coach bio) lives in role-specific entities

---

### 3. GymMembership

**Purpose:** Track athlete membership in a gym; required for class visibility.

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `user_id` (foreign key to User; must be the athlete)
- `status` (enum: `active`, `inactive`)
- `joined_at` (timestamp)

**Relationships:**
- **Cardinality:** One gym can have many athletes; one athlete can join many gyms
- **Ownership:** Scoped to gym; deleting a gym may delete its memberships

**Rules:**
- Athletes can only see classes in gyms where they have an active GymMembership
- A user can have at most one active GymMembership per gym (no duplicates)

---

### 4. GymStaff

**Purpose:** Track coaches and owners assigned to a gym.

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `user_id` (foreign key to User)
- `role` (enum: `owner`, `coach`)
- `status` (enum: `active`, `inactive`)
- `assigned_at` (timestamp)

**Relationships:**
- **Cardinality:** One gym can have many staff; one user can be staff at many gyms
- **Ownership:** Scoped to gym

**Rules:**
- Gym owners invite coaches; only owners manage staff roles
- Coaches can be assigned to multiple gyms independently
- When a coach's status is `inactive`, they are hidden from new class assignments but retain visibility of past classes

---

### 5. ClassType

**Purpose:** Define class category and associated behaviors (e.g., CrossFit, Gymnastics).

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `name` (e.g., "CrossFit", "Gymnastics", "Strength")
- `loggable` (boolean; whether athletes can submit results)
- `result_metrics` (enum: `time`, `reps`, `weight`, `rounds`, `none`)

**Relationships:**
- **Cardinality:** One gym can have many class types
- **Ownership:** Scoped to gym

**Rules:**
- Class types are gym-specific; no shared catalog
- `loggable = true` means classes of this type allow result submission
- `result_metrics` specifies which fields appear in the result form
- Class types are assigned by gym owners and referenced by membership plans and classes

---

### 6. MembershipPlan

**Purpose:** Define subscription tier and class access.

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `name` (e.g., "Monthly Unlimited", "10 Classes/Month")
- `pricing` (amount in cents; currency inferred from gym)
- `billing_cycle` (enum: `monthly`, `annual`)
- `class_types` (list of ClassType IDs; which class types this plan grants access to)
- `status` (enum: `active`, `archived`)
- `created_at` (timestamp)

**Relationships:**
- **Cardinality:** One gym can have many plans
- **Ownership:** Scoped to gym

**Rules:**
- Athletes can only see and book classes whose ClassType is in their active MembershipPlan's class_types
- A plan's class_types must all belong to the same gym
- Archived plans remain in force for athletes who already hold them until their
  current cycle expires, but cannot be assigned to anyone new

---

### 7. AthleteMembershipPlan

**Purpose:** Track which plan an athlete has at a specific gym.

**Key Fields:**
- `id` (unique identifier)
- `gym_membership_id` (foreign key to GymMembership)
- `membership_plan_id` (foreign key to MembershipPlan)
- `status` (enum: `active`, `expired`)
- `started_at` (timestamp)
- `expires_at` (timestamp; nullable for unlimited plans)
- `auto_roll` (boolean, default true; whether the row renews on expiry)
- `auto_roll_count` (integer, default 0; cycles served since auto-renew was last enabled)

**Relationships:**
- **Cardinality:** One GymMembership has at most one active AthleteMembershipPlan at any time
- **Ownership:** Scoped to gym through GymMembership

**Rules:**
- Only one active plan per GymMembership (enforced by unique constraint on gym_membership_id, status = active)
- Expiration is timestamp-based; athlete loses class visibility when status transitions to `expired`
- Athlete can purchase or upgrade to a different plan, creating a new active record and expiring the old one

---

### 8. Space

**Purpose:** Physical training location at a gym (e.g., "Main Floor", "Weightlifting Room").

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `name` (display name)
- `base_capacity` (integer; maximum athletes the space can hold)

**Relationships:**
- **Cardinality:** One gym can have many spaces
- **Ownership:** Scoped to gym

**Rules:**
- Spaces are gym-specific
- Classes are assigned to exactly one space
- Capacity is inherited by the class or overridden at class level

---

### 9. Class

**Purpose:** Scheduled training session; core booking and lifecycle entity.

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `class_type_id` (foreign key to ClassType)
- `coach_user_id` (foreign key to User; the assigned coach)
- `space_id` (foreign key to Space)
- `scheduled_date` (date)
- `scheduled_time` (time; assumes single timezone per gym)
- `capacity` (integer; overrides space.base_capacity if set)
- `state` (enum: `published`, `booking_closed`, `in_progress`, `completed`, `archived`)
- `series_id` (nullable foreign key to ClassSeries; set when the class was generated by a recurring series, null for single-created classes)
- `created_at` (timestamp)
- `last_modified_at` (timestamp)
- `deleted_at` (nullable timestamp; soft delete for audit trail)

**Relationships:**
- **Cardinality:** One gym has many classes; one class type has many classes; one coach has many classes
- **Ownership:** Scoped to gym

**Lifecycle States:**

| State | Visibility | Booking | Programming | Editing | Attendance | Results |
|-------|------------|---------|-------------|---------|-----------|---------|
| `published` | ✅ | ✅ | ✅ Attach/Edit | ✅ | ❌ | ❌ |
| `booking_closed` | ✅ | ❌ | ✅ Edit | ✅ | ❌ | ❌ |
| `in_progress` | ✅ | ❌ | ❌ Locked | ❌ | ✅ | ❌ |
| `completed` | ✅ | ❌ | ❌ | ❌ | ❌ View | ✅ |
| `archived` | ✅ | ❌ | ❌ | ❌ | ❌ View | ❌ Edit |

**Rules:**
- State transitions are unidirectional: `published` → `booking_closed` → `in_progress` → `completed` → `archived`
- Booking closure can be triggered manually by owner/coach or automatically by a scheduled action based on gym configuration (e.g., 30 min before start)
- Class is visible to athlete only if: (1) athlete has active GymMembership in gym_id, (2) athlete has active AthleteMembershipPlan that includes class_type_id
- Coach assignment must be a GymStaff entry with role = `coach` at the same gym
- Space must belong to the same gym

---

### 9a. ClassSeries

**Purpose:** A recurring-class rule that generated a batch of concrete Class rows in one action. Stores the complete recurrence pattern so it can be displayed and re-applied later. (Introduced by the Recurring Class Series epic — B1, create-only.)

**Key Fields:**
- `id` (unique identifier)
- `gym_id` (foreign key to Gym)
- `class_type_id` (foreign key to ClassType)
- `coach_user_id` (foreign key to User; the assigned coach)
- `space_id` (foreign key to Space)
- `weekdays` (integer array; days the series runs on, `0`=Sunday … `6`=Saturday; at least one)
- `scheduled_time` (time; shared across all occurrences)
- `duration` (integer minutes; default 60)
- `capacity` (nullable integer; null means "use the space base capacity at generation time")
- `start_date` (date; inclusive)
- `end_date` (date; inclusive)
- `created_by_user_id` (foreign key to User; the owner who created the series)
- `created_at` (timestamp)

**Relationships:**
- **Cardinality:** One gym has many series; one series generates many Class rows (via `Class.series_id`)
- **Ownership:** Scoped to gym

**Rules:**
- Owner-only creation via `POST /api/gyms/:gymId/classes/recurring`, which expands the rule into concrete classes, skips past and exact-duplicate occurrences, and bulk-creates the remainder (all in `published` state).
- A rule may not span more than 6 months past `start_date`.
- **B1 is a create-only breadcrumb:** generated classes are ordinary classes and nothing in the booking, lifecycle, or athlete-visibility paths reads `series_id`. Series *management* (edit / cancel / "this & following" cascade) is deferred to B2 — see `epics/RECURRING_CLASSES_EPIC.md`.

---

### 10. Programming

**Purpose:** Workout content (WOD, strength work, notes) associated with a class.

**Key Fields:**
- `id` (unique identifier)
- `class_id` (foreign key to Class; one-to-one)
- `content` (text; WOD, instructions, notes)
- `created_by_user_id` (foreign key to User; coach who created it)
- `created_at` (timestamp)
- `last_modified_at` (timestamp)
- `last_modified_by_user_id` (foreign key to User)

**Relationships:**
- **Cardinality:** One class has at most one Programming
- **Ownership:** Scoped to gym through Class

**Rules:**
- Programming can be created, edited, or deleted while class state is `published` or `booking_closed`
- Once class transitions to `in_progress`, programming is locked and cannot be modified
- Coaches can view programming for any assigned class; athletes can view only if booked/waitlisted
- `created_by_user_id` must be the assigned coach for that class

---

### 11. Booking

**Purpose:** Athlete's intent to participate in a class (booked or waitlisted).

**Key Fields:**
- `id` (unique identifier)
- `class_id` (foreign key to Class)
- `user_id` (foreign key to User; the athlete)
- `status` (enum: `booked`, `waitlisted`, `cancelled`)
- `booked_position` (integer; order in waitlist if status = waitlisted; null if booked)
- `created_at` (timestamp)
- `cancelled_at` (nullable timestamp)

**Relationships:**
- **Cardinality:** One class has many bookings; one athlete has many bookings
- **Ownership:** Scoped to gym through Class
- **Uniqueness:** One athlete cannot have two active (non-cancelled) bookings for the same class

**Rules:**
- Bookings can only be created when class state = `published`
- When a class reaches capacity, new bookings go to `waitlisted` status
- When an athlete cancels, if there is a waitlisted athlete, they are automatically promoted to `booked` (no confirmation window required; per DECISIONS.md)
- Being **marked absent does not promote** anyone. Attendance is only markable once the class is `in_progress` or `completed`, so a promotion then would add an athlete to a session already underway or over (see DECISIONS.md → Absence Does Not Promote)
- Cancelled bookings retain a record (soft delete via `cancelled_at` timestamp)
- Athletes can cancel bookings only while class state = `published`
- Because cancellation is the only promotion path and is limited to `published`, the
  waitlist is **inert from `booking_closed` onward** — a waitlisted athlete not
  promoted before the booking window closes does not get in, and the booking stays
  `waitlisted` (see DECISIONS.md → Absence Does Not Promote)

---

### 12. Attendance

**Purpose:** Verification that athlete was present for class; required to log results.

**Key Fields:**
- `id` (unique identifier)
- `class_id` (foreign key to Class)
- `user_id` (foreign key to User; the athlete)
- `present` (boolean; true if attended, false if marked absent)
- `marked_at` (timestamp; when attendance was recorded)
- `marked_by_user_id` (foreign key to User; the coach who marked it)
- `notes` (nullable text; coach notes if applicable)

**Relationships:**
- **Cardinality:** One per (class, athlete) pair; enforced by unique constraint
- **Ownership:** Scoped to gym through Class

**Rules:**
- Attendance is recorded when class state = `in_progress` or `completed`
- Coach marks attendance for booked athletes
- Only athletes with `present = true` can log results in the completed state
- One athlete cannot have multiple attendance records for the same class

---

### 13. Result

**Purpose:** Performance data logged by athlete for a completed class.

**Key Fields:**
- `id` (unique identifier)
- `class_id` (foreign key to Class)
- `user_id` (foreign key to User; the athlete)
- `metric_type` (enum: `time`, `reps`, `weight`, `rounds`, `note`)
- `value` (string or numeric; flexible to support different formats)
- `unit` (enum: `seconds`, `minutes`, `reps`, `kg`, `lb`, `rounds`, `none`)
- `notes` (nullable text; athlete's additional context)
- `logged_at` (timestamp)
- `edited_at` (nullable timestamp)

**Relationships:**
- **Cardinality:** One class can have many results from different athletes
- **Ownership:** Scoped to gym through Class

**Rules:**
- Results can only be logged by the athlete who attended the class
- Results can only be created/edited while class state = `completed`
- Results cannot be edited or created once class transitions to `archived`
- Results cannot be created unless the athlete has `present = true` in the Attendance record
- `metric_type` and `unit` must align with the class's ClassType definition
- Per DECISIONS.md, athletes can edit results as many times as they want until the class is archived (no edit window limit)

---

## Relationships Summary

| From | To | Type | Cardinality | Gym-Scoped |
|------|----|----|---|---|
| Gym | GymMembership | Athletes | 1:M | — |
| Gym | GymStaff | Staff | 1:M | — |
| Gym | ClassType | Class config | 1:M | — |
| Gym | MembershipPlan | Pricing | 1:M | — |
| Gym | Space | Physical | 1:M | — |
| Gym | Class | Schedule | 1:M | — |
| GymMembership | AthleteMembershipPlan | Access control | 1:1 (active) | ✅ |
| ClassType | Class | Scheduling | 1:M | ✅ |
| ClassType | MembershipPlan | Access | M:M (via plan.class_types) | ✅ |
| MembershipPlan | AthleteMembershipPlan | Subscription | 1:M | ✅ |
| Space | Class | Scheduling | 1:M | ✅ |
| Class | Programming | Content | 1:1 (optional) | ✅ |
| Class | Booking | Attendance intent | 1:M | ✅ |
| Class | Attendance | Presence verification | 1:M | ✅ |
| Class | Result | Performance data | 1:M | ✅ |
| User (Coach) | Class | Assignment | 1:M | Implicit (via gym_id) |
| User (Athlete) | Booking | Intent | 1:M | Implicit (via class gym) |
| User (Athlete) | Attendance | Presence | 1:M | Implicit (via class gym) |
| User (Athlete) | Result | Logging | 1:M | Implicit (via class gym) |

---

## State Fields & Lifecycle Invariants

### Class Lifecycle

**Explicit State:** `class.state` (enum: `published`, `booking_closed`, `in_progress`, `completed`, `archived`)

**Transitions:**
- `published` → `booking_closed`: Manual or automatic (based on gym freeze config)
- `booking_closed` → `in_progress`: Automatic (triggered by scheduled time)
- `in_progress` → `completed`: Manual (coach/owner marks class done)
- `completed` → `archived`: Manual or automatic (based on retention policy)

**Invariants by State:**

| Invariant | Rule |
|-----------|------|
| Bookings | Only creatable in `published`; cancellable only in `published` |
| Programming | Editable in `published`, `booking_closed`; locked in `in_progress`, `completed`, `archived` |
| Attendance | Markable in `in_progress`, `completed`; immutable in `archived` |
| Results | Creatable/editable in `completed`; immutable in `archived` |
| Structural Edits | Allowed in `published`, `booking_closed`; forbidden in `in_progress`, `completed`, `archived` |

### Booking Status Lifecycle

**Explicit States:** `booking.status` (enum: `booked`, `waitlisted`, `cancelled`)

**Rules:**
- New bookings → `booked` if capacity available; `waitlisted` if at capacity
- Waitlist → `booked`: Automatic promotion when space opens (no confirmation)
- `booked` → `cancelled`: Athlete-initiated or system-initiated (on membership expiry)
- Once `cancelled`, cannot revert to active status

### Membership Plan Lifecycle

**Explicit States:** `athlete_membership_plan.status` (enum: `active`, `expired`)

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

---

## Visibility & Access Control Invariants

### Class Visibility to Athlete

A class is visible to an athlete if and only if:

1. Athlete has `active` GymMembership for the class's gym
2. Athlete has `active` AthleteMembershipPlan for that GymMembership
3. The plan's `class_types` list includes the class's `class_type_id`
4. The class is in state `published` or `booking_closed` (not in `in_progress` for normal viewing, but historical viewing allowed for `completed` and `archived`)
5. The class's `scheduled_date` falls on or before the day the AthleteMembershipPlan's
   `expires_at` lands on (an unlimited plan, `expires_at = NULL`, imposes no bound)

**Consequence:** Athletes cannot see classes outside these conditions. Hidden classes must not appear in search, schedule, or list views.

### Booking Visibility to Coach/Owner

- Coaches can view bookings and attendance only for classes they are assigned to
- Gym owners can view all bookings and attendance for classes in their gym
- Platform admin cannot view bookings (not a coach/owner role)

### Result Visibility

- Athletes can only view their own results
- Coaches can view results for classes they are assigned to
- Gym owners can view all results within their gym
- Results are only visible after class transitions to `completed`

---

## Derived Business Rules

### Capacity Management

1. Each Class has a `capacity` (integer) which can override Space.base_capacity
2. Booked athletes count toward capacity; waitlisted athletes do not
3. If capacity is reduced after bookings exceed the new limit, those bookings remain valid (no forced cancellation)

### Waitlist Promotion (DECISIONS.md: Automatic & Immediate)

1. When a `booked` athlete cancels, the system checks for waitlisted athletes
2. If waitlisted athletes exist, the first one (by position) is automatically promoted to `booked`
3. No confirmation email or acceptance window; promotion is immediate
4. Promoted athlete is not notified separately beyond standard booking notification

### Membership Expiry During Booking

1. If athlete's AthleteMembershipPlan expires while they have an active booking:
   - Athlete becomes ineligible to attend
   - Booking may remain in place until class completion, then result logging is denied
   - No automatic cancellation; system allows graceful degradation

### Coach Assignment

1. A coach must be an active GymStaff member with role = `coach` in the class's gym
2. A coach can be assigned to classes in multiple gyms (coach can have multiple GymStaff entries)
3. If a coach's GymStaff status becomes `inactive`, they are hidden from new assignments but retain visibility of past classes

### Programming Requirement

- No MVP requirement that programming be attached before booking closes or class runs
- Classes can exist and be booked without programming
- Coaches decide whether to attach programming; athletes see empty/pending programming if not attached

### Result Logging (DECISIONS.md: Until Archived)

1. Athletes can log and edit results for any completed class until it is archived
2. No time window cutoff (e.g., "must log within 7 days")
3. Once archived, results are read-only

---

## Explicit Non-Entities (Deliberately Out of Scope)

The following concepts are **not** modeled in the MVP data model:

| Concept | Reason | Notes |
|---------|--------|-------|
| **Recurring Class Series** | Single-session classes only (DECISIONS.md) | No concept of "repeat every Monday"; each class is unique |
| **Waitlist Confirmation/Expiry** | Automatic promotion, no acceptance window | Waitlisted athletes are promoted immediately when space opens |
| **Result Logging Windows** | Athletes can edit until archived | No "must log within N days" enforcement |
| **Class Capacity Limits by Plan** | Not needed for MVP | All athletes in a gym with access to a class type can book it |
| **Announcements/Communication** | Deferred to Phase 2 | No entity for gym-wide announcements or messaging |
| **Challenges, Badges, Gamification** | Out of scope | No leaderboards, achievements, or social features |
| **National Gym Marketplace** | Independent gyms only | No shared class catalog or gym discovery |
| **Gym Ratings/Reviews** | Out of scope | No athlete feedback on gyms or coaches |
| **Advanced Analytics Dashboard** | Out of scope | No pre-built reports (platforms can query raw data) |
| **Wearables Integration** | Out of scope | No heart rate, steps, or fitness tracker sync |
| **Nutrition Tracking** | Out of scope | No meal logging or dietary data |
| **Payment Distribution** | Gym-level only | No inter-gym revenue sharing or centralized payments |
| **Inactive Member Campaigns** | Out of scope | No re-engagement or win-back flows |
| **Class Waitlist Tiers** | Single waitlist per class | No VIP or priority waitlisting |

---

## Multi-Tenant Isolation Guarantees

All entities except `User`, `Gym`, and `GymStaff` are **scoped to a gym**. This ensures:

1. **Data Isolation:** Queries for a gym's classes, bookings, results, etc. must include gym_id in the WHERE clause
2. **Access Control:** Any API endpoint must verify the requesting user belongs to the target gym (via GymMembership or GymStaff)
3. **Referential Integrity:** Foreign keys from gym-scoped entities must reference entities in the same gym (e.g., a ClassType must belong to the same gym as the Class that references it)

**Enforcement Patterns:**

- Never query a class without filtering by gym_id
- Never return a booking without verifying the requesting athlete is in that gym
- Never allow a coach to view results for a class outside their assigned gym(s)

---

## Summary Table: Entities & MVP Screens

| Entity | MVP Screens | Purpose |
|--------|-------------|---------|
| **Gym** | Gym Configuration, Gym Profile, Gym Settings | Multi-tenant root |
| **User** | Sign Up, Login, Profile | Authentication & roles |
| **GymMembership** | Join Gym | Athlete enrollment |
| **GymStaff** | Coaches List, Invite Coach | Staff assignment |
| **ClassType** | Gym Settings (Create/Edit), Membership Plans | Class configuration |
| **MembershipPlan** | Membership Plans (List, Create/Edit) | Access control & pricing |
| **AthleteMembershipPlan** | Active Membership Status, Membership Plans (Purchase) | Athlete subscription |
| **Space** | Gym Settings (Create/Edit) | Physical location |
| **Class** | Schedule Dashboard, Create/Edit Class, Class Management, Class Details, My Assigned Classes, Class Programming & Details | Core scheduling |
| **Programming** | Class Details (athlete), Class Programming & Details (coach), Add Programming | Workout content |
| **Booking** | Class Details (action), My Booked Classes, Class Management, My Assigned Classes | Attendance intent |
| **Attendance** | Class Management, Mark Attendance, Class Programming & Details (view results) | Presence verification |
| **Result** | Log Results, Training History, Class Management (view), Class Programming & Details (view) | Performance logging |

---

## Implementation Notes (Technology-Agnostic)

1. **No SQL types assumed.** Fields are described at logical level; storage is implementation-specific.
2. **Timestamps:** All creation/modification times use consistent format (UTC ISO 8601 assumed).
3. **Soft Deletes:** Deleted records should retain timestamps for audit trails (via `deleted_at` field on relevant entities).
4. **Unique Constraints:**
   - User.email (platform-wide)
   - GymMembership (gym_id, user_id) — no duplicate gym memberships
   - Booking (class_id, user_id) — one athlete, one class, active bookings only
   - Attendance (class_id, user_id) — one record per class per athlete
5. **Indexes:** Consider indexing on:
   - gym_id for all gym-scoped queries
   - user_id for athlete/coach lookups
   - class_id for bookings, attendance, results
   - scheduled_date, state for class list views
   - status for filtering active/inactive records

---

## Next Steps

1. Validate this model against all 32 MVP screens for completeness
2. Define API resource endpoints (not scope of this document)
3. Design database schema (logical to physical mapping)
4. Establish permission rules for each endpoint (authz layer)
5. Build test fixtures and scenarios based on user journeys
