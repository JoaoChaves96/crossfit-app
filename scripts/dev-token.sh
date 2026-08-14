#!/bin/bash

# Mint a real JWT for a dev user, for manual API testing with curl or Postman.
#
# This wraps POST /api/auth/login — the same endpoint the app uses — so a token
# from here carries the same claims the frontend gets, and a request made with
# it exercises the same guard path production does.
#
# It exists because JwtAuthGuard has no header-auth bypass: there was once a
# `NODE_ENV=development` branch that built the acting user out of `x-user-id` /
# `x-gym-id` headers, which meant the caller picked their own identity and gym
# and every downstream identity and tenant check ran on values the caller
# supplied. It is gone. Every request needs a token, in every environment.
#
# Usage:
#   ./scripts/dev-token.sh                          # owner@example.com
#   ./scripts/dev-token.sh athlete@example.com      # a specific user
#   ./scripts/dev-token.sh coach@example.com pass   # a non-default password
#
#   # the common case — hold it in a variable for a session (tokens last 7 days):
#   TOKEN=$(./scripts/dev-token.sh athlete@example.com)
#   curl "http://localhost:3000/api/gyms/$GYM_ID/classes" -H "Authorization: Bearer $TOKEN"
#
# Prints the bare token on stdout and everything else on stderr, so it is safe
# to use in a command substitution.

set -e

EMAIL="${1:-owner@example.com}"
PASSWORD="${2:-password123}"
API_URL="${API_URL:-http://localhost:3000}"

RESPONSE=$(curl -sS -X POST "$API_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(printf '%s' "$RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "❌ Could not get a token for $EMAIL from $API_URL" >&2
  echo "   response: $RESPONSE" >&2
  echo "" >&2
  echo "   Check that the backend is running, and that this user has a password." >&2
  echo "   Users seeded by the dev scripts use password123; users created by an" >&2
  echo "   automated run may have no password at all, and cannot log in." >&2
  exit 1
fi

echo "✅ Token for $EMAIL (valid 7 days)" >&2
echo "" >&2

echo "$TOKEN"
