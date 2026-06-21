#!/usr/bin/env bash
# Create the single admin (operator) user for the DO:NUTS CMS.
#
# Run this yourself — your password is read with hidden input and is never
# printed, logged, or passed on the command line. It uses the Supabase service
# key sourced from .env.local to call the Auth Admin API.
#
#   bash scripts/create-admin.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "error: .env.local not found" >&2
  exit 1
fi

# Load Supabase URL + service key from the gitignored env file.
set -a
. ./.env.local
set +a

URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL missing in .env.local}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY missing in .env.local}"

read -r -p "Admin email: " EMAIL
if [ -z "$EMAIL" ]; then echo "error: email required" >&2; exit 1; fi

read -r -s -p "Password (min 8 chars): " PW1; echo
read -r -s -p "Confirm password: " PW2; echo
if [ "$PW1" != "$PW2" ]; then echo "error: passwords do not match" >&2; exit 1; fi
if [ "${#PW1}" -lt 8 ]; then echo "error: password too short" >&2; exit 1; fi

# Build JSON body with jq so the password is encoded safely (never on argv).
BODY=$(jq -n --arg e "$EMAIL" --arg p "$PW1" \
  '{email: $e, password: $p, email_confirm: true}')

HTTP=$(curl -s -o /tmp/donuts_admin_resp.json -w "%{http_code}" \
  -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "$BODY")

unset PW1 PW2 BODY

if [ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]; then
  echo "✅ Admin user created: $(jq -r '.email' /tmp/donuts_admin_resp.json)"
  echo "   Log in at /admin/login"
else
  echo "❌ Failed (HTTP $HTTP):" >&2
  jq '.' /tmp/donuts_admin_resp.json >&2 || cat /tmp/donuts_admin_resp.json >&2
fi
rm -f /tmp/donuts_admin_resp.json
