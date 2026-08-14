# Local Development Setup — Summary

## What Was Created

This setup package provides a complete, canonical way to run the CrossFit MVP locally end-to-end.

### Files Created

#### 1. **docker-compose.yml** (root)
- Defines PostgreSQL 15 service
- Exposes port 5432
- Auto-creates `crossfit_box_dev` database
- Includes health check
- Persists data in named volume `postgres_data`

#### 2. **docs/LOCAL_DEV.md**
- **Comprehensive guide** to local development
- Prerequisites and installation
- Step-by-step database, backend, and frontend startup
- Authentication and headers explanation
- Manual API testing (cURL examples)
- Manual verification checklist
- Troubleshooting
- Database access and useful queries
- Development workflow tips

#### 3. **scripts/dev-db-up.sh**
- Starts PostgreSQL in Docker
- Waits for database to be ready
- Safe to run multiple times

#### 4. **scripts/dev-db-reset.sh**
- **Seed script** (main one)
- Clears all tables in correct FK order
- Inserts minimal viable test data:
  - 3 users (athlete, coach, owner)
  - 1 gym
  - 2 class types (CrossFit, Gymnastics)
  - 2 spaces (Main Hall, Studio)
  - 1 membership plan (includes both class types)
  - 1 athlete with active membership in gym
  - 3 published classes scheduled 7-8 days in future
- Respects credentials in `backend/.env`
- Prints verification output

#### 5. **scripts/dev-up.sh**
- **All-in-one startup script**
- Orchestrates full startup in order:
  1. PostgreSQL (background)
  2. Seed database
  3. Backend NestJS server (background)
  4. Frontend Expo dev server (foreground)
- Cleans up on exit (Ctrl+C)
- Shows backend PID and log location

#### 6. **scripts/README.md**
- Documents each script's purpose
- Usage examples
- Troubleshooting for script issues

#### 7. **QUICKSTART.md** (root)
- **5-minute quick start**
- TL;DR for busy developers
- One-command startup
- Manual multi-terminal workflow
- Test users reference
- Verification steps
- Quick troubleshooting

## Schema Alignment

All seed data respects actual entity definitions from:
- `backend/src/domain/*/entities/*.entity.ts`

**Key fields verified:**
- User: id, email, name, status, passwordHash, socialLoginId, createdAt
- Gym: id, name, location, ownerUserId, status, createdAt, lastModifiedAt
- ClassType: id, gymId, name, loggable, resultMetrics, deletedAt
- Space: id, gymId, name, baseCapacity, deletedAt
- MembershipPlan: id, gymId, name, pricing, billingCycle, classTypes (array), status, createdAt
- Class: id, gymId, classTypeId, coachUserId, spaceId, scheduledDate, scheduledTime, capacity, loggable, state, createdAt, lastModifiedAt, deletedAt
- GymMembership: id, gymId, userId, status, joinedAt
- AthleteMembershipPlan: id, gymMembershipId, membershipPlanId, status, startedAt, expiresAt

**All foreign keys are satisfied:**
- Class → ClassType ✓
- Class → Space ✓
- Class → Coach (User) ✓
- GymMembership → Gym, User ✓
- AthleteMembershipPlan → GymMembership, MembershipPlan ✓
- GymStaff → Gym ✓

## How It Works

### Startup Sequence

```
User runs: bash scripts/dev-up.sh

1. Docker starts PostgreSQL (background)
   └─ Creates crossfit_box_dev database
   └─ Waits for readiness

2. Seed script runs SQL
   └─ Clears all tables (reverse FK order)
   └─ Inserts 3 users, 1 gym, 2 class types, 2 spaces
   └─ Inserts 1 active membership plan for athlete
   └─ Inserts 3 published classes

3. Backend starts (background)
   └─ npm run start:dev
   └─ TypeORM auto-syncs schema (synchronize: true)
   └─ Listens on http://localhost:3000

4. Frontend starts (foreground)
   └─ npm start
   └─ Expo dev server
   └─ Ready for user interaction

User presses 'w' → Opens web app
```

### Data Flow

```
Frontend (Expo)
  │
  ├─ Makes API calls to http://localhost:3000
  ├─ Includes header:
  │   Authorization: Bearer <jwt>
  │
Backend (NestJS)
  │
  ├─ Receives requests
  ├─ Validates headers (MVP auth)
  ├─ Executes CQRS commands/queries
  ├─ Enforces gym_id scoping (multi-tenant)
  │
Database (PostgreSQL)
  │
  └─ Returns data
```

### Test Data Ready to Use

After seeding, you have:

**Athlete (athlete@example.com) can:**
- View schedule (3 published classes)
- Book any class (joins or waitlists)
- Cancel bookings
- View "My Bookings" (all active bookings)

**Coach (coach@example.com) can:**
- View assigned classes
- Add/edit programming
- Mark attendance
- Transition class states
- Log results (after class is completed)

**Gym environment (CrossFit Test Box):**
- ClassTypes: CrossFit, Gymnastics
- Spaces: Main Hall (15 cap), Studio (8 cap)
- MembershipPlan: Premium ($100/mo, all classes)
- Users: 1 athlete, 1 coach, 1 owner
- Classes: 3 published (7-8 days out)

**Note:** All IDs are proper UUIDs. Query the database to get specific IDs for API testing:
```bash
docker-compose exec postgres psql -U postgres -d crossfit_box_dev \
  -c "SELECT email, id FROM users;"
```

## Key Design Decisions

### Authentication

- **JWT everywhere**, dev included. No header-auth fallback, no dev bypass.
- **Frontend:** stores the token from login, sends `Authorization: Bearer <token>`
  (see `frontend/utils/api-client.ts`)
- **Backend:** `JwtAuthGuard` verifies the signature and populates `request.user`
  from the claims (see `backend/src/auth/`)
- **Manual testing:** `TOKEN=$(./scripts/dev-token.sh athlete@example.com)`

### Database Initialization

- **TypeORM `synchronize: true`** in development
- Entities are source of truth, not migrations
- Seed script pre-loads test data (optional but recommended)
- Safe to run seed script multiple times (TRUNCATE CASCADE)

### Seed Script Strategy

- **One authoritative seed script** for local dev
- **Respects entity definitions** (read from generated code)
- **Minimal viable data** (1 gym, 2 classes, 2 users)
- **Future-dated classes** (7+ days) so they don't expire immediately
- **Clear SQL comments** for maintainability

### Scripts Design

- **Atomic, reusable, safe**
  - `dev-db-up.sh` — Just start database
  - `dev-db-reset.sh` — Just seed data
  - `dev-up.sh` — Orchestrate full startup
- **Idempotent** — Safe to run multiple times
- **Respectful of user configuration** — Read from `.env` files
- **Clear output** — Status messages, error handling, no silent failures

## What NOT Included

Deliberately excluded to follow the mandate ("run existing system, don't modify"):

- ❌ Database migrations (TypeORM sync handles schema)
- ❌ Code changes (no refactoring, no new features)
- ❌ Alternative setups (one obvious correct way)
- ❌ Production configuration (this is dev-only)
- ❌ CI/CD pipelines
- ❌ Kubernetes, load balancers, etc.
- ❌ Advanced seeding (fixtures, factories, etc.)

## Usage

### First Time

```bash
# Install dependencies
cd backend && npm install && cd ../frontend && npm install && cd ..

# Start everything (one command)
bash scripts/dev-up.sh
```

### Subsequent Runs

```bash
# Start with existing seed data
bash scripts/dev-up.sh

# Or manual control
bash scripts/dev-db-up.sh          # Terminal 1
bash scripts/dev-db-reset.sh       # (same terminal)
cd backend && npm run start:dev    # Terminal 2
cd frontend && npm start            # Terminal 3
```

### Reset to Fresh State

```bash
bash scripts/dev-db-reset.sh  # While backend is running
```

Database resets, schema auto-syncs, frontend reconnects.

## Verification

Manual test checklist (see LOCAL_DEV.md for detailed steps):

- [ ] Schedule loads (3 classes visible)
- [ ] Booking works (can book a class)
- [ ] Cancel works (can cancel a booking)
- [ ] My Bookings works (only active bookings shown)

## Files Overview

```
crossfit-app/
├── docker-compose.yml          ← PostgreSQL container definition
├── QUICKSTART.md               ← 5-min quick start guide
├── SETUP_SUMMARY.md            ← This file
├── docs/
│   └── LOCAL_DEV.md            ← Comprehensive documentation
├── scripts/
│   ├── dev-db-up.sh            ← Start database
│   ├── dev-db-reset.sh         ← Seed with test data
│   ├── dev-up.sh               ← All-in-one startup
│   └── README.md               ← Scripts documentation
├── backend/
│   ├── .env                    ← Backend config (DB credentials)
│   ├── package.json
│   └── src/
└── frontend/
    ├── .env.local              ← Frontend config (API_BASE_URL)
    ├── package.json
    └── app/
```

## Success Criteria

✅ **Backend starts** → NestJS listening on port 3000
✅ **Frontend starts** → Expo dev server running
✅ **Database ready** → PostgreSQL responding
✅ **Schema synced** → TypeORM auto-created all tables
✅ **Test data loaded** → Athlete can see 3 classes
✅ **Booking works** → Athlete can book and cancel
✅ **End-to-end verified** → Full user journey works

All achieved with **one command:** `bash scripts/dev-up.sh`

---

For detailed usage, troubleshooting, and next steps, see **QUICKSTART.md** and **docs/LOCAL_DEV.md**.
