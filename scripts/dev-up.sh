#!/bin/bash

# Complete local dev startup: database, seed, backend, and frontend
# Runs database and backend in background, frontend in foreground

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🏋️  CrossFit MVP Local Dev Startup"
echo "=================================="
echo ""

# Step 1: Start database
echo "Step 1/4: Starting database..."
bash "$PROJECT_ROOT/scripts/dev-db-up.sh"
echo ""

# Step 2: Seed database
echo "Step 2/4: Seeding database..."
bash "$PROJECT_ROOT/scripts/dev-db-reset.sh"
echo ""

# # Step 3: Start backend in background
# echo "Step 3/4: Starting backend (http://localhost:3000)..."
# cd "$PROJECT_ROOT/backend"
# npm run start:dev > /tmp/crossfit-backend.log 2>&1 &
# BACKEND_PID=$!
# echo "  Backend PID: $BACKEND_PID"
# echo "  Logs: tail -f /tmp/crossfit-backend.log"
# sleep 3

# # Verify backend is running
# if ! kill -0 $BACKEND_PID 2>/dev/null; then
#   echo "❌ Backend failed to start. Check /tmp/crossfit-backend.log"
#   exit 1
# fi
# echo "✅ Backend started"
# echo ""

# # Step 4: Start frontend
# echo "Step 4/4: Starting frontend..."
# echo "  Press 'w' for web, 'i' for iOS, 'a' for Android, or 'r' to reload"
# echo ""
# cd "$PROJECT_ROOT/frontend"
# npm start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null; docker-compose -f $PROJECT_ROOT/docker-compose.yml down" EXIT
