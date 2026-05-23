# EPIC: Gym Owner Class Management (Epic E)

**Status:** ✅ COMPLETE (2026-05-05)  
**Start Date:** 2026-05-04  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/GYM_OWNER_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Give gym owners a full management view for individual classes. From the Schedule Dashboard, owners can tap any class to see its details, bookings, waitlist, and take actions: advance state, mark attendance, add/view programming.

---

## Current State

- Schedule Dashboard shows classes in a week view but class cards are not tappable
- No class detail/management screen exists for gym owners
- Owners cannot mark attendance (coach-only guard)
- Owners cannot update class structure (coach-only guard)
- No single-class GET endpoint exists (schedule returns full list only)

---

## Scope

### Included

- `GET /api/gyms/:gymId/classes/:classId` — single class detail endpoint
- Loosen `POST /:classId/attendance` and `PATCH /:classId/structure` to allow owners
- `class-management.tsx` screen implementing the Pencil design
- Navigation from Schedule Dashboard → Class Management on class card tap

### Excluded

- Edit class form (separate task)
- Results viewing in Class Management (deferred — no design frame for it yet)
- Bulk attendance marking
- Notification sending on state change

---

## Design Reference

`designs/gym-owner-screens.pen`, frame: `Class Management` (id: `YlnNz`)

**Layout extracted from Pencil:**
- Sidebar nav (220px, `#F3F4F6`) — Schedule nav item active (`#DBEAFE`)
- Main area (padding 24/32, gap 20, vertical layout)
- **Header row:** class title (22px bold `#111827`) + date subtitle (13px `#6B7280`) | right: Edit button (outlined) + State dropdown (outlined, dot indicator)
- **Info card** (`#F9FAFB`, cornerRadius 10, border `#E5E7EB`, padding 20/24, gap 32 between items):
  - Class Type · Coach · Duration · Capacity (booked/total) · Space
  - Labels: 11px `#9CA3AF` uppercase. Values: 14px `#111827` medium
- **Action row** (gap 10):
  - "Mark Attendance" — filled `#111827`, cornerRadius 8, padding 10/18
  - "Add Programming" — outlined `#D1D5DB`, cornerRadius 8, padding 10/18
- **Lists row** (side by side, gap 20):
  - **Attendance List** (fill width): header "Attendance List" + blue badge "N booked" (`#DBEAFE`/`#1D4ED8`); table with Athlete + Status columns; rows with avatar circle + name + status badge
  - **Waitlist** (280px fixed): header "Waitlist" + amber badge "N waiting" (`#FEF3C7`/`#B45309`); rows with avatar circle + name

---

## Tasks

### Task #1 — Backend: Single class detail endpoint + loosen owner guards

**Status:** ✅ Complete

- `GET /api/gyms/:gymId/classes/:classId` added, `@Role(['coach', 'owner'])`
- `ClassScheduleItemDto` now includes `spaceName`
- `POST /:classId/attendance` and `PATCH /:classId/structure` now allow owners

---

### Task #2 — Frontend: Class Management screen

**Status:** ✅ Complete

- `frontend/app/class-management.tsx` implemented matching `Class Management` Pencil frame
- Info card, attendance table, waitlist panel, state transition button all wired to real API data
- "Mark Attendance" → `coach-mark-attendance`, "Add Programming" → `coach-class-details`

---

### Task #3 — Frontend: Wire Schedule Dashboard → Class Management

**Status:** ✅ Complete

- `ClassCard` now tappable via `TouchableOpacity`
- Tapping navigates to `/class-management?classId=<id>`

---

## Security Invariants

- `GET /:classId` must validate `classId` belongs to `gymId` — no cross-gym access
- Attendance and structure mutations must validate gymId scoping (already enforced by existing handler pattern)
- Owner can only manage classes in their own gym (`currentGymId` check)

---

## Done When

- [ ] `GET /api/gyms/:gymId/classes/:classId` returns single class data
- [ ] Owners can mark attendance and update class structure without 403
- [ ] Class Management screen renders with real data (info card, bookings, waitlist)
- [ ] State transition button advances class state
- [ ] Schedule Dashboard class cards navigate to Class Management
- [ ] TypeScript compiles cleanly, no implicit `any`
- [ ] Swagger updated
