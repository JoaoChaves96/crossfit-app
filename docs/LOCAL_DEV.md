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

## Authentication & Headers

The MVP uses **header-based authentication** (not JWT yet):

- `x-user-id`: The user ID making the request
- `x-gym-id`: The gym context (required for all `/api/gyms/:gymId/*` endpoints)

### Obtaining user IDs

After seeding, you have these test users with these emails (frontend uses email-based lookup):

| Email | Role | Gym |
|-------|------|-----|
| `athlete@example.com` | Athlete | CrossFit Test Box |
| `coach@example.com` | Coach | CrossFit Test Box |
| `owner@example.com` | Owner | CrossFit Test Box |

For manual API testing with cURL/Postman, you'll need the actual UUIDs. Query them from the database:

```bash
docker-compose exec postgres psql -U postgres -d crossfit_box_dev -c \
  "SELECT email, id FROM users WHERE email IN ('athlete@example.com', 'coach@example.com');"
```

### Frontend

The frontend app automatically includes headers when making API calls. See `frontend/utils/api-client.ts`.

### Manual API testing (cURL, Postman)

Get user and gym IDs from database:

```bash
docker-compose exec postgres psql -U postgres -d crossfit_box_dev -c \
  "SELECT id FROM users WHERE email = 'athlete@example.com'; SELECT id FROM gyms LIMIT 1;"
```

To fetch the class schedule as the athlete (replace UUIDs):

```bash
curl -X GET "http://localhost:3000/api/gyms/{GYM_UUID}/classes" \
  -H "x-user-id: {ATHLETE_UUID}" \
  -H "x-gym-id: {GYM_UUID}"
```

To book a class (replace UUIDs and {classId}):

```bash
curl -X POST "http://localhost:3000/api/gyms/{GYM_UUID}/classes/{CLASS_UUID}/bookings" \
  -H "x-user-id: {ATHLETE_UUID}" \
  -H "x-gym-id: {GYM_UUID}" \
  -H "Content-Type: application/json" \
  -d '{
    "gymId": "{GYM_UUID}",
    "classId": "{CLASS_UUID}"
  }'
```

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
