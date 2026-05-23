# Notifications Epic — Design Spec

## Overview

Add in-app notifications and push notifications to the CrossFit platform. Athletes receive timely updates about their bookings, waitlist status, class changes, and upcoming classes.

## Channels

- **In-app feed:** Bell icon with unread badge → flat notification list
- **Push notifications:** Expo Push Notifications API (iOS, Android, web)

## Notification Events

| Event | Trigger | Recipient | Content |
|---|---|---|---|
| Booking confirmed | Athlete books a class | Booking athlete | "Booking Confirmed — {ClassType} at {time} on {date}" |
| Waitlist promoted | Spot opens, athlete promoted | Promoted athlete | "You're In! — {ClassType} at {time} on {date}" |
| Class cancelled | Owner/coach cancels class | All booked athletes | "Class Cancelled — {ClassType} at {time} on {date}" |
| Class changed | Material edit (time, date, space) | All booked athletes | "Class Updated — {ClassType} moved to {new time/date/space}" |
| Class reminder | Cron, N min before start | All booked athletes (with pref on) | "Starting Soon — {ClassType} in {N} minutes" |

## Data Model

### `notifications` table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User (recipient) |
| gymId | UUID | FK → Gym (tenant scoping) |
| type | enum | `booking_confirmed`, `waitlist_promoted`, `class_cancelled`, `class_changed`, `class_reminder` |
| title | string | Short display text |
| body | string | Detail text |
| data | jsonb | Navigation payload (e.g., `{ classId: "..." }`) |
| read | boolean | Default false |
| createdAt | timestamp | |

### `push_tokens` table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| token | string | Expo push token |
| platform | enum | `ios`, `android`, `web` |
| createdAt | timestamp | |

### Notification preferences (on User entity)

Stored as jsonb field `notification_preferences`:

```json
{
  "booking_confirmations": true,
  "waitlist_updates": true,
  "class_changes": true,
  "class_reminders": true
}
```

All default to `true`. Backend checks preferences before creating notification records.

## Backend Architecture

### Event flow

```
Action (book, promote, edit/cancel class)
  → Domain event emitted (NestJS EventEmitter2)
    → NotificationListener catches event
      → Checks recipient preferences
      → Creates notification record in DB
      → Sends push via Expo Push API (fire-and-forget)
```

### Components

| Component | Responsibility |
|---|---|
| `NotificationModule` | Module registration, exports service |
| `NotificationService` | Create notifications, mark read, query feed |
| `NotificationListener` | Subscribes to domain events, decides what to notify |
| `PushService` | Manages push tokens, calls Expo Push API |
| `NotificationScheduler` | Cron job (every minute) for class reminders |
| `NotificationController` | Exposes notification endpoints |

### Domain events emitted by existing handlers

| Event | Source handler |
|---|---|
| `booking.created` | Booking creation handler |
| `waitlist.promoted` | Waitlist promotion logic |
| `class.cancelled` | Class delete / transition to cancelled |
| `class.modified` | Class PATCH handler (only for material changes: startTime, date, spaceId — NOT coach or capacity changes) |

### Reminder scheduler

- Runs every minute (same pattern as lifecycle scheduler)
- Single query: find classes starting within the reminder window that haven't been notified yet
- Bulk-creates notification records + batch-sends push
- Reminder window: gym-level configurable (default 30 min)
- Marks classes as `reminder_sent = true` to prevent duplicates

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/me/notifications?page=1&limit=20` | Paginated notification feed |
| PATCH | `/api/me/notifications/:id/read` | Mark single notification as read |
| PATCH | `/api/me/notifications/read-all` | Mark all notifications as read |
| POST | `/api/me/push-token` | Register Expo push token |
| PATCH | `/api/me` | Update notification preferences (existing endpoint) |

## Frontend

### Bell icon with badge

- Visible in header across all main tabs
- Shows unread count (fetched from `GET /api/me/notifications` or a dedicated count endpoint)
- Tapping opens notifications screen

### Notifications screen

- Flat list: type icon + title + body + relative timestamp
- Unread items: visual accent (bold text or colored left border)
- Tap notification → mark as read + navigate based on `data` payload:
  - `data.classId` → class details screen
  - `data.bookingId` → my bookings
  - Fallback → stay on notifications screen
- "Mark all as read" action in header

### Push token registration

1. App start → `Notifications.getExpoPushTokenAsync()`
2. Send token to `POST /api/me/push-token`
3. Backend upserts (same user + token = no duplicate)

### Push received while app is open

- Show toast/banner at top of screen
- Increment badge count
- Prepend to feed if currently viewing notifications screen

### Notification preferences UI

- Lives in Profile & Settings screen
- Section: "Notifications" with 4 toggles (booking confirmations, waitlist updates, class changes, class reminders)
- Saves via existing `PATCH /api/me`

## Multi-Tenant Scoping

- Notifications are scoped to `gymId` — an athlete only sees notifications for their active gym context
- Push tokens are user-level (not gym-scoped) since the device is shared across gyms
- Preferences are user-level for MVP (no per-gym granularity)

## Out of Scope

- Email notifications
- Coach/owner notifications (only athletes receive notifications in this epic)
- Rich push content (images, action buttons)
- Notification grouping or threading
- Per-gym notification preferences
