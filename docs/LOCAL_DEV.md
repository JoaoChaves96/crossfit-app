# Local Development Setup

This guide walks you through starting the entire CrossFit MVP system locally: database, backend, and frontend.

## Prerequisites

- **Node.js** 18+ (for backend and frontend)
- **npm** (installed with Node)
- **Docker & Docker Compose** (for PostgreSQL database)
- **Expo CLI** (optional, auto-installed via npm)

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Database Setup

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

This starts a PostgreSQL container on `localhost:5432` with default credentials:
- Username: `postgres`
- Password: `postgres`
- Database: `crossfit_box_dev`

Verify the container is running:
```bash
docker-compose ps
```

### 2. Initialize schema and seed data

TypeORM will auto-sync the schema on first backend start (because `synchronize: true` in development).

To pre-seed data before starting the backend, run the seed script:

```bash
bash scripts/dev-db-reset.sh
```

This:
1. Clears all tables (in correct FK order)
2. Inserts minimal viable test data:
   - 1 Gym (CrossFit Test Box)
   - 2 ClassTypes (CrossFit, Gymnastics - both loggable)
   - 2 Spaces (Main Hall, Studio)
   - 1 Membership Plan (Premium, includes all class types)
   - 3 Users:
     - Athlete: `athlete@example.com`
     - Coach: `coach@example.com`
     - Owner: `owner@example.com`
   - 1 GymMembership (athlete in gym)
   - 1 AthleteMembershipPlan (athlete has active premium plan)
   - 3 Classes (published state, scheduled 7-8 days in future)

**Note:** The script uses environment variables from `backend/.env`. If you modified those, adjust the script accordingly.

### 3. Create the test databases

Each test suite owns its own database and truncates it. `crossfit_box_dev` holds hand-seeded
manual-test scenarios that no script rebuilds, so neither suite may reach it:

```bash
docker-compose exec postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_api_e2e'
docker-compose exec postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_e2e'
```

| Database | Owned by | Created by |
|---|---|---|
| `crossfit_box_dev` | your dev stack | `docker-compose` (`POSTGRES_DB`) |
| `crossfit_box_api_e2e` | `backend` → `npm run test:e2e` | you, once (command above) |
| `crossfit_box_e2e` | `frontend` → Playwright journeys | you, once (command above) |

Both suites build their own schema via TypeORM `synchronize` on first run and refuse to start
against any other database (`backend/test/helpers/e2e-database.ts`,
`frontend/e2e/env.ts`). A missing database fails loudly with the `CREATE DATABASE` command
rather than falling back.

### If something else holds an e2e port

The journeys default to API `:3001` and web `:8082`, and another process on the machine can
hold either — a `kafka-rest-proxy` container on 8082 made the suite unrunnable once. Move the
run instead of killing the squatter:

```bash
cd frontend
E2E_API_PORT=3101 E2E_WEB_PORT=8182 npm run test:e2e
```

Both are read once at module load in `frontend/e2e/env.ts`, and the API URL, the web URL and
the backend's own `PORT` all follow. A value that is not a port number (`1`–`65535`) throws
rather than falling back — a fallback would put the run back on the port you were escaping.
The **database** name is not overridable and never will be; that constant is the guard.

## Backend Setup

### 1. Set environment variables

`backend/.env` already contains development defaults:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=crossfit_box_dev
DATABASE_LOGGING=false
```

If you changed PostgreSQL credentials, update `DB_*` variables.

### 2. Start the backend

```bash
cd backend
npm run start:dev
```

You should see:
```
[Nest] ... - 04/19/2026, ... AM     LOG [NestFactory] Nest application successfully started
[Nest] ... - 04/19/2026, ... AM     LOG [AppModule] Database connection established
```

Backend is ready at `http://localhost:3000`.

**API Documentation:** Visit `http://localhost:3000/api/docs` (Swagger UI, if enabled).

## Frontend Setup

### 1. Verify .env.local

`frontend/.env.local` should already contain:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

If running on a different backend URL, update this.

### 2. Start the Expo development server

```bash
cd frontend
npm start
```

You'll see:

```
> expo start

Usage
  Press i to open iOS simulator
  Press a to open Android emulator
  Press w to open web
  Press r to reload app
  Press m to toggle menu
```

### 3. Run the app

Choose your target:

- **Web** (easiest for manual testing): Press `w` → Opens in browser
- **iOS** (if on Mac): Press `i` → Opens iOS simulator
- **Android**: Press `a` → Opens Android emulator
- **Physical device**: Scan QR code with Expo Go app

## Authentication

Every request carries a **signed JWT**, in every environment including local dev.
There is no header-auth shortcut: `x-user-id` / `x-gym-id` are not read anywhere,
and a request without an `Authorization` header gets a 401 even under
`NODE_ENV=development`.

The token's claims are `sub` (user), `email`, `gymId` and `role`. `gymId` is the
acting gym context — `POST /api/auth/login` resolves it to the user's default gym
(oldest `assignedAt`), and `POST /api/auth/gym-context` re-issues the token against
a different gym. The gym in the route must agree with the gym in the token.

### Seeded dev users

| Email | Role | Password |
|-------|------|----------|
| `athlete@example.com` | Athlete | `password123` |
| `coach@example.com` | Coach | `password123` |
| `owner@example.com` | Owner | `password123` |

Members added by `scripts/dev-db-populate-members.sh` also use `password123`. Users
created by an automated test run have **no password** and cannot log in — they were
only ever reachable through the header bypass that no longer exists.

### Frontend

The app stores the token after login and sends it as `Authorization: Bearer <token>`.
See `frontend/utils/api-client.ts`.

### Manual API testing (cURL, Postman)

`scripts/dev-token.sh` mints a real token by calling the same login endpoint the app
uses. It prints the bare token on stdout, so hold it in a variable — tokens last 7 days.

```bash
TOKEN=$(./scripts/dev-token.sh athlete@example.com)
GYM_ID=$(docker-compose exec -T postgres psql -U postgres -d crossfit_box_dev -At \
  -c "SELECT \"gymId\" FROM gym_staff s JOIN users u ON u.id = s.\"userId\" \
      WHERE u.email = 'owner@example.com' AND s.role = 'owner' LIMIT 1;" | tr -d '\r')
```

To fetch the class schedule as the athlete:

```bash
curl -X GET "http://localhost:3000/api/gyms/$GYM_ID/classes" \
  -H "Authorization: Bearer $TOKEN"
```

To book a class:

```bash
curl -X POST "http://localhost:3000/api/gyms/$GYM_ID/classes/{CLASS_UUID}/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gymId": "'"$GYM_ID"'",
    "classId": "{CLASS_UUID}"
  }'
```

A 403 where you expected a 200 is usually the domain, not auth: an owner token on an
athlete route returns *"Athlete does not have an active membership in this gym"*,
because owners hold no membership. Log in as the athlete for athlete routes.

## Running Against Staging

Staging is `https://api.boxops.dev` (Fly) and `https://app.boxops.dev` (Cloudflare Pages),
backed by Neon's `boxops_staging`. Two commands here talk to it. Both are **manual** — the
pipeline runs neither.

### The smoke check (read-only, no database)

```bash
cd frontend
SMOKE_WEB_URL=https://app.boxops.dev npm run test:smoke
```

One unauthenticated Playwright check that the deployed app actually works: the login screen
renders, no asset is served as `text/html`, no `FontFace` is in `error`, and a wrong-password
login returns the API's 401 rather than an unreachable-API message. It needs no database and
writes nothing, which is why it is safe to point at staging. `ci` runs it after every deploy.

### The journeys against a deployed environment

```bash
cd frontend
E2E_TARGET=remote \
E2E_WEB_URL=https://app.boxops.dev \
E2E_API_URL=https://api.boxops.dev \
E2E_DB_NAME=crossfit_box_e2e_<runid> \
E2E_DATABASE_URL='<neon DIRECT url for that database>' \
  npm run test:e2e
```

The journeys truncate and reseed, so they may **never** run against a database anyone cares
about. Four guards enforce that, and each throws before a socket opens:

- `E2E_DATABASE_URL` must be Neon's **direct** endpoint, not the pooled one — the suite runs
  migrations, and DDL through PgBouncer is a class of failure with no upside.
- `E2E_DB_NAME` must match `crossfit_box_e2e_<runid>`, where the run id is 7–40 lowercase
  alphanumerics. Hyphens, underscores and uppercase are refused.
- `boxops_staging` and `crossfit_box_dev` are on an explicit forbidden list. **The guard will
  refuse `boxops_staging`** — pointing the journeys at staging is the mistake it exists to stop.
- `E2E_TARGET=remote` with any of the four variables missing aborts at config load.

### Seeding the staging demo data

```bash
STAGING_DATABASE_URL='<neon DIRECT url for boxops_staging>' ./scripts/staging-seed.sh
```

Additive and idempotent: every insert is `ON CONFLICT DO NOTHING` against ids derived from a
constant demo-gym id, so a second run is a no-op and it never truncates. Contrast
`scripts/dev-db-reset.sh`, which destroys everything. It refuses any database whose
`current_database()` is not `boxops_staging`, and it prints the user count before and after so
you can see what it did. All demo passwords are `password123`.

Manual on purpose: no pipeline step may write application data, so no deploy can clobber a demo
mid-presentation.

## Manual Verification Checklist

After all services are running, verify the MVP works end-to-end:

### 1. Schedule loads

- [ ] Open the app in web/simulator
- [ ] Log in as athlete (`athlete@example.com`)
- [ ] Navigate to "Schedule" or "Classes"
- [ ] See 3 classes listed
- [ ] Each class shows: name, coach, capacity, time

### 2. Booking works

- [ ] Click "Book" on any class
- [ ] Confirm success message or booking status changes
- [ ] Verify in database: 
  ```sql
  SELECT b.id, b.class_id, b.status FROM bookings b
  JOIN gym_memberships gm ON b.user_id = gm.user_id
  WHERE gm.user_id IN (SELECT id FROM users WHERE email = 'athlete@example.com');
  ```

### 3. Cancel works

- [ ] Open "My Bookings" or view booked classes
- [ ] Click "Cancel" on a booking
- [ ] Confirm cancellation
- [ ] Verify in database:
  ```sql
  SELECT b.id, b.status FROM bookings b
  WHERE b.user_id IN (SELECT id FROM users WHERE email = 'athlete@example.com')
  AND b.status = 'cancelled';
  ```

### 4. My Bookings works

- [ ] View "My Bookings" or equivalent screen
- [ ] See only active (booked/waitlisted) bookings
- [ ] Cancelled bookings are hidden

### 5. Coach functionality (optional)

- [ ] Log in as coach `coach-001`
- [ ] View assigned classes
- [ ] Update programming or toggle loggable status
- [ ] Mark attendance for a completed class

## Troubleshooting

### Database won't start
```bash
docker-compose down -v  # Remove containers and volumes
docker-compose up -d postgres
```

### Backend won't connect to database
- Check `docker-compose ps` - is postgres running?
- Verify `backend/.env` has correct `DB_*` values
- Check port 5432 isn't in use: `lsof -i :5432`

### Frontend can't reach backend
- Verify backend is running: `curl http://localhost:3000/health`
- Check `frontend/.env.local` has `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`
- If on mobile/simulator, use correct IP (not `localhost`): check Expo output for local IP

### Schema/entity errors
- TypeORM auto-syncs in development mode
- If schema is out of sync, resync:
  ```bash
  npm run start:dev  # Restart backend with fresh sync
  ```

### Need to reset everything

```bash
# Stop services
docker-compose down -v

# Restart database
docker-compose up -d postgres

# Reseed
bash scripts/dev-db-reset.sh

# Restart backend
cd backend && npm run start:dev

# Restart frontend (in separate terminal)
cd frontend && npm start
```

## Development Workflow

1. **Make code changes** in `backend/src` or `frontend/app`
2. **Backend auto-reloads** via `--watch` flag in `npm run start:dev`
3. **Frontend hot-reloads** in Expo dev server (press `r` to reload)
4. **Test changes** in the running app or via cURL/Postman

## Database Access

To query the database directly:

```bash
docker-compose exec postgres psql -U postgres -d crossfit_box_dev
```

Useful queries:

```sql
-- View all users
SELECT id, email, name, status FROM users;

-- View all gyms
SELECT id, name, status FROM gyms;

-- View classes for a gym (replace {gym_id})
SELECT id, class_type_id, scheduled_date, scheduled_time, state FROM classes WHERE gym_id = '{gym_id}';

-- View bookings for an athlete (replace {user_id})
SELECT id, class_id, status, booked_position FROM bookings WHERE user_id = '{user_id}' AND status != 'cancelled';

-- Get athlete user ID
SELECT id FROM users WHERE email = 'athlete@example.com';

-- Get gym ID
SELECT id FROM gyms LIMIT 1;
```

Exit psql with `\q`.

## Next Steps

- **Add more test data:** Edit `scripts/dev-db-reset.sh`
- **Test other roles:** Create more users in the seed script
- **Modify seed data:** Update SQL INSERT statements in the script
- **Full reset:** Run the reset script anytime to return to clean state
