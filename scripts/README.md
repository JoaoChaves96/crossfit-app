# Development Scripts

Utility scripts for local development and testing.

## Scripts

### `dev-db-up.sh`
Start PostgreSQL in Docker and wait for it to be ready.

```bash
bash scripts/dev-db-up.sh
```

### `dev-db-reset.sh`
Clear all database tables and insert minimal test data.

Requires PostgreSQL to be running. Uses credentials from `backend/.env`.

```bash
bash scripts/dev-db-reset.sh
```

Creates:
- 3 test users (athlete, coach, owner)
- 1 gym
- 2 class types
- 2 spaces
- 1 membership plan
- 1 gym membership (athlete)
- 1 active membership plan (athlete)
- 3 published classes (7-8 days from now)

### `dev-up.sh`
**One-command startup.** Starts database, backend, and frontend in the correct order.

```bash
bash scripts/dev-up.sh
```

This:
1. Starts PostgreSQL (background)
2. Seeds the database
3. Starts backend at `http://localhost:3000` (background)
4. Starts frontend Expo dev server (foreground)

**Cleanup:** Press `Ctrl+C` to stop all services and clean up.

### `staging-seed.sh`
Seed the **staging demo database** with a browsable demo gym. **Manual only — never
call this from a workflow.** The pipeline is forbidden to write application data:
a deploy runs migrations and nothing else, so no deploy can clobber a demo someone
is mid-way through showing. This script is the deliberate exception a human runs.

```bash
STAGING_DATABASE_URL='<neon DIRECT url for boxops_staging>' ./scripts/staging-seed.sh
```

It refuses to run against any database whose `current_database()` is not
`boxops_staging`, exiting non-zero — the mirror image of the e2e guard that keeps
tests out of the dev database.

`sql/staging-seed.sql` is **additive and idempotent**: no `TRUNCATE`, `DELETE` or
`DROP` anywhere, and every insert is `ON CONFLICT DO NOTHING` against a fixed,
derived id, so a second run inserts nothing and the demo survives a redeploy
untouched. Contrast `dev-db-reset.sh`, which destroys everything.

Creates, in one gym (`BoxOps Demo Box`):
- 8 users — 1 owner, 1 coach, 6 athletes
- 3 class types (CrossFit, Gymnastics, Olympic Weightlifting), 2 spaces
- 2 membership plans — `Unlimited` covers all three class types, `CrossFit Only`
  covers one, so the demo shows the plan-visibility rule rather than hiding it
- 6 gym memberships, each with an active plan (4 Unlimited, 2 CrossFit Only)
- a rolling fortnight of published classes from `CURRENT_DATE` — 5 slots on
  weekdays, 2 on Saturdays, closed Sunday (54 classes for a fortnight starting
  midweek). Class ids are derived from the calendar slot, so re-running later
  tops the schedule up with the days that have come into range and never
  duplicates a class or disturbs an existing one.

Logins (all `password123`): `owner@demo.boxops.dev`, `coach@demo.boxops.dev`,
`athlete1@demo.boxops.dev` … `athlete6@demo.boxops.dev`.

To rehearse a change to the SQL, apply it directly to a throwaway database —
never to `crossfit_box_dev`, and never by loosening the guard:

```bash
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE seed_check'
cd backend && DATABASE_URL='postgres://postgres:postgres@localhost:5432/seed_check' \
  NODE_ENV=production npm run migration:run && cd ..
PGPASSWORD=postgres psql -h localhost -U postgres -d seed_check \
  -v ON_ERROR_STOP=1 -f scripts/sql/staging-seed.sql
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE seed_check'
```

## Manual Workflow

If you prefer manual control:

```bash
# Terminal 1: Database
bash scripts/dev-db-up.sh
bash scripts/dev-db-reset.sh

# Terminal 2: Backend
cd backend
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm start
```

## Environment

All scripts respect `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=crossfit_box_dev
```

If you modified these, scripts will use your values.

## Troubleshooting

**Database won't start**
```bash
docker-compose down -v  # Remove containers and volumes
bash scripts/dev-db-up.sh
```

**Schema errors after restart**
TypeORM auto-syncs on backend start. If issues persist:
```bash
bash scripts/dev-db-reset.sh
cd backend && npm run start:dev
```

**Seed script fails with connection error**
- Check PostgreSQL is running: `docker-compose ps`
- Check credentials in `backend/.env` match container environment
