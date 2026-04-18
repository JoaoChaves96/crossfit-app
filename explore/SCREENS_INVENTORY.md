# Screen & Navigation Map — MVP

**Agent Role:** Senior UX Architect  
**Generated from:** PRODUCT.md, USER_JOURNEYS.md  
**Scope:** MVP-only screens, derived exclusively from documented user journeys

---

## Overview

This document defines all screens required for MVP, grouped by actor role. Each screen lists its purpose, primary actions, and navigation path. Access rules are explicit per role.

**Roles:**

- **Athlete** (Primary: Mobile, Secondary: Web)
- **Gym Owner** (Primary: Web, Secondary: Mobile)
- **Coach** (Primary: Web, Secondary: Mobile)
- **Platform Admin** (Minimal MVP)

---

## 1. Shared Screens (All Roles)

### 1.1 Authentication

#### Sign Up / Register

- **Purpose:** Create account (email or social login)
- **Actors:** All unauthenticated users
- **Primary Actions:**
  - Enter email / choose social provider
  - Set password (if email signup)
  - Accept terms
- **Post-Signup:** Routes to role-specific onboarding
- **Navigation Entry:** Public landing page, app startup

#### Login

- **Purpose:** Authenticate existing user
- **Actors:** All roles
- **Primary Actions:**
  - Email + password OR social login
  - "Remember me" option
  - Password reset flow
- **Navigation Entry:** App startup (when not authenticated)

#### Password Reset

- **Purpose:** Recover account access
- **Actors:** All roles
- **Primary Actions:**
  - Enter email
  - Verify via email link
  - Set new password
- **Navigation Entry:** Login screen "Forgot password?" link

### 1.2 User Profile & Settings

#### Profile (View & Edit)

- **Purpose:** Manage personal account details
- **Actors:** All roles
- **Role-Specific Content:**
  - **Athlete:** Unit preference (kg/lb), notification preferences
  - **Gym Owner:** Email, phone, name
  - **Coach:** Email, phone, name, bio/specialties
- **Primary Actions:**
  - Edit personal information
  - Update notification preferences
  - Sign out
- **Navigation Entry:** Settings/Menu (bottom nav or hamburger)

#### Notification Preferences

- **Purpose:** Control notification channels and types
- **Actors:** All roles
- **Primary Actions:**
  - Toggle notification types (booking, cancellation, results, announcements)
  - Choose delivery method (push, email)
- **Navigation Entry:** Profile > Settings

---

## 2. Athlete Screens

### 2.1 Gym Selection & Onboarding

#### Join Gym

- **Purpose:** Add athlete to a gym (precondition for booking)
- **Actors:** Athlete
- **Primary Actions:**
  - Enter invite code
  - Scan QR code (if mobile)
  - View gym details before joining
  - Confirm join
- **Outcome:** Athlete belongs to gym, no membership assigned yet
- **Navigation Entry:** Main nav > "Join Gym", onboarding flow post-signup

#### Gym Switcher

- **Purpose:** Switch between gyms (if athlete belongs to multiple)
- **Actors:** Athlete (multi-gym only)
- **Display:**
  - List of gyms athlete belongs to
  - Indicator of active gym
- **Primary Actions:**
  - Select gym
- **Post-Action:** UI context updates to show only selected gym's classes
- **Navigation Entry:** Header/nav bar (visible only if athlete belongs to 2+ gyms)

---

### 2.2 Class Discovery & Booking

#### Class Schedule (Week/Day View)

- **Purpose:** Browse upcoming classes filtered by athlete's membership
- **Actors:** Athlete
- **Visibility Rules:**
  - Only classes whose type is allowed by active membership shown
  - Published and Booking Closed states visible and interactive
  - In Progress classes visible but not bookable
  - Past classes hidden (unless accessing history)
- **Primary Actions:**
  - Tap class to view details
  - Filter by class type
  - Toggle week/day view
  - Refresh
- **Displayed Info:**
  - Class type, time, coach, available spots or waitlist status
- **Navigation Entry:** Main nav (primary, usually tab 1), gym switcher > classes

#### Class Details

- **Purpose:** View full class information before booking
- **Actors:** Athlete
- **Displayed Info:**
  - Class type, date, time, duration
  - Coach name
  - Space
  - Capacity and remaining spots
  - Waitlist status (if full)
  - Programming (if available)
- **Primary Actions:**
  - Book Class
  - Cancel Booking (if already booked)
  - Join Waitlist (if full and waitlist enabled)
  - Remove from Waitlist
  - View past results for this class type (if applicable)
- **Conditional Display:**
  - "Book" button only if state is Published
  - "Cancel" button only if state is Published and athlete is booked
  - Programming section only if content exists
- **Navigation Entry:** Tap class from schedule

---

### 2.3 Booking Management

#### Booked Classes (My Classes)

- **Purpose:** View athlete's upcoming and past booked classes
- **Actors:** Athlete
- **Filters:**
  - Upcoming (Published, Booking Closed, In Progress)
  - Past (Completed, Archived)
- **Displayed Info:**
  - Class type, time, coach, space
  - Booking status (booked, waitlisted)
  - Programming if available
- **Primary Actions:**
  - Tap to view details
  - Cancel (if state is Published)
  - Remove from waitlist (if waitlisted)
- **Navigation Entry:** Main nav tab (e.g., "My Classes")

#### Booking Confirmation

- **Purpose:** Confirm successful booking or waitlist addition
- **Actors:** Athlete
- **Display:**
  - Confirmation message ("You are booked" vs "You are #3 on waitlist")
  - Class details
  - Option to view calendar
- **Primary Actions:**
  - Dismiss
  - Return to schedule
- **Navigation Entry:** After successful booking action on Class Details

---

### 2.4 Class Attendance & Results

#### In-Progress Class (View Only)

- **Purpose:** Show booked class is happening now
- **Actors:** Athlete
- **Display:**
  - Class details (read-only)
  - Programming (locked, read-only)
  - Status: "Class in progress"
- **Primary Actions:**
  - View programming
  - Return to schedule
- **Disabled Interactions:**
  - No booking, cancellation, or result submission
- **Navigation Entry:** Auto-navigate when class state transitions to In Progress, or from My Classes

#### Log Results

- **Purpose:** Submit workout results for a completed, loggable class
- **Actors:** Athlete (only if attended)
- **Preconditions:**
  - Class state is Completed
  - Class type is marked loggable by coach
  - Athlete was marked present at attendance
- **Display:**
  - Class type and programming
  - Result metric fields based on class type (time, reps, weight, rounds, etc.)
- **Primary Actions:**
  - Submit result
  - Save draft (optional)
  - Skip logging
- **Validation:**
  - Metric fields required if class is loggable
- **Post-Submit:** Show confirmation, return to Training History
- **Navigation Entry:** Booked Classes > select completed class, or notification

#### Training History

- **Purpose:** View personal training record and progress
- **Actors:** Athlete
- **Filters:**
  - All time, 30 days, 90 days
  - By class type
  - Logged results vs. all attended
- **Displayed Info:**
  - Class type, date, coach
  - Logged result (if submitted)
  - Personal record indicator (if applicable)
- **Primary Actions:**
  - Tap class to view full details
  - View personal records by metric
- **Navigation Entry:** Main nav tab, Profile menu

#### Personal Records

- **Purpose:** View best results by class type and metric
- **Actors:** Athlete
- **Displayed Info:**
  - Best result per metric per class type
  - Date achieved
  - Trend indicator
- **Primary Actions:**
  - Tap to view full class result
- **Navigation Entry:** Training History > "Personal Records" tab

---

### 2.5 Membership & Payments

#### Active Membership Status

- **Purpose:** Display current membership plan and access rights
- **Actors:** Athlete
- **Displayed Info:**
  - Plan name and pricing
  - Renewal date or expiration date
  - Class types included
  - Payment method on file
- **Primary Actions:**
  - Upgrade or change plan
  - Manage payment method
  - View invoices
- **Navigation Entry:** Profile > Membership, or dedicated nav tab

#### Payment / Membership Plans

- **Purpose:** Browse and purchase membership plans
- **Actors:** Athlete (unsubscribed or upgrading)
- **Displayed Info:**
  - Plan name, price, billing period
  - Class types included
  - Features (e.g., unlimited vs. class pack)
- **Primary Actions:**
  - Select and purchase plan
  - Enter payment details
- **Navigation Entry:** Membership Status > "Upgrade", onboarding flow after gym join

#### Payment History & Invoices

- **Purpose:** View past payments and download receipts
- **Actors:** Athlete
- **Displayed Info:**
  - Invoice number, date, amount, status
  - Plan period covered
- **Primary Actions:**
  - Download invoice PDF
  - View details
  - Retry failed payment
- **Navigation Entry:** Membership Status > "Invoices"

---

## 3. Gym Owner Screens

### 3.1 Gym Setup & Configuration

#### Gym Registration

- **Purpose:** Create and configure new gym
- **Actors:** Gym Owner (new)
- **Steps (Wizard):**
  1. Gym name, location, contact info
  2. Logo and description
  3. Opening hours
  4. Spaces and capacities
  5. Confirm and submit
- **Post-Registration:** Awaits platform admin approval → moved to Published state
- **Navigation Entry:** Signup flow, "Create Gym" option

#### Gym Profile (Edit)

- **Purpose:** Update gym details
- **Actors:** Gym Owner (owner role only)
- **Editable Fields:**
  - Name, description, location
  - Logo, amenities
  - Contact info
  - Opening hours
- **Primary Actions:**
  - Save changes
  - Add/remove logo
- **Navigation Entry:** Settings > Gym Profile

#### Spaces & Capacities

- **Purpose:** Manage training spaces and their default capacity
- **Actors:** Gym Owner
- **Display:**
  - List of spaces (rooms, areas, time slots)
  - Default capacity per space
- **Primary Actions:**
  - Create space
  - Edit space name and capacity
  - Delete space (if no active classes)
- **Navigation Entry:** Settings > Spaces

#### Booking Rules & Configuration

- **Purpose:** Set booking-related policies
- **Actors:** Gym Owner
- **Configurable Items:**
  - Booking freeze time (minutes before class start)
  - Waitlist enabled/disabled
  - Cancellation policies
- **Primary Actions:**
  - Save settings
- **Navigation Entry:** Settings > Booking Rules

#### Class Types

- **Purpose:** Define available class types and their properties
- **Actors:** Gym Owner
- **Display per Type:**
  - Type name
  - Whether programming is required/optional
  - Whether performance logging is enabled
  - Result metrics (time, reps, weight, rounds, none)
- **Primary Actions:**
  - Create class type
  - Edit properties
  - Archive or disable type
- **Constraints:**
  - Cannot delete type if active classes exist
- **Navigation Entry:** Settings > Class Types

---

### 3.2 Membership Plans

#### Create / Edit Membership Plan

- **Purpose:** Define subscription plans and class access
- **Actors:** Gym Owner
- **Fields:**
  - Plan name
  - Pricing (monthly, yearly, pay-per-class, etc.)
  - Class types included
  - Capacity (if limited to N classes/month)
- **Primary Actions:**
  - Save plan
  - Archive plan (if not active)
- **Validation:**
  - At least one class type must be selected
- **Navigation Entry:** Settings > Membership Plans > Create, or Edit existing plan

#### Membership Plans List

- **Purpose:** View and manage all plans
- **Actors:** Gym Owner
- **Display:**
  - List of plans with status (active, archived)
  - Current subscribers per plan
- **Primary Actions:**
  - Edit plan
  - View subscribers
  - Archive plan
  - Duplicate plan (to create variant)
- **Navigation Entry:** Settings > Membership Plans

---

### 3.3 Class & Schedule Management

#### Class Schedule (Admin View)

- **Purpose:** Manage gym's class schedule across all coaches
- **Actors:** Gym Owner
- **Filters:**
  - By coach
  - By class type
  - By space
  - Week/month view
- **Display:**
  - Class type, time, coach, space, capacity
  - Booking count and waitlist
  - Class state (Published, Booking Closed, In Progress, Completed)
- **Primary Actions:**
  - Create class
  - Edit class
  - View booking details
  - View attendance
  - Manually adjust class state
- **Navigation Entry:** Main nav tab (Schedule), Settings > Classes

#### Create / Edit Class

- **Purpose:** Schedule a new class or modify existing
- **Actors:** Gym Owner
- **Fields:**
  - Date, start time, duration
  - Class type (dropdown)
  - Coach (dropdown, if not self-assigned)
  - Space (dropdown)
  - Capacity
  - Recurrence (if repeating)
- **Allowed States:**
  - Create → Published (default)
  - Edit if state is Published or Booking Closed
- **Validation:**
  - No time conflicts with space
  - Coach assigned
  - Class type exists
- **Primary Actions:**
  - Save
  - Cancel
  - Publish (if draft)
  - Delete (if Published and no bookings)
- **Navigation Entry:** Schedule > Create Class, or Edit from class row

#### Class Details (Admin View)

- **Purpose:** View comprehensive class info and manage bookings
- **Actors:** Gym Owner
- **Display:**
  - All class metadata (type, time, coach, space, capacity)
  - Booking count and remaining spots
  - Waitlist (if any)
  - Programming (if attached)
  - Attendance list (if class is In Progress or Completed)
  - Current state (Published, Booking Closed, In Progress, Completed)
- **Primary Actions:**
  - Edit class
  - Close bookings manually
  - View/adjust attendance
  - Change class state
  - Add/remove athletes manually
  - Edit programming (if state allows)
- **Navigation Entry:** Class Schedule > tap class row

#### Booking Monitor

- **Purpose:** Oversee bookings across upcoming classes
- **Actors:** Gym Owner
- **Display:**
  - List or calendar of next 7–14 days
  - For each class: booking count, capacity, waitlist
  - Classes approaching freeze time
- **Primary Actions:**
  - Tap class to view full details
  - Manually adjust capacity
  - Close bookings early
- **Navigation Entry:** Dashboard or main nav tab

---

### 3.4 Staff Management

#### Invite Coach

- **Purpose:** Add a coach to the gym
- **Actors:** Gym Owner
- **Fields:**
  - Coach email
  - Name (optional, pre-filled if existing user)
- **Primary Actions:**
  - Send invite
- **Post-Invite:** Coach receives email, clicks link to accept and set/confirm role
- **Navigation Entry:** Settings > Coaches > "Invite Coach"

#### Coaches List

- **Purpose:** View and manage all coaches
- **Actors:** Gym Owner
- **Display:**
  - Coach name, email, status (active, pending invite, disabled)
  - Classes assigned
  - Last active date
- **Primary Actions:**
  - View details
  - Disable/enable access
  - Remove coach
  - Reassign classes
- **Navigation Entry:** Settings > Coaches

#### Coach Details

- **Purpose:** View coach profile and manage access
- **Actors:** Gym Owner
- **Display:**
  - Name, email, phone, bio
  - Assigned classes (current and upcoming)
  - Active status
- **Primary Actions:**
  - Edit bio/contact
  - Disable/enable access
  - Reassign classes
  - Remove from gym
- **Navigation Entry:** Coaches List > tap coach row

---

### 3.5 Member Management

#### Members List

- **Purpose:** View all gym members
- **Actors:** Gym Owner
- **Filters:**
  - Active / inactive
  - By membership plan
  - Search by name
- **Display:**
  - Member name, email, phone
  - Membership plan and status
  - Join date
  - Last class attended
- **Primary Actions:**
  - View member details
  - Manually add member
  - Suspend membership
  - View member's bookings and history
- **Navigation Entry:** Settings > Members, main nav tab

#### Member Profile (Admin View)

- **Purpose:** View and manage individual member
- **Actors:** Gym Owner
- **Display:**
  - Contact info
  - Current membership plan
  - Membership status (active, expired, suspended)
  - Class bookings (current and past)
  - Attendance record
  - Payment history
- **Primary Actions:**
  - Edit contact info
  - Change membership plan
  - Suspend / resume membership
  - Manually remove member
  - Send message (announcements, notifications)
- **Navigation Entry:** Members List > tap member row

#### Manually Add Member

- **Purpose:** Invite or enroll member without self-signup
- **Actors:** Gym Owner
- **Fields:**
  - Email or phone
  - Name
  - Membership plan (optional, assign after join)
- **Primary Actions:**
  - Send invite link
  - Assign membership immediately (if invited email-based)
- **Navigation Entry:** Members List > "Add Member"

---

### 3.6 Attendance & Results

#### Class Attendance (Mark)

- **Purpose:** Record who attended a class session
- **Actors:** Gym Owner (backup if coach unavailable)
- **Preconditions:**
  - Class state is In Progress
- **Display:**
  - List of booked athletes
  - Checkbox or toggle per athlete
  - Notes field for no-shows or exceptions
- **Primary Actions:**
  - Mark attendance
  - Add notes (e.g., "dropped out after warmup")
  - Save
- **Navigation Entry:** Class Details > "Mark Attendance" (visible when In Progress)

#### Class Outcome & Results

- **Purpose:** Review completed class and submitted results
- **Actors:** Gym Owner
- **Display (Post-Completed):**
  - Attendance list (finalized)
  - Submitted results (if loggable class)
  - Attendance percentage
  - Notes from attendance marking
- **Primary Actions:**
  - View individual athlete results
  - Export attendance/results
- **Navigation Entry:** Class Details (after class is Completed)

---

### 3.7 Announcements & Communication

#### Post Announcement

- **Purpose:** Broadcast message to all gym members
- **Actors:** Gym Owner
- **Fields:**
  - Title
  - Message body
  - Target audience (all members, by plan, by class type, etc.)
  - Scheduling (now or later)
- **Primary Actions:**
  - Draft and preview
  - Schedule or send immediately
- **Navigation Entry:** Settings > Announcements > Create, or main nav

#### Announcements List

- **Purpose:** Manage past and scheduled announcements
- **Actors:** Gym Owner
- **Display:**
  - Announcement title, date sent, audience size
  - Status (sent, scheduled, draft)
- **Primary Actions:**
  - View details
  - Edit (if draft or scheduled)
  - Resend
  - Archive
- **Navigation Entry:** Settings > Announcements

---

## 4. Coach Screens

### 4.1 Class Management

#### My Assigned Classes

- **Purpose:** View classes coach is assigned to
- **Actors:** Coach
- **Filters:**
  - Upcoming, past
  - By gym (if multi-gym)
- **Display:**
  - Class type, date, time, space
  - Capacity and booking count
  - Programming status (attached, pending)
  - Class state
- **Primary Actions:**
  - Tap class to edit programming or view attendance
- **Navigation Entry:** Main nav tab (Schedule or Classes)

#### Class Details (Coach View)

- **Purpose:** Edit programming and manage class
- **Actors:** Coach
- **Display:**
  - Class metadata (type, time, space, capacity)
  - Booking and attendance counts
  - Waitlist (if any)
  - Current programming (if attached)
  - Class state
- **Primary Actions:**
  - Add/edit programming
  - Mark class as loggable or informational
  - View attendance list (if In Progress or Completed)
  - Change class state (with gym owner approval)
- **Allowed States for Edit:**
  - Published: Full edit access to programming
  - Booking Closed: Full edit access to programming
  - In Progress: Locked from programming edits
  - Completed: Read-only
- **Navigation Entry:** My Assigned Classes > tap class row

---

### 4.2 Programming

#### Add / Edit Programming

- **Purpose:** Create or update class workout content
- **Actors:** Coach
- **Fields:**
  - Workout description / WOD
  - Strength or skill work
  - Scaling or modifications
  - Interval / station details
  - Notes and instructions
- **Preconditions:**
  - Class state is Published or Booking Closed
- **Primary Actions:**
  - Save programming
  - Publish (make visible to athletes)
  - Mark loggable (if applicable)
  - Save as draft
- **Loggable Indicator:**
  - Toggle: "Athletes can log results for this class"
  - Auto-locks after class moves to In Progress
- **Navigation Entry:** Class Details > "Add Programming" or "Edit Programming"

---

### 4.3 Attendance & Results

#### Mark Attendance (Coach View)

- **Purpose:** Record attendance during or after class
- **Actors:** Coach
- **Preconditions:**
  - Class state is In Progress
- **Display:**
  - List of booked athletes (pre-populated)
  - Checkbox or toggle per athlete
  - Option to add notes or mark "no-show"
  - Timer or class duration display
- **Primary Actions:**
  - Check/uncheck attendance
  - Add notes per athlete
  - Submit
- **Navigation Entry:** Class Details > "Mark Attendance" (when class is In Progress)

#### View Submitted Results

- **Purpose:** Review athlete-submitted workout results
- **Actors:** Coach
- **Preconditions:**
  - Class state is Completed
  - Class is marked loggable
- **Display:**
  - Athlete name and submitted result
  - Metric breakdown (time, reps, weight, etc.)
  - Comparison to athlete's past results (if available)
- **Primary Actions:**
  - View individual athlete's training history
  - Export results
- **Immutable:** Results cannot be edited by coach after submission
- **Navigation Entry:** Class Details (when Completed)

---

## 5. Platform Admin Screens (Minimal MVP)

### 5.1 Gym Approval & Oversight

#### Pending Gym Registrations

- **Purpose:** Review and approve new gym registrations
- **Actors:** Platform Admin
- **Display:**
  - Gym name, owner name, location
  - Registration date
  - Status (pending, approved, suspended)
  - Basic gym info preview
- **Primary Actions:**
  - Approve gym
  - Request additional info
  - Suspend gym
- **Navigation Entry:** Admin dashboard

#### Gym Details (Admin View)

- **Purpose:** View gym profile and manage platform-level access
- **Actors:** Platform Admin
- **Display:**
  - All gym configuration
  - Owner contact info
  - Member count
  - Class count (all-time)
  - Approval status
- **Primary Actions:**
  - Approve/suspend gym
  - View full audit log
  - Contact owner
- **Navigation Entry:** Pending Gyms or Gym List > tap gym row

#### Platform Activity / Health

- **Purpose:** Monitor platform metrics (minimal for MVP)
- **Actors:** Platform Admin
- **Display:**
  - Total gyms, members, coaches
  - Classes created / completed (time period)
  - Top 10 gyms by activity
  - System health indicators (if applicable)
- **Primary Actions:**
  - Drill into gym or member detail
  - Export report
- **Navigation Entry:** Admin Dashboard

---

## 6. Navigation Structure by Role

### 6.1 Athlete Navigation (Mobile-First)

**Primary Navigation (Bottom Tab Bar or Side Menu):**

1. **Schedule** → Class Schedule, Class Details
2. **My Classes** → Booked Classes, Book/Cancel, Waitlist
3. **Training** → Training History, Personal Records, Log Results
4. **Membership** → Active Plan, Payment History, Upgrade
5. **Profile** → Profile Settings, Gym Switcher (if multi-gym), Notifications

**Secondary Navigation (Modal/Drawer):**

- Sign Up / Login (pre-auth)
- Join Gym (post-signup, pre-gym-join)
- Notifications
- Settings

---

### 6.2 Gym Owner Navigation (Web-First)

**Primary Navigation (Top/Side Bar):**

1. **Dashboard** → Booking Monitor, Upcoming Classes, Quick Stats
2. **Schedule** → Class Schedule (admin view), Create/Edit Class
3. **Members** → Members List, Member Details, Add Member Manually
4. **Coaches** → Coaches List, Invite Coach, Coach Details
5. **Settings**
   - Gym Profile
   - Spaces & Capacities
   - Class Types
   - Membership Plans
   - Booking Rules
   - Announcements

**Secondary Navigation (Modal/Drawer):**

- Profile & Account
- Notifications
- Sign Out

---

### 6.3 Coach Navigation (Web-First)

**Primary Navigation (Top/Side Bar):**

1. **My Classes** → Assigned Classes, Class Details, Programming
2. **Attendance & Results** → Mark Attendance, View Results
3. **Profile** → Coach Profile, Notifications, Settings

**Secondary Navigation:**

- Sign Out
- Gym Switcher (if multi-gym assignment)

---

### 6.4 Platform Admin Navigation

**Primary Navigation (Side Bar):**

1. **Pending Gyms** → Review registrations
2. **Gyms** → Gym list, details, approval status
3. **Platform Activity** → Metrics and health
4. **Support** → (Out of scope for MVP)

---

## 7. State-Driven Screen Visibility

### Class State Impact on Screen Availability

| Class State        | Athlete Can Book?            | Athlete Can See Details? | Coach Can Edit Program? | Owner Can Mark Attendance? |
| ------------------ | ---------------------------- | ------------------------ | ----------------------- | -------------------------- |
| **Published**      | ✅ Yes                       | ✅ Yes                   | ✅ Yes                  | ❌ No                      |
| **Booking Closed** | ❌ No                        | ✅ Yes                   | ✅ Yes                  | ❌ No                      |
| **In Progress**    | ❌ No (view only)            | ✅ Yes (read-only)       | ❌ No                   | ✅ Yes                     |
| **Completed**      | ✅ Log results (if attended) | ✅ Yes                   | ❌ No                   | ✅ Yes (view only)         |
| **Archived**       | ✅ View history              | ✅ Yes (history)         | ❌ No                   | ✅ Yes (history)           |

---

## 8. Open Questions & Ambiguities

### Clarification Needed

1. **Athlete Multi-Gym Context Persistence**
   - When athlete switches gyms, should the app remember the last selected gym on next login, or always default to the most recently joined gym?
   - Should notifications include gym context, or is the athlete expected to manage?

2. **Coach Self-Assignment to Gym**
   - When a coach is invited, do they auto-belong to that gym, or must they also join it separately?
   - Can a coach belong to multiple gyms, and if so, how are class assignments handled?

3. **Waitlist Interaction Details**
   - When a spot opens and a waitlisted athlete is promoted, is it automatic or manual?
   - Can an athlete move up the waitlist by cancelling a different class?
   - Is there a time window for accepting a promoted spot, or automatic acceptance?

4. **Programming Attachment Timing**
   - Must programming be attached before booking closes, or can it be added during `Booking Closed` state?
   - If missing at class start, does the class still run (informational), or is it an error state?

5. **Attendance Finalization**
   - Is attendance locked after class completion, or can gym owner adjust it later?
   - Can attendance be marked for a class that has not yet transitioned to `In Progress`?

6. **Result Logging Window**
   - Can athletes log results indefinitely after completion, or is there a time limit?
   - Can results be edited after initial submission?

7. **Membership Plan Enforcement**
   - If an athlete's membership expires mid-week, can they still attend booked classes?
   - Should expired bookings be cancelled automatically, or remain but marked as ineligible?

8. **Coach Notification Flow**
   - When an athlete cancels a booked class, is the coach notified?
   - When capacity changes affect a class, who is notified (coach, athletes, both)?

9. **Gym Owner Role Separation**
   - Can a gym owner also be a coach, or are these roles mutually exclusive?
   - Can a gym owner delete or archive their own gym, or only platform admin?

10. **Mobile vs. Web Feature Parity**
    - Are all screens available on mobile (responsive), or are some desktop-only?
    - Is the mobile app a separate codebase, or responsive web?

11. **Class Recurrence**
    - Does the MVP support recurring classes (e.g., "Every Monday at 6 AM"), or only single-session creation?
    - If yes, how are individual instances managed (edit one vs. series)?

12. **Billing & Payment**
    - Which payment gateway? (Stripe, PayPal, etc.)
    - Does the app display payment errors, or is this handled out-of-band?
    - Can gym owner refund a payment, or is this manual/external?

13. **Announcement Targeting**
    - Can announcements be targeted by plan, class type, or only to all members?
    - Are announcements also visible in mobile app, or email-only?

---

## 9. Derived Assumptions (From Product & Journeys)

The following assumptions are made based on the product spec and user journeys, but may warrant explicit confirmation:

1. **Athletes are mobile-first:** Mobile app is the primary athlete touchpoint.
2. **Gym owners manage via web:** Web app is the primary admin touchpoint.
3. **Coaches use web for programming, may use mobile for attendance:** Responsive design assumed.
4. **Role-based access is strict:** Coaches cannot access billing, athletes cannot access gym config, etc.
5. **Membership controls visibility:** If an athlete's membership doesn't include a class type, that class is not displayed.
6. **Class state transitions are linear and irreversible:** Once `In Progress`, a class cannot revert to `Published`.
7. **Results are athlete-submitted:** Coaches view but do not edit athlete results.
8. **Notifications are system-triggered:** Based on bookings, cancellations, state changes, and user preferences.
9. **No real-time multiplayer features in MVP:** Results, attendance, programming are submitted and synced, not live-edited.

---

## 10. Screens Explicitly Not Included (Out of Scope)

Based on PRODUCT.md Section 6 (Explicitly Out of Scope):

- ❌ Gym discovery or marketplace (national)
- ❌ Public reviews and ratings
- ❌ Social feeds, likes, comments, media uploads
- ❌ Challenges, badges, gamification
- ❌ Nutrition tracking
- ❌ Wearables integration
- ❌ Centralized payment distribution
- ❌ Advanced analytics dashboards
- ❌ Offline-first functionality

These features are intentionally excluded from the MVP screen map.

---

## Summary

This screen map defines **50+ screens** organized by role and user journey. All screens are derived exclusively from PRODUCT.md and USER_JOURNEYS.md, with access rules enforced per role and class state. Navigation is role-aware and supports multi-gym contexts for athletes and coaches.

**Next Steps:**

1. Address open questions (Section 8) with product stakeholders
2. Validate screen groupings and navigation hierarchy
3. Begin low-fidelity wireframing for critical user journeys
4. Establish design system for consistent UI/UX across roles
