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
