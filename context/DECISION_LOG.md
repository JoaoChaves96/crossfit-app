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
