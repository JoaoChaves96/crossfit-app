# BoxOps

**Class booking and gym management for functional fitness boxes.**

BoxOps is a platform for independent gyms — the kind that run coached class sessions
on a timetable rather than selling anonymous access to a room of machines. It gives a
gym one place to run its schedule, and its members one place to book into it.

It is built for the gym that currently does this with a spreadsheet, a WhatsApp group
and a whiteboard.

---

## The problem it solves

A box owner's day is made of small operational questions that are surprisingly hard to
answer with general-purpose tools: *Who is coming to the 7am? Is it full? Who is on the
waitlist, and who gets the spot when someone drops out? Is this member's plan even
supposed to include Gymnastics? Who coached Tuesday, and did anyone log a score?*

Answering those from a spreadsheet works until roughly the day it doesn't. BoxOps
models the gym properly — classes, capacity, plans, memberships, coaches, results — so
those questions have one answer instead of three.

---

## Who uses it

**Athletes** browse the timetable, book and cancel classes, join a waitlist when a class
is full, read the workout their coach programmed, and log their result afterwards. An
athlete can belong to more than one gym and switch between them.

**Gym owners** set the gym up and run it: class types, spaces and capacities, the
timetable, membership plans, and the people. They invite coaches and members, see who
is attending, and manage the schedule day to day.

**Coaches** see the classes they are assigned to, write the programming for them, mark
attendance, and see the results their athletes submitted. Coaches deliberately cannot
touch billing or gym configuration.

**Platform admins** have a deliberately minimal role — the platform hosts independent
gyms, it does not operate them.

---

## A few ideas worth knowing

These three shape almost everything else in the product.

**Each gym is its own world.** BoxOps is multi-tenant: a gym's classes, members,
coaches and data belong to that gym and are never visible from another. This isn't a
setting, it's enforced everywhere.

**A membership plan decides what you can see.** An athlete sees a class only if they
belong to the gym *and* their plan covers that class type. A CrossFit-only member
doesn't see the Gymnastics sessions at all — not greyed out, not "upgrade to book",
simply not there. It keeps the timetable honest about what's actually available to you.

**Classes move through a lifecycle.** A class goes from *Published* (open for booking)
to *Booking Closed* shortly before it starts, then *In Progress*, *Completed* (results
can be logged), and finally *Archived*. What you're allowed to do to a class depends on
where it is in that sequence, which is why bookings close on their own and why you
can't retroactively edit last month's session.

---

## Where the project is

**An MVP under active development.** The core loop works end to end today: a gym can be
set up and configured, owners can invite coaches and members by email, classes can be
created and published, athletes can book, cancel and join waitlists, coaches can
program and mark attendance, athletes can log results, and everyone gets notified about
the things that concern them. Accounts, invite-based onboarding and self-service
password reset are all in place.

**Not built yet.** Payments and billing are the significant gap — membership plans
exist and define access, but nothing charges anyone money. Also deliberately out of
scope for the MVP: recurring class series, a public marketplace for discovering gyms,
social features, deep analytics, wearables, and nutrition tracking.

---

## Learning more

The thinking behind the product is written down rather than implied, and the documents
are the source of truth over the code:

| Document | What it answers |
|---|---|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | What the product is, who it's for, what's in and out of scope |
| [`docs/USER_JOURNEYS.md`](docs/USER_JOURNEYS.md) | How each role actually moves through the app |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | The domain — gyms, classes, bookings, plans and how they relate |
| [`docs/MVP_SCREENS.md`](docs/MVP_SCREENS.md) | The screens that make up the MVP |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Questions that came up and how they were settled |
| [`context/DECISION_LOG.md`](context/DECISION_LOG.md) | Engineering decisions and the reasoning behind them |
| [`epics/`](epics/) | Feature-by-feature record of what was built and how it was verified |

---

## Running it

A web app (React Native / Expo, so it also runs on iOS and Android) talking to a
REST API (NestJS and PostgreSQL). Full setup instructions are in
[`QUICKSTART.md`](QUICKSTART.md); the short version is Docker for the database, then
the API and the app:

```bash
docker compose up -d          # PostgreSQL
cd backend  && npm install && npm run start:dev    # API on :3000
cd frontend && npm install && npm start            # app on :8081
```

The API documents itself at `http://localhost:3000/api-docs`.

---

<sub>BoxOps is an independent product and is not affiliated with, endorsed by, or
sponsored by CrossFit, LLC. "CrossFit" is used here only descriptively, to refer to the
style of training our users do.</sub>
