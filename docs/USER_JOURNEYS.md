# User Journeys (MVP)

This document describes the primary user journeys for the Fitness Box
Management Platform MVP.

These journeys represent the core flows that must be supported cleanly and
reliably before expanding into additional features.

---

## 1. Athlete Journey

**Goal:** Discover eligible classes, book one, attend it, and log results

### Preconditions

- Athlete has an account
- Athlete belongs to at least one gym
- Athlete has an active membership plan
- The membership plan grants access to at least one class type

---

### Step 1 — View Schedule

1. Athlete opens the app (mobile or web)
2. Athlete selects a gym (if belonging to multiple gyms)
3. System displays the upcoming class schedule

**System Rules**

- Only classes whose class type is allowed by the athlete’s active membership
  are shown
- Classes in `Published` or `Booking Closed` states are visible
- Classes in `In Progress` or future states may not be interactable
- Past classes are hidden unless explicitly viewing class history

---

### Step 2 — View Class Details

1. Athlete selects a class from the schedule

Visible information includes:

- Class type
- Date and time
- Coach
- Remaining spots or waitlist status
- Programming (if already attached)

---

### Step 3 — Book Class

1. Athlete taps “Book”

**System Validation**

- Athlete has access to the class type
- Class is in `Published` state
- Capacity is available or waitlist is enabled

**Outcome**

- Athlete is booked into the class or added to the waitlist
- Confirmation notification is sent

---

### Step 4 — Booking Closure

- At the booking freeze time (5 minutes before start; see DECISIONS.md →
  Booking Close Lead Time):
  - The class transitions to `Booking Closed`
  - Athlete can no longer book or cancel

---

### Step 5 — Attend Class

1. Class transitions to `In Progress`
2. Coach marks attendance during the session

**Rules**

- Athlete interaction with the class through the app is disabled
- If athlete is not marked present, they cannot log results later

---

### Step 6 — Log Results

1. Class transitions to `Completed`
2. Athlete opens the completed class

If the class is loggable:

- Athlete submits result data (e.g. time, reps, weight)
- Results are saved to training history
- Personal records are evaluated where applicable

---

### Step 7 — View Training History

- Athlete can view:
  - Past attended classes
  - Logged results
  - Personal records for supported metrics

---

## 2. Gym Owner Journey

**Goal:** Configure the gym, publish classes, and manage operational changes

### Preconditions

- Gym Owner has an approved gym
- Gym Owner has full administrative access

---

### Step 1 — Configure Gym

1. Owner accesses the admin interface (web or mobile)
2. Configures:
   - Gym profile details
   - Training spaces and capacities
   - Opening hours
   - Booking freeze rules
   - Available class types

---

### Step 2 — Configure Membership Plans

1. Owner creates membership plans
2. Each plan defines:
   - Pricing
   - Which class types are accessible

**System Impact**

- Membership plans directly control class visibility for athletes

---

### Step 3 — Create Class Schedule

1. Owner creates classes on the calendar
2. For each class:
   - Select class type
   - Assign coach
   - Assign space
   - Set capacity

**Outcome**

- Class enters `Published` state immediately
- Class becomes visible only to eligible athletes

---

### Step 4 — Monitor Bookings

- Owner views:
  - Booking counts
  - Waitlists
  - Upcoming classes

---

### Step 5 — Adjust Class After Booking Closed

1. Class transitions to `Booking Closed`
2. Owner needs to apply changes such as:
   - Capacity increase or decrease
   - Space change
   - Coach reassignment

**Rules**

- Structural changes are allowed
- Changes may trigger notifications to booked athletes
- Capacity reductions that conflict with existing bookings require
  manual resolution

---

### Step 6 — Review Class Outcome

1. Class transitions to `Completed`
2. Owner reviews:
   - Attendance
   - Participation
3. After `Archived`, class contributes to reports and analytics

---

## 3. Coach Journey

**Goal:** Prepare class programming, run the session, and mark attendance

### Preconditions

- Coach is invited by a gym owner
- Coach is assigned to one or more classes

---

### Step 1 — View Assigned Classes

1. Coach accesses the admin interface
2. Coach sees only classes assigned to them

---

### Step 2 — Add Programming

1. Coach selects an upcoming class in `Published` or `Booking Closed`
2. Adds programming content:
   - Workout details
   - Instructions or notes
3. Marks whether the class is:
   - Loggable
   - Informational only

---

### Step 3 — Prepare for Class

- Coach reviews:
  - Attendance list
  - Waitlist
- Coach may:
  - Adjust capacity
  - Change space (if needed)

---

### Step 4 — Run Class

1. Class transitions to `In Progress`
2. Coach marks attendance
3. Programming becomes locked

---

### Step 5 — Close Class

1. Class transitions to `Completed`
2. Coach can view submitted results
3. Coach cannot edit attendance or results afterward

---

## 4. Cross-Journey Invariants

The following rules must always hold:

- Athletes only see classes they are entitled to access
- Bookings are governed solely by class state
- Coaches never manage billing or memberships
- Structural edits stop after class completion
- Completed and archived classes are immutable
