> This document is authoritative for MVP backend behavior.

# MVP Command Model

**Prepared by:** API Command Modeling Agent  
**Date:** 2026-04-18  
**Authority:** PRODUCT.md, USER_JOURNEYS.md, MVP_SCREENS.md, DECISIONS.md, DATA_MODEL.md

---

## Overview

This document defines the complete set of domain commands required to operate the Fitness Box Management Platform MVP. Each command represents a single, intentional action that causes a controlled state change in the system.

Commands are grouped by actor role (Athlete, Coach, Gym Owner, Platform Admin) and specify:

- **Intent:** What the command accomplishes
- **Required Inputs:** Logical parameters
- **Preconditions:** All conditions that must be true
- **State Changes:** What entities are created, updated, or transitioned
- **Failure Cases:** Explicit rejection reasons
- **Affected Entities:** DATA_MODEL entities involved

---

## Part 1: Command Overview by Role

### Athlete Commands (11 total)

1. CreateAthleteAccount
2. AuthenticateUser
3. JoinGym
4. SelectActiveGym
5. BookClass
6. CancelBooking
7. PromoteWaitlist (automatic, internal)
8. LogResult
9. EditResult
10. PurchaseMembershipPlan
11. UpdateAthleteProfile

### Coach Commands (5 total)

1. AddOrEditProgramming
2. MarkAttendance
3. ToggleLoggableStatus
4. UpdateClassStructure
5. ManuallyTransitionClassState

### Gym Owner Commands (15 total)

1. RegisterGym
2. UpdateGymProfile
3. CreateSpace
4. UpdateSpace
5. DeleteSpace
6. ConfigureClassTypes
7. CreateMembershipPlan
8. UpdateMembershipPlan
9. ArchiveMembershipPlan
10. CreateClass
11. UpdateClassStructure
12. ManuallyAddMember
13. InviteCoach
14. ChangeCoachStatus
15. ManuallyTransitionClassState

### Platform Admin Commands (4 total)

1. ApproveGymRegistration
2. RequestGymInfo
3. SuspendGym
4. UnsuspendGym

---

## Part 2: Command Specifications

### ATHLETE COMMANDS

---

#### Command: CreateAthleteAccount

**Actor(s):** Unauthenticated User

**Intent:** Register a new user account via email+password or social login.

**Required Inputs:**

- `email` (string, unique platform-wide)
- `name` (string)
- `password` (string; nullable for social-login-only users)
- `social_provider` (string; optional; e.g., "google", "apple")
- `social_provider_id` (string; optional; unique per provider)

**Preconditions:**

- Email is not already registered
- If email+password: password meets platform requirements
- If social login: provider is supported

**State Changes:**

- Create new User with `status = active`
- User can now authenticate and join gyms

**Failure Cases:**

- Email already exists
- Invalid password format
- Unsupported social provider
- Missing required fields

**Affected Entities:**

- User (create)

---

#### Command: AuthenticateUser

**Actor(s):** User (any role)

**Intent:** Establish a session token for an authenticated user.

**Required Inputs:**

- `email` (string) OR `social_provider_id` (string)
- `password` (string; required for email auth, not for social)

**Preconditions:**

- User exists with matching email or social_provider_id
- User status = `active` (not inactive or suspended)
- Password matches (if email auth)

**State Changes:**

- Issue session token (implementation-specific)
- No data model state change

**Failure Cases:**

- User not found
- User is inactive or suspended
- Password incorrect
- Social auth provider mismatch

**Affected Entities:**

- User (read-only)

---

#### Command: JoinGym

**Actor(s):** Athlete

**Intent:** Enroll an athlete in a gym using an invite code or QR code.

**Required Inputs:**

- `user_id` (string; authenticated user)
- `invite_code` OR `qr_code_data` (string)

**Preconditions:**

- User exists and is authenticated
- User status = `active`
- Invite code or QR is valid and not expired (implementation-specific)
- User does not already have a GymMembership for this gym
- Gym status = `active` (not suspended)

**State Changes:**

- Create GymMembership with `status = active`, `joined_at = now`
- No AthleteMembershipPlan is created yet (athlete can view gym but cannot book until purchasing a plan)

**Failure Cases:**

- Invalid or expired invite code
- Gym is suspended
- Athlete already belongs to gym
- User not authenticated

**Affected Entities:**

- GymMembership (create)

---

#### Command: SelectActiveGym

**Actor(s):** Athlete

**Intent:** Switch active gym context for multi-gym athletes.

**Required Inputs:**

- `user_id` (string; authenticated user)
- `gym_id` (string)

**Preconditions:**

- User has active GymMembership for the gym
- User has active AthleteMembershipPlan for that gym (required to view schedule)
- Gym status = `active`

**State Changes:**

- Set user's active gym context (session state; not persisted to data model)
- Subsequent queries filter by this gym_id

**Failure Cases:**

- User has no GymMembership for gym_id
- User has no active AthleteMembershipPlan for gym_id
- Gym is suspended

**Affected Entities:**

- GymMembership (read-only)
- AthleteMembershipPlan (read-only)

---

#### Command: BookClass

**Actor(s):** Athlete

**Intent:** Reserve a spot in a class or join the waitlist.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `class_id` (string)
- `gym_id` (string; for validation)

**Preconditions:**

- Athlete has active GymMembership for the class's gym
- Athlete has active AthleteMembershipPlan for that gym
- The plan's `class_types` includes the class's `class_type_id`
- Class exists and `state = published`
- Class.gym_id matches the provided gym_id
- Athlete does not already have an active (non-cancelled) booking for this class
- Gym status = `active`

**State Changes:**

- Create Booking with:
  - `status = booked` if available capacity > 0
  - `status = waitlisted` if available capacity = 0
  - `booked_position = (next waitlist position)` if waitlisted
  - `created_at = now`
- If `status = booked`: available capacity decreases by 1

**Failure Cases:**

- Class not found or in wrong state
- Athlete not eligible (missing membership or plan)
- Athlete already booked
- Gym is suspended
- Class visibility rule violated (athlete not in gym or plan doesn't include class type)

**Affected Entities:**

- Booking (create)
- Class (read-only; capacity check)

**Note:** Booking goes directly to `waitlisted` if at capacity; no explicit JoinWaitlist command exists.

---

#### Command: CancelBooking

**Actor(s):** Athlete

**Intent:** Remove an athlete from a class booking.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `booking_id` (string)

**Preconditions:**

- Booking exists and belongs to the athlete
- Booking.status = `booked` OR `waitlisted`
- Class.state = `published` (cancellations only allowed before booking closes)
- Booking.cancelled_at = null (not already cancelled)

**State Changes:**

- Set Booking.status = `cancelled`, Booking.cancelled_at = now
- If the booking was `booked` and there are waitlisted athletes:
  - Automatically promote the first waitlisted athlete to `booked` (via PromoteWaitlist)

**Failure Cases:**

- Booking not found or does not belong to athlete
- Class not in `published` state (booking window closed)
- Booking already cancelled

**Affected Entities:**

- Booking (update)
- Booking (update, potential promotion via automatic PromoteWaitlist)

---

#### Command: PromoteWaitlist (Internal/Automatic)

**Actor(s):** System (automatic; not user-triggered)

**Intent:** Automatically promote the first waitlisted athlete to booked when capacity opens.

**Required Inputs:**

- `class_id` (string)

**Preconditions:**

- Class exists
- At least one waitlisted Booking with status = `waitlisted` exists
- Available capacity > 0

**State Changes:**

- Find the first waitlisted athlete (by `booked_position`)
- Set that Booking.status = `booked`, Booking.booked_position = null
- Renumber remaining waitlist positions
- Available capacity decreases by 1

**Failure Cases:**

- No waitlisted athletes
- Class not found

**Affected Entities:**

- Booking (update)

**Note:** This is an automatic, internal command triggered by CancelBooking or MarkAttendance (absent). No explicit user action is required. Per DECISIONS.md, promotion is immediate; no confirmation window.

---

#### Command: LogResult

**Actor(s):** Athlete

**Intent:** Submit performance data for a completed class.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `class_id` (string)
- `metric_type` (enum: `time`, `reps`, `weight`, `rounds`, `note`)
- `value` (string or numeric)
- `unit` (enum: `seconds`, `minutes`, `reps`, `kg`, `lb`, `rounds`, `none`)
- `notes` (string; optional)

**Preconditions:**

- Class exists and `state = completed`
- Athlete has an Attendance record for the class with `present = true`
- Class.class_type.loggable = true
- Result does not already exist for this (class, athlete) pair (first submission)
- Metric type and unit align with class_type.result_metrics

**State Changes:**

- Create Result with:
  - `logged_at = now`
  - `edited_at = null`
  - All provided fields

**Failure Cases:**

- Class not in `completed` state
- Athlete was not marked present
- Class type is not loggable
- Metric type/unit mismatch
- Result already exists

**Affected Entities:**

- Result (create)
- Attendance (read-only)
- Class (read-only)

---

#### Command: EditResult

**Actor(s):** Athlete

**Intent:** Modify a previously submitted result.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `result_id` (string)
- `metric_type` (enum; optional; if changing metric)
- `value` (string or numeric; optional)
- `unit` (enum; optional)
- `notes` (string; optional)

**Preconditions:**

- Result exists and belongs to the athlete
- Result.class.state = `completed` (not archived)
- Athlete has `present = true` in Attendance for this class
- Metric type/unit align with class_type.result_metrics

**State Changes:**

- Update Result with provided fields
- Set Result.edited_at = now

**Failure Cases:**

- Result not found or belongs to different athlete
- Class is archived
- Metric type/unit mismatch
- Athlete was not marked present

**Affected Entities:**

- Result (update)

**Note:** Per DECISIONS.md, results can be edited until the class is archived. No time window limit.

---

#### Command: PurchaseMembershipPlan

**Actor(s):** Athlete

**Intent:** Subscribe to a membership plan for a gym.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `gym_id` (string)
- `membership_plan_id` (string)

**Preconditions:**

- Athlete has active GymMembership for the gym
- MembershipPlan exists, belongs to the gym, and status = `active`
- Athlete does not have an active AthleteMembershipPlan for this gym (or will expire the old one)
- Gym status = `active`
- Payment is authorized (implementation-specific; assume success for MVP)

**State Changes:**

- Create AthleteMembershipPlan with:
  - `status = active`
  - `started_at = now`
  - `expires_at = now + billing_cycle` (or null if unlimited)
- If athlete already has an active AthleteMembershipPlan for this gym:
  - Set old plan.status = `expired`

**Failure Cases:**

- Athlete not in gym
- Plan not found or archived
- Plan belongs to different gym
- Gym is suspended
- Payment declined (implementation-specific)

**Affected Entities:**

- AthleteMembershipPlan (create)
- AthleteMembershipPlan (update, potential expiry of previous)

---

#### Command: UpdateAthleteProfile

**Actor(s):** Athlete

**Intent:** Update account profile and preferences.

**Required Inputs:**

- `user_id` (string; authenticated athlete)
- `name` (string; optional)
- `email` (string; optional; must be unique if changed)
- `unit_preference` (enum: `kg`, `lb`; optional)
- `notification_preferences` (object; optional; e.g., `{booking_confirmations: true, waitlist_updates: true}`)

**Preconditions:**

- User exists and is authenticated
- If email is changed: new email is not already in use
- User status = `active`

**State Changes:**

- Update User with provided fields
- Notification preferences stored in user profile (implementation-specific)

**Failure Cases:**

- User not found
- Email already in use
- Invalid email format
- Invalid unit preference

**Affected Entities:**

- User (update)

---

### COACH COMMANDS

---

#### Command: AddOrEditProgramming

**Actor(s):** Coach

**Intent:** Create or update programming content for a class.

**Required Inputs:**

- `user_id` (string; authenticated coach)
- `class_id` (string)
- `content` (string; WOD, instructions, notes)
- `loggable` (boolean; whether athletes can submit results; optional; defaults to class_type.loggable)

**Preconditions:**

- Coach is assigned to the class (active GymStaff with role = `coach` at the class's gym)
- Class exists and `state = published` OR `state = booking_closed`
- Class.coach_user_id = user_id (coach owns the assignment)

**State Changes:**

- If Programming exists: Update Programming with new content, `last_modified_at = now`, `last_modified_by_user_id = user_id`
- If Programming does not exist: Create Programming with provided content, `created_by_user_id = user_id`, `created_at = now`
- If `loggable` is provided: Update Class.class_type or override via Programming.loggable (implementation-specific whether this overrides or is informational)

**Failure Cases:**

- Coach not assigned to class
- Class not in `published` or `booking_closed` state
- Class belongs to different gym than coach assignment
- User is not a coach

**Affected Entities:**

- Programming (create or update)
- Class (read-only; state check)

---

#### Command: MarkAttendance

**Actor(s):** Coach

**Intent:** Record which athletes attended a class.

**Required Inputs:**

- `user_id` (string; authenticated coach)
- `class_id` (string)
- `attendance_records` (array of objects):
  - `athlete_user_id` (string)
  - `present` (boolean)
  - `notes` (string; optional)

**Preconditions:**

- Coach is assigned to the class (active GymStaff with role = `coach` at the class's gym)
- Class exists and `state = in_progress` OR `state = completed`
- All athlete_user_ids are booked or waitlisted for the class (or can be manually added; implementation-specific)
- Class is not archived

**State Changes:**

- For each attendance record:
  - If Attendance does not exist: Create with `present` value, `marked_at = now`, `marked_by_user_id = user_id`
  - If Attendance exists: Update with `present` value, `marked_at = now`, `marked_by_user_id = user_id`
- If any athlete's status changes from `present = true` to `present = false`:
  - Trigger PromoteWaitlist if waitlisted athletes exist
- If any athlete's status changes from `present = false` to `present = true`:
  - Athlete becomes eligible to log results later

**Failure Cases:**

- Coach not assigned to class
- Class not in `in_progress` or `completed` state
- Class is archived
- Athlete is not booked for class (implementation-specific; may allow manual entry)

**Affected Entities:**

- Attendance (create or update)
- Booking (potentially; if PromoteWaitlist triggered)

---

#### Command: ToggleLoggableStatus

**Actor(s):** Coach

**Intent:** Mark whether a class is loggable (athletes can submit results) or informational only.

**Required Inputs:**

- `user_id` (string; authenticated coach)
- `class_id` (string)
- `loggable` (boolean)

**Preconditions:**

- Coach is assigned to the class
- Class exists and `state = published` OR `state = booking_closed` (decision before class runs)
- Class is not in `in_progress`, `completed`, or `archived` states

**State Changes:**

- Update Class (or ClassType) with `loggable = value`
- Athletes will be unable to log results if toggled to `loggable = false` after class completes

**Failure Cases:**

- Coach not assigned to class
- Class in wrong state
- User is not a coach

**Affected Entities:**

- Class (update) OR ClassType (update; implementation-specific)

---

#### Command: UpdateClassStructure

**Actor(s):** Coach

**Intent:** Modify class structural details (time, space, capacity, coach assignment).

**Required Inputs:**

- `user_id` (string; authenticated coach)
- `class_id` (string)
- `scheduled_date` (date; optional)
- `scheduled_time` (time; optional)
- `space_id` (string; optional)
- `capacity` (integer; optional)
- `coach_user_id` (string; optional; reassign coach; coach can only reassign to another coach)

**Preconditions:**

- Coach is assigned to the class OR is gym owner
- Class exists and `state = published` OR `state = booking_closed` (structural edits forbidden after booking closes in PRODUCT but allowed per USER_JOURNEYS; authority is PRODUCT)
- All referenced entities (space, coach) belong to the same gym
- If capacity is reduced: document conflict resolution (implementation-specific; may require manual intervention)
- Coach reassignment: new coach must be active GymStaff with role = `coach`

**State Changes:**

- Update Class with provided fields
- Class.last_modified_at = now
- If capacity is reduced below current booked count: flag for manual resolution (no automatic cancellations)

**Failure Cases:**

- Coach not assigned to class
- Class in `in_progress`, `completed`, or `archived` state
- Space not found or belongs to different gym
- New coach not a valid GymStaff member
- Capacity reduction conflicts with bookings

**Affected Entities:**

- Class (update)

**Note:** Per PRODUCT.md, coaches can only edit structural details in Published or Booking Closed states. Once In Progress, the class is locked.

---

#### Command: ManuallyTransitionClassState

**Actor(s):** Coach

**Intent:** Manually move a class to the next lifecycle state.

**Required Inputs:**

- `user_id` (string; authenticated coach)
- `class_id` (string)
- `target_state` (enum: `booking_closed`, `in_progress`, `completed`, `archived`)

**Preconditions:**

- Coach is assigned to the class (or gym owner; owner can always transition)
- Class exists
- Class.state + 1 = target_state (only one-step transitions allowed; state machine enforced)
- Transitioning to `in_progress`: class start time has passed or is imminent (implementation-specific tolerance)
- Transitioning to `completed`: class is in `in_progress`
- Transitioning to `archived`: class is in `completed`
- Transitioning to `booking_closed`: bookings are currently open

**State Changes:**

- Update Class.state = target_state
- Class.last_modified_at = now
- If transitioning to `completed`: finalize attendance (prevent further marking)
- If transitioning to `archived`: lock all structural edits and result edits

**Failure Cases:**

- Coach not assigned to class
- Class not found
- Invalid state transition
- Class already in target state

**Affected Entities:**

- Class (update)
- Attendance (read-only; finalized on transition to completed)

---

### GYM OWNER COMMANDS

---

#### Command: RegisterGym

**Actor(s):** Gym Owner (unauthenticated or new user)

**Intent:** Submit a gym registration for platform admin approval.

**Required Inputs:**

- `owner_user_id` (string; authenticated or new user to create)
- `gym_name` (string)
- `description` (string)
- `location` (string or structured address)
- `logo_url` (string; optional)

**Preconditions:**

- Owner user exists or will be created via CreateAthleteAccount
- Gym name is unique per gym (or allow duplicates; implementation-specific)
- Location is valid (implementation-specific validation)

**State Changes:**

- Create Gym with:
  - `status = pending_approval` (awaiting platform admin review; implementation-specific)
  - or `status = active` (auto-approved; implementation-specific)
  - `owner_user_id = provided user`
  - `created_at = now`
- Create GymStaff entry with:
  - `gym_id = new gym`
  - `user_id = owner_user_id`
  - `role = owner`
  - `status = active`

**Failure Cases:**

- Owner user not found
- Invalid gym name or location
- Duplicate gym (if enforced)

**Affected Entities:**

- Gym (create)
- GymStaff (create; owner role)

**Note:** Platform admin must approve (ApproveGymRegistration) before gym is fully active. Implementation may auto-approve for MVP simplicity.

---

#### Command: UpdateGymProfile

**Actor(s):** Gym Owner

**Intent:** Update gym profile details.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `name` (string; optional)
- `description` (string; optional)
- `location` (string; optional)
- `logo_url` (string; optional)

**Preconditions:**

- User is gym owner for the gym (GymStaff with role = `owner`)
- Gym exists and `status = active`
- User is authenticated

**State Changes:**

- Update Gym with provided fields
- Gym.last_modified_at = now

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Invalid field values

**Affected Entities:**

- Gym (update)

---

#### Command: CreateSpace

**Actor(s):** Gym Owner

**Intent:** Define a physical training location in the gym.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `name` (string; e.g., "Main Floor", "Weightlifting Room")
- `base_capacity` (integer; default max capacity)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- Name is unique per gym (or allow duplicates; implementation-specific)
- Capacity > 0

**State Changes:**

- Create Space with provided fields
- Space is available for class assignment

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Invalid capacity or name

**Affected Entities:**

- Space (create)

---

#### Command: UpdateSpace

**Actor(s):** Gym Owner

**Intent:** Modify space details.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `space_id` (string)
- `name` (string; optional)
- `base_capacity` (integer; optional)

**Preconditions:**

- User is gym owner for the space's gym
- Space exists
- Name is unique per gym (if changed)
- Capacity > 0

**State Changes:**

- Update Space with provided fields
- Existing classes assigned to this space inherit the new capacity (if not overridden at class level)

**Failure Cases:**

- User not gym owner
- Space not found
- Invalid field values

**Affected Entities:**

- Space (update)

---

#### Command: DeleteSpace

**Actor(s):** Gym Owner

**Intent:** Remove a space (soft delete or hard delete; implementation-specific).

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `space_id` (string)

**Preconditions:**

- User is gym owner for the space's gym
- Space exists
- No active classes are assigned to this space (or allow reassignment; implementation-specific)

**State Changes:**

- Soft delete Space: Set `deleted_at = now`, mark as inactive
- Or hard delete Space (not recommended for audit trails)

**Failure Cases:**

- User not gym owner
- Space has active classes assigned
- Space not found

**Affected Entities:**

- Space (update)
- Class (read-only; affected if space is deleted)

---

#### Command: ConfigureClassTypes

**Actor(s):** Gym Owner

**Intent:** Create, update, or delete class types for the gym.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `operation` (enum: `create`, `update`, `delete`)
- `class_type_id` (string; required for update/delete)
- `name` (string; required for create, optional for update)
- `loggable` (boolean; optional)
- `result_metrics` (enum: `time`, `reps`, `weight`, `rounds`, `none`; optional)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- If create: name is unique per gym
- If delete: no active classes reference this class type

**State Changes:**

- Create: New ClassType with provided fields
- Update: Existing ClassType with provided fields (only changed fields)
- Delete: Soft delete ClassType, set `deleted_at = now` (or mark inactive)

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Duplicate class type name
- Class type still referenced by active classes
- Class type not found (for update/delete)

**Affected Entities:**

- ClassType (create, update, or delete)

---

#### Command: CreateMembershipPlan

**Actor(s):** Gym Owner

**Intent:** Define a subscription tier that grants class access.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `name` (string; e.g., "Monthly Unlimited", "10 Classes/Month")
- `pricing` (integer; amount in cents)
- `billing_cycle` (enum: `monthly`, `annual`)
- `class_types` (array of ClassType IDs; which class types this plan grants access to)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- All class_types exist and belong to the same gym
- Pricing > 0
- Name is unique per gym (or allow duplicates; implementation-specific)

**State Changes:**

- Create MembershipPlan with:
  - `status = active`
  - `created_at = now`
  - All provided fields

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Invalid pricing or billing cycle
- Class types not found or belong to different gym
- Duplicate plan name

**Affected Entities:**

- MembershipPlan (create)

---

#### Command: UpdateMembershipPlan

**Actor(s):** Gym Owner

**Intent:** Modify an existing membership plan.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `membership_plan_id` (string)
- `name` (string; optional)
- `pricing` (integer; optional)
- `billing_cycle` (enum; optional)
- `class_types` (array of ClassType IDs; optional)

**Preconditions:**

- User is gym owner for the plan's gym
- Plan exists and `status = active` (not archived)
- All class_types exist and belong to the same gym
- Pricing > 0 (if changed)

**State Changes:**

- Update MembershipPlan with provided fields
- Existing athletes with this plan retain access; changes apply to new athletes
- If class_types change: existing athletes' access is updated retroactively (implementation-specific; may send notifications)

**Failure Cases:**

- User not gym owner
- Plan not found or archived
- Invalid field values
- Class types not found or belong to different gym

**Affected Entities:**

- MembershipPlan (update)

---

#### Command: ArchiveMembershipPlan

**Actor(s):** Gym Owner

**Intent:** Retire a membership plan (existing athletes retain access, new athletes cannot purchase).

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `membership_plan_id` (string)

**Preconditions:**

- User is gym owner for the plan's gym
- Plan exists and `status = active`

**State Changes:**

- Set MembershipPlan.status = `archived`
- Existing AthleteMembershipPlans retain access until expiration
- Plan no longer available for new purchases

**Failure Cases:**

- User not gym owner
- Plan not found or already archived

**Affected Entities:**

- MembershipPlan (update)

---

#### Command: CreateClass

**Actor(s):** Gym Owner

**Intent:** Schedule a new class for upcoming delivery.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `class_type_id` (string)
- `coach_user_id` (string; coach assigned to class)
- `space_id` (string)
- `scheduled_date` (date)
- `scheduled_time` (time)
- `capacity` (integer; optional; defaults to space.base_capacity)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- ClassType exists and belongs to gym
- Coach is active GymStaff with role = `coach` in the gym
- Space exists and belongs to gym
- scheduled_date + scheduled_time is in the future
- Capacity > 0

**State Changes:**

- Create Class with:
  - `state = published`
  - `created_at = now`
  - All provided fields
- Class is immediately visible to eligible athletes

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- ClassType not found or belongs to different gym
- Coach not found or not a valid GymStaff member
- Space not found or belongs to different gym
- Scheduled date/time is in the past
- Invalid capacity

**Affected Entities:**

- Class (create)

---

#### Command: UpdateClassStructure

**Actor(s):** Gym Owner

**Intent:** Modify class structural details (same as coach, but owner has broader authority).

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `class_id` (string)
- `scheduled_date` (date; optional)
- `scheduled_time` (time; optional)
- `space_id` (string; optional)
- `capacity` (integer; optional)
- `coach_user_id` (string; optional)

**Preconditions:**

- User is gym owner for the class's gym
- Class exists and `state = published` OR `state = booking_closed` (per PRODUCT)
- All referenced entities belong to same gym
- Scheduled date/time is valid (not in past, unless already started)
- Coach is active GymStaff with role = `coach`

**State Changes:**

- Update Class with provided fields
- If capacity is reduced: document conflict (no automatic cancellations)
- Send notifications to affected athletes if changes are material

**Failure Cases:**

- User not gym owner
- Class in wrong state
- Invalid field values
- Referenced entities not found

**Affected Entities:**

- Class (update)

---

#### Command: ManuallyAddMember

**Actor(s):** Gym Owner

**Intent:** Enroll an athlete in the gym without requiring an invite code.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `athlete_user_id` (string; the athlete to add)
- `membership_plan_id` (string; optional; plan to assign immediately)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- Athlete user exists
- If membership_plan_id provided: plan exists and belongs to gym

**State Changes:**

- Create GymMembership with:
  - `status = active`
  - `joined_at = now`
- If membership_plan_id provided:
  - Create AthleteMembershipPlan with:
    - `status = active`
    - `started_at = now`
    - `expires_at = now + billing_cycle`

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Athlete not found
- Athlete already in gym
- Plan not found or belongs to different gym

**Affected Entities:**

- GymMembership (create)
- AthleteMembershipPlan (create, optional)

---

#### Command: InviteCoach

**Actor(s):** Gym Owner

**Intent:** Send an invitation to a user to become a coach at the gym.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `coach_email` (string; email of the coach to invite)

**Preconditions:**

- User is gym owner for the gym
- Gym exists and `status = active`
- Coach email is valid (or user exists)
- Coach is not already a GymStaff member of this gym

**State Changes:**

- Create GymStaff entry with:
  - `role = coach`
  - `status = active`
  - `assigned_at = now`
- Send invitation email (implementation-specific; may be async)

**Failure Cases:**

- User not gym owner
- Gym not found or suspended
- Coach already invited or a staff member

**Affected Entities:**

- GymStaff (create)

---

#### Command: ChangeCoachStatus

**Actor(s):** Gym Owner

**Intent:** Enable or revoke a coach's access to the gym.

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `gym_id` (string)
- `coach_user_id` (string)
- `status` (enum: `active`, `inactive`)

**Preconditions:**

- User is gym owner for the gym
- Gym exists
- GymStaff entry exists for the coach with role = `coach`
- Coach is not the gym owner (cannot disable oneself)

**State Changes:**

- Set GymStaff.status = provided status
- If status = `inactive`: coach is hidden from new class assignments but retains visibility of past classes

**Failure Cases:**

- User not gym owner
- Gym not found
- GymStaff not found
- Coach is gym owner

**Affected Entities:**

- GymStaff (update)

---

#### Command: ManuallyTransitionClassState

**Actor(s):** Gym Owner

**Intent:** Manually advance a class through its lifecycle (same as coach, with owner authority).

**Required Inputs:**

- `user_id` (string; authenticated gym owner)
- `class_id` (string)
- `target_state` (enum: `booking_closed`, `in_progress`, `completed`, `archived`)

**Preconditions:**

- User is gym owner for the class's gym
- Class exists
- Class.state + 1 = target_state (one-step transitions only)
- Transitioning to `in_progress`: class start time is near or past
- Transitioning to `completed`: class is in `in_progress`
- Transitioning to `archived`: class is in `completed`

**State Changes:**

- Update Class.state = target_state
- Class.last_modified_at = now
- If transitioning to `in_progress`: finalize bookings
- If transitioning to `completed`: finalize attendance
- If transitioning to `archived`: lock all edits

**Failure Cases:**

- User not gym owner
- Class not found
- Invalid state transition

**Affected Entities:**

- Class (update)

---

### PLATFORM ADMIN COMMANDS

---

#### Command: ApproveGymRegistration

**Actor(s):** Platform Admin

**Intent:** Approve a pending gym registration and activate it.

**Required Inputs:**

- `user_id` (string; authenticated platform admin)
- `gym_id` (string)

**Preconditions:**

- User is platform admin (implementation-specific role; not in MVP data model)
- Gym exists and `status = pending_approval` (or similar)

**State Changes:**

- Set Gym.status = `active`
- Gym owner can now configure and publish classes
- Notify gym owner of approval (async)

**Failure Cases:**

- User not platform admin
- Gym not found
- Gym already approved or suspended

**Affected Entities:**

- Gym (update)

---

#### Command: RequestGymInfo

**Actor(s):** Platform Admin

**Intent:** Ask a gym owner to provide additional information during review.

**Required Inputs:**

- `user_id` (string; authenticated platform admin)
- `gym_id` (string)
- `message` (string; details requested)

**Preconditions:**

- User is platform admin
- Gym exists and `status = pending_approval`

**State Changes:**

- Send message to gym owner (async; implementation-specific storage)
- No state change to Gym

**Failure Cases:**

- User not platform admin
- Gym not found
- Gym not pending approval

**Affected Entities:**

- Gym (read-only)

**Note:** This is informational; implementation may store messages in a separate Communication or Audit table.

---

#### Command: SuspendGym

**Actor(s):** Platform Admin

**Intent:** Disable a gym account (due to compliance, non-payment, or violation).

**Required Inputs:**

- `user_id` (string; authenticated platform admin)
- `gym_id` (string)
- `reason` (string; reason for suspension)

**Preconditions:**

- User is platform admin
- Gym exists and `status = active`

**State Changes:**

- Set Gym.status = `suspended`
- Athletes can no longer view classes or book
- Coaches and owners can no longer manage classes
- Notify gym owner of suspension (async)

**Failure Cases:**

- User not platform admin
- Gym not found
- Gym already suspended

**Affected Entities:**

- Gym (update)

**Note:** Reason may be logged to Audit table for compliance.

---

#### Command: UnsuspendGym

**Actor(s):** Platform Admin

**Intent:** Restore a suspended gym account.

**Required Inputs:**

- `user_id` (string; authenticated platform admin)
- `gym_id` (string)

**Preconditions:**

- User is platform admin
- Gym exists and `status = suspended`

**State Changes:**

- Set Gym.status = `active`
- Classes, bookings, and operations resume
- Notify gym owner of restoration (async)

**Failure Cases:**

- User not platform admin
- Gym not found
- Gym not suspended

**Affected Entities:**

- Gym (update)

---

## Part 3: Cross-Command Invariants

The following invariants are enforced across all commands and represent load-bearing constraints:

### Booking Rules

1. Bookings can only be created when `class.state = published`
2. Bookings can only be cancelled when `class.state = published`
3. When a booking is cancelled and capacity opens, the first waitlisted athlete is automatically promoted (per DECISIONS.md)
4. An athlete cannot have two active bookings for the same class

### Class Visibility & Access

1. A class is only visible to an athlete if:
   - Athlete has active `GymMembership` for the class's gym
   - Athlete has active `AthleteMembershipPlan` for that gym
   - The plan's `class_types` includes the class's `class_type_id`
2. Classes hidden from an athlete must not appear in any search, schedule, or list view
3. Ineligible athletes receive no notification of classes they cannot access

### Class Lifecycle Transitions

1. Classes progress unidirectionally: `published` → `booking_closed` → `in_progress` → `completed` → `archived`
2. All state transitions are explicit and logged (via `last_modified_at`, `last_modified_by_user_id` if tracked)
3. Once a class reaches `in_progress`, programming is locked and cannot be edited
4. Once a class reaches `completed`, no structural edits are allowed
5. Once a class reaches `archived`, all edits (structural, programming, results) are forbidden

### Attendance & Results

1. Attendance records are created during or after class `in_progress` state
2. An athlete can only log results if:
   - Class.state = `completed`
   - Athlete has `present = true` in Attendance record
   - Class.class_type.loggable = true
3. Results can be edited until the class transitions to `archived` (no time-window limit; per DECISIONS.md)
4. Once archived, results are immutable

### Multi-Tenant Isolation

1. Every query filtering by `gym_id` must use the authenticated user's gym context
2. Coaches can only view/edit classes assigned to them in their gym
3. Gym owners can only view/edit classes and staff within their gym
4. Athletes can only see classes in gyms where they have active membership

### Membership Plan Access

1. When a plan is archived, existing athletes retain access until their plan expires
2. Archived plans cannot be purchased by new athletes
3. When plan.class_types change, existing athletes' access is updated immediately
4. Athletes with expired plans cannot book classes but can view history

### Structural Edits

1. Classes in `published` or `booking_closed` states allow capacity, time, space, and coach changes
2. Classes in `in_progress`, `completed`, or `archived` states forbid all structural edits
3. Capacity reductions that conflict with existing bookings do not automatically cancel bookings; conflict is flagged for manual resolution

---

## Part 4: Explicit Non-Commands (Deliberately Excluded from MVP)

The following actions are **not** modeled as commands in the MVP:

| Non-Command                         | Reason                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **CreateRecurringClassSeries**      | MVP supports single-session classes only (DECISIONS.md). No concept of "repeat every Monday."                  |
| **PromoteWaitlistWithConfirmation** | Waitlist promotion is automatic and immediate; no confirmation window (DECISIONS.md).                          |
| **EditResultWithTimeWindow**        | Athletes can edit results until archived; no time-window cutoff (DECISIONS.md).                                |
| **ApproveWaitlistPromotion**        | Promotion is automatic; no approval step exists.                                                               |
| **SetResultLoggingWindow**          | No time limit on when results can be logged; until archived is the only constraint.                            |
| **CancelBookingByOwner**            | Only athletes cancel bookings. Owners can only mark attendance.                                                |
| **RequestPayment**                  | Payment processing is out of scope for MVP command model. Assume Stripe/PayPal integration handled separately. |
| **PostAnnouncement**                | Announcements are deferred to Phase 2 (MVP_SCREENS.md).                                                        |
| **LeaderboardUpdate**               | Gamification is out of scope (PRODUCT.md).                                                                     |
| **SyncWearableData**                | Wearables integration is out of scope (PRODUCT.md).                                                            |
| **CreateGymChallenge**              | Challenges are out of scope (PRODUCT.md).                                                                      |
| **GenerateAnalyticsReport**         | Advanced analytics is deferred to Phase 2.                                                                     |
| **DiscoverGymMarketplace**          | National marketplace is out of scope (PRODUCT.md); independent gyms only.                                      |
| **FederatePayments**                | Inter-gym payment distribution is out of scope (PRODUCT.md).                                                   |

---

## Summary

This command model comprises **35 total commands**:

- **11 Athlete commands:** Account creation, authentication, gym enrollment, class booking, result logging, profile management
- **5 Coach commands:** Programming, attendance marking, class state transitions
- **15 Gym Owner commands:** Gym setup, space/type/plan configuration, class scheduling, staff management, class operations
- **4 Platform Admin commands:** Gym approval, suspension, compliance

All commands enforce class lifecycle rules, multi-tenant isolation, membership-based visibility, and the four resolved decisions from DECISIONS.md.

Commands are sufficient and necessary to execute all user journeys defined in USER_JOURNEYS.md and to populate all 32 MVP screens defined in MVP_SCREENS.md.
