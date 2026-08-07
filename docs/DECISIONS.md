# Product Decisions (MVP)

This document resolves ambiguities and blocking questions arising from:

- SCREENS.md
- MVP_SCREENS.md
- USER_JOURNEYS.md

All decisions in this file are authoritative for MVP.
If a conflict exists, this document overrides assumptions or open questions
in earlier artifacts.

## Class Recurrence

MVP supports single-session classes only.
There is no concept of recurring series or bulk edits.

## Waitlist Promotion

Waitlist promotion is automatic and immediate.
No confirmation or acceptance window is required.

## Result Logging Window

Athletes can create and edit results for completed classes
until the class is archived.

## Programming Authorship

Gym owners may create and edit class programming, not only the assigned coach.

This resolves a conflict between two Tier 1 documents:

- `MVP_SCREENS.md` lists "Edit programming" among the Class Management actions,
  which is an owner screen.
- `DATA_MODEL.md` assigns programming to the Coach role ("Coaches decide whether
  to attach programming").

`MVP_SCREENS.md` is correct for MVP: the owner is accountable for the schedule and
must be able to fill a gap when no coach has programmed a class. `DATA_MODEL.md`
describes the expected division of labour, not an authorization boundary.

Rules:

- An owner may edit programming for any class in their own gym.
- A coach may edit programming only for a class they are assigned to (unchanged).
- The existing lifecycle lock still applies to both: programming is editable only
  while the class is `published` or `booking_closed`.

The owner's programming surface is the Class Management screen, per
`MVP_SCREENS.md`. Create/Edit Class remains scoped to class metadata and does not
carry programming fields.

## Programming Content Shape

Programming is a single `content` text field. There is no separate structured
"notes" field in MVP; WOD, instructions and notes all live in `content`.
