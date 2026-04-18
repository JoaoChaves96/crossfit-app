# MVP Command Status

This checklist tracks implementation progress of all MVP commands
defined in COMMAND_MODEL.md.

Only commands explicitly marked as completed have been implemented
and integrated into the backend.

---

## Phase 1 — Core Class Participation

These commands complete the core athlete lifecycle:
book → attend → log result.

- [x] CreateClass
- [x] BookClass
- [x] CancelBooking
- [x] MarkAttendance
- [x] LogResult
- [x] EditResult

---

## Phase 2 — Coach Control & Class Management

These commands govern class behavior and coach authority.

- [x] AddOrEditProgramming
- [x] ToggleLoggableStatus
- [x] ManuallyTransitionClassState (Coach)
- [x] UpdateClassStructure (Coach)

---

## Phase 3 — Gym Configuration & Business Rules

These commands configure the gym and membership business logic.

### Spaces

- [x] CreateSpace
- [x] UpdateSpace
- [x] DeleteSpace

### Class Types

- [x] ConfigureClassTypes

### Membership Plans

- [x] CreateMembershipPlan
- [x] UpdateMembershipPlan
- [x] ArchiveMembershipPlan
- [x] PurchaseMembershipPlan

### People Management

- [x] ManuallyAddMember
- [x] InviteCoach
- [x] ChangeCoachStatus

---

## Phase 4 — Platform Administration

These commands are platform-level controls.

- [ ] ApproveGymRegistration
- [ ] RequestGymInfo
- [ ] SuspendGym
- [ ] UnsuspendGym
