#!/bin/bash

# Validate local dev setup completeness
# Checks dependencies, file structure, and configuration

set +e  # Don't exit on errors; we want to report all issues

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "🔍 Validating CrossFit MVP Local Dev Setup"
echo "=========================================="
echo ""

# Check dependencies
echo "📋 Checking dependencies..."

if ! command -v node &> /dev/null; then
  echo "  ❌ Node.js not found (required)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ Node.js ($(node -v))"
fi

if ! command -v npm &> /dev/null; then
  echo "  ❌ npm not found (required)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ npm ($(npm -v))"
fi

if ! command -v docker &> /dev/null; then
  echo "  ❌ Docker not found (required)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ Docker ($(docker --version))"
fi

if ! command -v docker-compose &> /dev/null; then
  echo "  ❌ docker-compose not found (required)"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ docker-compose ($(docker-compose --version))"
fi

echo ""

# Check files exist
echo "📁 Checking files..."

FILES=(
  "docker-compose.yml"
  "QUICKSTART.md"
  "SETUP_SUMMARY.md"
  "docs/LOCAL_DEV.md"
  "backend/.env"
  "backend/package.json"
  "frontend/.env.local"
  "frontend/package.json"
  "scripts/dev-db-up.sh"
  "scripts/dev-db-reset.sh"
  "scripts/dev-up.sh"
  "scripts/README.md"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$FILE" ]; then
    echo "  ✅ $FILE"
  else
    echo "  ❌ $FILE (missing)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check scripts are executable
echo "🔐 Checking script permissions..."

for SCRIPT in dev-db-up.sh dev-db-reset.sh dev-up.sh; do
  if [ -x "$PROJECT_ROOT/scripts/$SCRIPT" ]; then
    echo "  ✅ scripts/$SCRIPT (executable)"
  else
    echo "  ❌ scripts/$SCRIPT (not executable, run: chmod +x scripts/$SCRIPT)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check backend dependencies
echo "📦 Checking backend dependencies..."

if [ -d "$PROJECT_ROOT/backend/node_modules" ]; then
  echo "  ✅ backend/node_modules exists"
else
  echo "  ⚠️  backend/node_modules missing (run: cd backend && npm install)"
fi

echo ""

# Check frontend dependencies
echo "📦 Checking frontend dependencies..."

if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "  ✅ frontend/node_modules exists"
else
  echo "  ⚠️  frontend/node_modules missing (run: cd frontend && npm install)"
fi

echo ""

# Check configuration values
echo "⚙️  Checking configuration..."

if [ -f "$PROJECT_ROOT/backend/.env" ]; then
  if grep -q "DB_HOST=localhost" "$PROJECT_ROOT/backend/.env"; then
    echo "  ✅ backend/.env has DB_HOST=localhost"
  else
    echo "  ⚠️  backend/.env has non-standard DB_HOST"
  fi

  if grep -q "DB_PORT=5432" "$PROJECT_ROOT/backend/.env"; then
    echo "  ✅ backend/.env has DB_PORT=5432"
  else
    echo "  ⚠️  backend/.env has non-standard DB_PORT"
  fi
fi

if [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
  if grep -q "EXPO_PUBLIC_API_BASE_URL" "$PROJECT_ROOT/frontend/.env.local"; then
    echo "  ✅ frontend/.env.local has EXPO_PUBLIC_API_BASE_URL"
  else
    echo "  ⚠️  frontend/.env.local missing EXPO_PUBLIC_API_BASE_URL"
  fi
fi

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! Ready to start development."
  echo ""
  echo "Next steps:"
  echo "  1. Install dependencies (if not already done):"
  echo "     cd backend && npm install && cd ../frontend && npm install"
  echo ""
  echo "  2. Start everything:"
  echo "     bash scripts/dev-up.sh"
  echo ""
  echo "See QUICKSTART.md for more details."
else
  echo "❌ Setup validation failed with $ERRORS error(s)."
  echo ""
  echo "Fix the issues above and run this script again."
fi

exit $ERRORS
