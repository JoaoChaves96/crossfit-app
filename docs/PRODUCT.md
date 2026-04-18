# Product: Fitness Box Management Platform (MVP)

## 1. Product Vision

A modern, multi-tenant platform for CrossFit boxes and functional fitness gyms that:

- Simplifies class scheduling, bookings, and payments
- Provides athletes with a seamless way to book classes and track training
- Enables gym owners to manage their business without fragmented tools

The initial focus is on **independent gyms (boxes)** managing their own operations.  
There is no national marketplace or central operator logic in the MVP.

---

## 2. Actors & Roles

### Athlete (Member)

- Belongs to one or multiple gyms
- Books and attends classes
- Views class programming and logs results when applicable
- Manages memberships and payments

### Gym Owner

- Manages the gym as a business entity
- Configures pricing, schedules, spaces, and policies
- Invites and manages coaches and members
- Has full administrative control over the gym

### Coach

- Assigned to one or more gyms by a gym owner
- Leads classes and programs class content
- Views attendance and performance data for their classes
- Does **not** manage billing or gym-level configuration

### Platform Admin (Internal)

- Manages the platform itself
- Approves or suspends gyms
- Handles support and compliance requests

---

## 3. Platform Access Model

- **Athletes**
  - Primary interface: Mobile app
  - Secondary access: Web browser

- **Gym Owners & Coaches**
  - Primary interface: Web application
  - Secondary access: Mobile browser or mobile app

The platform is responsive and role-aware.  
There are no hard separations between “web” and “mobile” products.

---

## 4. Core Domain Concepts

### Class

A scheduled session that athletes can book and attend.

A class has:

- A date and time
- A coach
- A capacity
- A space
- A class type
- Optional programming content

### Class Type

Defines the nature of a class and drives behavior across the platform.

Examples:

- CrossFit
- Gymnastics
- Hyrox
- Strength
- Open Gym

Class types may define:

- Whether programming is required or optional
- Whether performance logging is enabled
- Which result metrics apply (time, reps, weight, rounds, none)

### Programming

Content associated with a specific class session.

Programming may include:

- A WOD (for CrossFit-style classes)
- Strength or skill work
- Interval or station-based formats
- Notes or instructions

Not all classes require programming.

---

## 5. MVP Scope (Must Have)

### 5.1 Athlete Features

#### Account & Gym Membership

- Sign up via email or social login
- Join a gym via invite link or QR code
- Belong to multiple gyms and switch active gym context

#### Class Booking

- View class schedules by day/week
- See class details (type, coach, duration)
- Book and cancel classes
- Join waitlists when classes are full
- Receive notifications for booking and waitlist events

#### Classes & Training

- View programming associated with booked classes (if provided)
- Log results for classes that are loggable
- View personal training history per class
- Track basic personal records when applicable

#### Payments

- View active membership status
- Pay membership fees
- Access invoices and payment history

#### Profile & Preferences

- Basic athlete profile
- Unit selection (kg / lb)
- Notification preferences

---

### 5.2 Gym Owner Features

#### Gym Setup & Configuration

- Register and configure gym profile
- Manage logo, description, and amenities
- Define spaces and class capacities
- Configure opening hours and booking rules

#### Class & Schedule Management

- Define class types
- Create, edit, and publish class schedules
- Assign class type, coach, and space
- Set capacity limits and waitlist rules

#### Staff Management

- Invite coaches
- Assign roles and permissions
- Enable or revoke staff access

#### Member Management

- View current and past members
- Manually add or remove members
- View attendance and membership status

#### Payments & Billing

- Create membership plans
- Track payments and overdue members
- View basic revenue summaries

#### Communication

- Post announcements visible to all gym members

---

### 5.3 Coach Features

#### Class Programming

- View assigned classes
- Add or edit programming for class sessions
- Decide whether a class is loggable or informational only

#### Athlete Visibility

- View attendance for coached classes
- View submitted results for those classes

Coaches cannot manage pricing, memberships, or gym configuration.

---

### 5.4 Platform Admin (Minimal MVP)

- Approve or suspend gym registrations
- View platform-level activity and health
- Handle support and data requests

---

## 6. Explicitly Out of Scope (For Now)

The following are deliberately excluded from the MVP:

- National gym discovery or marketplace
- Public reviews and ratings
- Social feeds, likes, comments, or media uploads
- Challenges, badges, or gamification
- Nutrition tracking
- Wearables integration
- Centralized payment distribution between gyms
- Advanced analytics dashboards
- Offline-first functionality

These features are intentionally deferred.

---

## 7. Key Structural Principles

- Multi-tenant architecture with strict gym data isolation
- Role-based access control (Owner ≠ Coach ≠ Athlete)
- Single backend supporting web and mobile clients
- Mobile-first experience for athletes
- Desktop-friendly experience for gym owners

## Class Lifecycle & States (MVP)

A Class represents a scheduled training session that athletes can book and attend.
Each class progresses through a defined lifecycle with clear rules for visibility,
booking, editing, and logging.

### Visibility Rule (Applies to All States)

A class is visible to an athlete only if:

- The athlete belongs to the gym, and
- The athlete has an active membership or plan that grants access to the class type

Classes that an athlete cannot access are not shown at all.

---

### Class States

#### Published

- Class exists and is visible to eligible athletes
- Booking and waitlist rules apply
- Programming may or may not be attached yet
- Gym owner and assigned coach may:
  - Edit schedule (time, space)
  - Edit capacity
  - Edit programming
  - Change coach assignment

This is the default state when a class is created.

---

#### Booking Closed

- Class remains visible to eligible athletes
- No new bookings or cancellations allowed
- Booking closure is triggered:
  - Automatically, based on a configurable freeze time
    (e.g. 30 min or 5 min before class start), or
  - Manually by the gym owner or coach
- Attendance list is locked

Gym owner and assigned coach may still:

- Edit capacity
- Edit schedule details (time or space)
- Edit programming

Structural changes may trigger notifications to booked athletes.
Capacity reductions that conflict with existing bookings require manual resolution.

---

#### In Progress

- Class is currently happening
- Bookings remain closed
- Programming is locked

Gym owner and assigned coach may:

- Mark attendance
- Apply emergency changes to capacity or space if needed

Athletes do not interact with the class during this state.

---

#### Completed

- Class has finished
- Attendance is finalized
- If the class type is loggable:
  - Athletes who attended may log results
- Coaches and gym owners may view attendance and results

No structural edits are allowed in this state.

---

#### Archived

- Class is read-only and stored for historical purposes
- Used for reporting, analytics, and training history
- No edits or interactions are allowed

---

### Allowed State Transitions

Published → Booking Closed → In Progress → Completed → Archived

---

## Related Documents

- User Journeys: `USER_JOURNEYS.md`
