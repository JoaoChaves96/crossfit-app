# Quick Start

Get the CrossFit MVP running locally in 5 minutes.

## TL;DR

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start everything
bash scripts/dev-up.sh
```

Press `w` in the Expo prompt to open the web app.

---

## One-Command Startup

```bash
bash scripts/dev-up.sh
```

This script:
1. ✅ Starts PostgreSQL (Docker)
2. ✅ Seeds test data (athlete, coach, gym, classes)
3. ✅ Starts backend at `http://localhost:3000`
4. ✅ Starts frontend dev server (Expo)

**Done.** You'll see the Expo menu. Press `w` to open in browser.

---

## Manual Startup (3 terminals)

If you prefer full control:

**Terminal 1: Database**
```bash
bash scripts/dev-db-up.sh
bash scripts/dev-db-reset.sh
```

**Terminal 2: Backend**
```bash
cd backend
npm run start:dev
```

**Terminal 3: Frontend**
```bash
cd frontend
npm start
```

Press `w` to open web app.

---

## Test Users

After startup, you can use these test users:

| User | Email |
|------|-------|
| Athlete | athlete@example.com |
| Coach | coach@example.com |
| Owner | owner@example.com |

The frontend will use these automatically (header-based auth in MVP).

---

## Verify It Works

1. **Open the app** (press `w` for web)
2. **View schedule** → See 3 published classes
3. **Book a class** → Select a class and book it
4. **My Bookings** → See your active bookings
5. **Cancel** → Remove a booking

---

## Database Access

Query directly:
```bash
docker-compose exec postgres psql -U postgres -d crossfit_box_dev
```

Example:
```sql
SELECT id, scheduled_date, scheduled_time, state FROM classes LIMIT 5;
SELECT COUNT(*) FROM bookings WHERE user_id = 'athlete-001';
```

---

## Full Documentation

See `docs/LOCAL_DEV.md` for:
- Prerequisites and setup
- Backend/frontend configuration
- Authentication headers
- Manual API testing (cURL)
- Troubleshooting
- Development workflow

---

## Stop Everything

```bash
Ctrl+C
```

This stops the frontend, backend, and database (cleanup is automatic).

---

## Restart with Fresh Data

```bash
# Reset database to initial seed state
bash scripts/dev-db-reset.sh

# Frontend and backend will reconnect automatically (or restart them)
```

---

## Next: What Works?

This MVP includes:

✅ **Athletes can:**
- View eligible classes
- Book classes (or waitlist if full)
- Cancel bookings
- View their bookings
- Log results after attending
- Edit results until class is archived

✅ **Coaches can:**
- Create classes
- Add/edit programming
- Mark attendance
- Toggle result logging
- Transition class states
- Adjust class capacity/space

✅ **Backend:**
- Full CQRS architecture
- Multi-tenant gym isolation
- Role-based access control
- Automatic waitlist promotion
- Class lifecycle state machine

---

## Issues?

- **Database won't start:** `docker-compose down -v && bash scripts/dev-db-up.sh`
- **Backend crashes:** Check logs: `tail -f /tmp/crossfit-backend.log`
- **Frontend can't reach backend:** Frontend auto-uses `http://localhost:3000` (correct by default)

See `docs/LOCAL_DEV.md` for more troubleshooting.
