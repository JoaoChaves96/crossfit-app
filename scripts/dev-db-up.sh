#!/bin/bash

# Start PostgreSQL database in Docker

set -e

echo "🚀 Starting PostgreSQL..."

docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
  if docker-compose exec postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is ready"
    exit 0
  fi
  echo "  Still waiting... ($i/30)"
  sleep 1
done

echo "❌ Database failed to start"
exit 1
