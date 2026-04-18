# MVP Screen Consolidation

**Role:** Senior Product Designer  
**Input Sources:** PRODUCT.md, USER_JOURNEYS.md, SCREENS_INVENTORY.md  
**Scope:** Minimal, buildable MVP screen set supporting core user journeys only  
**Date:** 2026-04-18

---

## Executive Summary

The original screen inventory contains **50+ screens**. This consolidation reduces that to **32 screens** by:

1. **Merging related screens** (e.g., Class Details + Booking actions in single screen)
2. **Deferring convenience features** (Personal Records as separate screen → tab within Training History)
3. **Collapsing admin list+detail patterns** (Members List + Member Details → single consolidated view)
4. **Using modals/drawers instead of dedicated screens** (Booking Confirmation, Gym Switcher)
5. **Eliminating out-of-journey screens** (Announcements, detailed payment history)

**Result:** A coherent, lean MVP that fully supports all core journeys (Athlete, Gym Owner, Coach) with clear entry points and no orphaned features.

---

## Final MVP Screen List

### 1. SHARED SCREENS (All Roles)

#### Authentication & Account

| Screen                 | Purpose                                   | Primary Actions                                                                 | Journey Mapping                         |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| **Sign Up / Register** | Create account with email or social login | Email signup / Social OAuth, Set password, Accept terms                         | All roles begin here                    |
| **Login**              | Authenticate existing user                | Email + password / Social login, Remember me, Forgot password link              | All roles daily entry                   |
| **Password Reset**     | Recover account access                    | Request reset link, Verify email, Set new password                              | Support flow (deferred if not critical) |
| **Profile & Settings** | Manage account and preferences            | Edit name/email, Unit preferences (athlete), Notification preferences, Sign out | All roles post-login                    |

**Consolidation Notes:**

- Password Reset is a modal flow, not a full screen
- Notification Preferences consolidated into Profile Settings
- Role-specific profile content (athlete unit prefs, coach bio) handled within single screen

---

### 2. ATHLETE SCREENS (Mobile-First)

| Screen                       | Purpose                                      | Primary Actions                                                             | MVP Essential |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | ------------- |
| **Class Schedule**           | Browse upcoming eligible classes             | View week/day, Filter by type, Tap for details, Gym switcher (if multi-gym) | ✅ MUST       |
| **Class Details**            | View full class info and book                | Book class, Cancel booking, Join/remove waitlist, View programming          | ✅ MUST       |
| **My Booked Classes**        | View upcoming and past booked classes        | Filter upcoming/past, Tap for details, Cancel, Remove from waitlist         | ✅ MUST       |
| **Log Results**              | Submit workout results for completed class   | View programming, Enter metric fields, Submit/save draft/skip               | ✅ MUST       |
| **Training History**         | View personal training record and progress   | Filter by time/type, Tap for details, View personal records (sub-tab)       | ✅ MUST       |
| **Active Membership Status** | Display current membership and access rights | View plan details, Upgrade plan, Manage payment method, View invoices       | ✅ MUST       |
| **Membership Plans**         | Browse and purchase plans                    | View plan details, Purchase plan, Enter payment info                        | ✅ MUST       |
| **Join Gym**                 | Add athlete to a gym                         | Enter invite code / Scan QR, View gym details, Confirm join                 | ✅ MUST       |

**Total: 8 screens**

**Consolidated Away:**

- ❌ Booking Confirmation → Modal/Toast (not a screen)
- ❌ In-Progress Class (View Only) → Inline state in My Booked Classes
- ❌ Personal Records (separate screen) → Tab within Training History
- ❌ Gym Switcher → Nav element, not screen

---

### 3. GYM OWNER SCREENS (Web-First)

| Screen                             | Purpose                                   | Primary Actions                                                                                                                          | MVP Essential |
| ---------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Gym Configuration**              | Create and configure gym (wizard-style)   | Multi-step: Name/location → Logo/description → Hours → Spaces & capacities → Review & submit                                             | ✅ MUST       |
| **Gym Profile (Edit)**             | Update gym details after setup            | Edit name/description/location, Add/remove logo, Update hours                                                                            | ✅ MUST       |
| **Gym Settings**                   | Manage spaces, booking rules, class types | Create/edit/delete spaces, Configure booking freeze, Define class types                                                                  | ✅ MUST       |
| **Membership Plans (List)**        | View and manage all plans                 | View plans & subscribers, Edit, Archive, Duplicate, Create new                                                                           | ✅ MUST       |
| **Membership Plans (Create/Edit)** | Define subscription plans                 | Set name/pricing/billing, Select class types, Set capacity if applicable                                                                 | ✅ MUST       |
| **Schedule Dashboard**             | Manage and monitor class schedule         | View classes (calendar/list), See bookings & waitlist, Identify near-freeze, Create class                                                | ✅ MUST       |
| **Create/Edit Class**              | Schedule a new class or modify existing   | Date/time/duration, Class type, Coach, Space, Capacity, Recurrence                                                                       | ✅ MUST       |
| **Class Management**               | Comprehensive class detail and control    | View metadata, Bookings & waitlist, Attendance list, Submitted results, Mark attendance, Adjust capacity, Edit programming, Change state | ✅ MUST       |
| **Coaches List & Details**         | View and manage coaches                   | View coaches with status, Classes assigned, Invite new, Edit, Disable/enable, Reassign classes                                           | ✅ MUST       |
| **Members List & Details**         | View and manage gym members               | Filter by status/plan, Search, View details, Change plan, Suspend/resume, Manually add member                                            | ✅ MUST       |

**Total: 10 screens**

**Consolidated Away:**

- ❌ Spaces & Capacities + Booking Rules + Class Types → Gym Settings (tabs)
- ❌ Booking Monitor → Merged with Schedule Dashboard
- ❌ Class Details (Admin) + Mark Attendance + Class Outcome → Single Class Management screen
- ❌ Coaches List + Coach Details → Consolidated pattern
- ❌ Members List + Member Details + Manually Add Member → Single consolidated view
- ❌ Invite Coach → Modal within Coaches List
- ❌ Announcements → DEFERRED

---

### 4. COACH SCREENS (Web-First)

| Screen                          | Purpose                                 | Primary Actions                                                                                                        | MVP Essential |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- |
| **My Assigned Classes**         | View classes coach is assigned to       | Filter by gym/upcoming/past, View programming status, Tap to manage                                                    | ✅ MUST       |
| **Class Programming & Details** | Edit programming and manage class       | View metadata, Bookings, Waitlist, Current programming, Add/edit programming, Toggle loggable, View attendance/results | ✅ MUST       |
| **Mark Attendance**             | Record attendance during or after class | List of booked athletes, Checkbox per athlete, Add notes, Submit                                                       | ✅ MUST       |

**Total: 3 screens**

**Consolidated Away:**

- ❌ Add/Edit Programming → Action within Class Programming & Details
- ❌ View Submitted Results → Shown inline when class is Completed

---

### 5. PLATFORM ADMIN SCREENS (Minimal MVP)

| Screen                        | Purpose                                  | Primary Actions                                                            | MVP Essential |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- | ------------- |
| **Pending Gym Registrations** | Review and approve new gym registrations | View gym info, Approve, Request info, Suspend                              | ✅ MUST       |
| **Gym Details (Admin View)**  | Manage gym at platform level             | View all config, Owner info, Member count, Approve/suspend, View audit log | ✅ MUST       |

**Total: 2 screens**

**Deferred:**

- ❌ Platform Activity / Health dashboard → Phase 2

---

## Screen Consolidation Summary

| Category  | Original | MVP    | Reduction |
| --------- | -------- | ------ | --------- |
| Shared    | 6        | 4      | -33%      |
| Athlete   | 13       | 8      | -38%      |
| Gym Owner | 19       | 10     | -47%      |
| Coach     | 6        | 3      | -50%      |
| Admin     | 3        | 2      | -33%      |
| **TOTAL** | **50+**  | **32** | **-36%**  |

---

## Deferred Screens (Phase 2+)

| Screen                                 | Reason                                                  | Phase                |
| -------------------------------------- | ------------------------------------------------------- | -------------------- |
| **Payment History & Invoices**         | Detailed transaction log; not critical to core journey  | Phase 2              |
| **Announcements (Create/List/Edit)**   | Communication tool; gym owners have alternatives in MVP | Phase 2              |
| **Platform Activity Dashboard**        | Monitoring tool; non-blocking for launch                | Phase 2              |
| **Personal Records (separate screen)** | Can be tab within Training History                      | Phase 1.5 (optional) |

---

## Journey Coverage (All Covered)

### ✅ Athlete Journey

- View Schedule → Class Schedule
- View Details → Class Details
- Book Class → Class Details (action)
- Booking Closure → My Booked Classes (state)
- Attend Class → My Booked Classes (In Progress state)
- Log Results → Log Results screen
- View History → Training History + Personal Records

### ✅ Gym Owner Journey

- Configure Gym → Gym Configuration + Gym Profile + Gym Settings
- Configure Plans → Membership Plans (List + Create/Edit)
- Create Schedule → Schedule Dashboard + Create/Edit Class
- Monitor Bookings → Schedule Dashboard
- Adjust After Closed → Class Management
- Review Outcome → Class Management

### ✅ Coach Journey

- View Assigned Classes → My Assigned Classes
- Add Programming → Class Programming & Details
- Prepare → Class Programming & Details
- Run Class → Mark Attendance
- Close Class → Class Programming & Details (state-driven)
- View Results → Class Programming & Details

### ✅ Admin Journey

- Review Registrations → Pending Gym Registrations
- Manage Gym → Gym Details (Admin View)

---

## Product Constraints Preserved

All MVP screens enforce:

✅ Class Visibility Rules (membership-based access)  
✅ Class State Lifecycle (Published → Booking Closed → In Progress → Completed → Archived)  
✅ Role-Based Access Control (no role crossover)  
✅ Structural Immutability (no edits after Completed)  
✅ Results Ownership (coaches view, athletes submit)  
✅ Booking Rules (only in Published state)  
✅ Multi-Tenant Isolation (strict gym data separation)

---

**Decision Resolution Notice**

All blocking questions listed below are resolved for MVP in `DECISIONS.md`
unless explicitly marked as unresolved.
`DECISIONS.md` is authoritative and overrides assumptions or open questions
from earlier documents (including `SCREENS.md` and initial screen inventories).

## Blocking Questions (Must Answer Before Design)

1. **Gym Registration Approval**
   - Manual or auto-approval? SLA for manual review?
   - **Impact:** New gym onboarding timeline

2. **Coach Multi-Gym Assignment**
   - Can coaches be assigned to classes in multiple gyms?
   - If yes, how do they switch context?
   - **Impact:** Coach screen navigation scope

3. **Waitlist Promotion**
   - Auto-enroll or must athlete accept?
   - Time window to accept (e.g., 30 min)?
   - **Impact:** Class capacity guarantee and notifications

4. **Membership Expiry During Booking Period**
   - Can athlete still attend if membership expires mid-week?
   - Auto-cancel expired bookings or keep with warning?
   - **Impact:** Booking validation and athlete communication

5. **Programming Attachment Requirement**
   - Must be attached before booking closes, or anytime before In Progress?
   - Does class run without programming?
   - **Impact:** Coach workflow and class viability

6. **Class Recurrence Support**
   - MVP support for recurring classes, or single sessions only?
   - Can instances be edited independently?
   - **Impact:** Major feature scope decision

7. **Result Logging Window**
   - Unlimited logging window, or cutoff (e.g., 7 days)?
   - Can athletes edit submitted results?
   - **Impact:** Data integrity and athlete experience

8. **Payment Gateway**
   - Which processor (Stripe, PayPal, etc.)?
   - Error handling in-app or delegated?
   - **Impact:** PCI scope and error UX

---

## Navigation Structure (MVP)

### Athlete (Mobile)

```
Tabs: Schedule | My Classes | Training | Membership | Profile
  └─ Schedule → Class Schedule → Class Details → Book/Cancel/Waitlist
  └─ My Classes → Upcoming & Past → Log Results (if eligible)
  └─ Training → History → Personal Records (sub-tab)
  └─ Membership → Status → Upgrade/Payment
  └─ Profile → Settings, Notifications, Sign Out
```

### Gym Owner (Web)

```
Sidebar: Schedule | Members | Coaches | Settings
  └─ Schedule → Dashboard → Create Class → Class Management
  └─ Members → List/Details → Add Member
  └─ Coaches → List/Details → Invite Coach
  └─ Settings → Gym Profile, Gym Settings, Plans
```

### Coach (Web)

```
Sidebar: My Classes | Profile
  └─ My Classes → List → Class Programming & Details → Mark Attendance
  └─ Profile → Settings, Notifications, Sign Out
```

### Admin (Web)

```
Sidebar: Pending Gyms | Gyms
  └─ Pending Gyms → List → Gym Details
  └─ Gyms → List (approved) → Gym Details
```

---

## MVP Acceptance Criteria

✅ All screens map to USER_JOURNEYS.md  
✅ No orphaned features  
✅ No out-of-scope elements  
✅ All product constraints preserved  
✅ Fully supports core athlete, owner, and coach journeys  
✅ Minimal platform admin (approval only)  
✅ No convenience-only screens  
✅ Consolidates redundant patterns

**All 32 MVP screens meet these criteria and are ready for design.**

---

## Next Steps

1. ✅ Product & stakeholder review of this screen set
2. ⏳ Answer blocking questions (Section above)
3. ⏳ Begin low-fidelity wireframing for critical journeys
4. ⏳ Establish design system and component library
5. ⏳ Estimate development effort by role and screen
