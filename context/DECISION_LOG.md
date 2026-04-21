# Decision Log

## Auth Model

- Header-based auth (x-user-id, x-gym-id)
- No JWT usage on frontend (by design)

## Booking State

- Derived by merging:
  - class schedule
  - /api/me/bookings
- Never inferred from capacity

## Cancel Booking

- bookingId comes only from bookings query
- DELETE has no body
- URL param is source of truth

## Alerts

- Centralized cross-platform helper
- No direct Alert.alert usage in screens

## Next Feature Phase: Minimal Gym Owner (2026-04-21)

**Decision:** Build Minimal Gym Owner MVP next instead of full Gym Owner or Coach features.

**Rationale:**
- Unblocks all remaining features (Coach can't work without gyms/classes)
- Enables B2B: Gym owners can self-serve create gym, schedule classes, invite coaches
- Backend already fully designed; endpoints exist for all Minimal Gym Owner operations
- Faster to ship (2-3 weeks) than full Gym Owner (4-8 weeks)
- Sets up Coach features as natural Phase 2

**Scope (Minimal):**
- Create/configure gym (1 screen)
- Create/schedule classes (1 screen)  
- Invite coaches (modal or simple screen)
- Skip: Member management, billing, analytics (Phase 3)

**No refactoring risk:** Frontend screens are isolated; backend API contract already established.
