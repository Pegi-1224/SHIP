#!/bin/sh
# Runs the three smoke tests against a live backend, each on a freshly reset demo database.
#
# Needs: the server running (`npm run dev`), the ship-postgres container, python3, and
# AUTH_DEV_RETURN_CODE=true in .env (the tests read the sign-in code from the response).
# It deletes every account whose email ends in @example.com, which is what the tests create.
# Prints only failures and each test's summary; exits non-zero if anything failed.
cd "$(dirname "$0")/.." || exit 1

curl -fs "${API_BASE:-http://localhost:3000/api}/health" >/dev/null || {
  echo "The server is not answering. Start it first: npm run dev" >&2
  exit 1
}

status=0
for n in 1 2 3; do
  # Posts and comments point at their author by anonymous handle (no foreign key), so deleting a
  # user row directly leaves them behind: remove them first. (`DELETE /me` does all of this itself.)
  docker exec ship-postgres psql -U ship -d ship -q -c \
    "DELETE FROM \"Post\" WHERE \"authorRefId\" IN (SELECT \"anonymousId\" FROM \"User\" WHERE email LIKE '%@example.com');
     DELETE FROM \"Comment\" WHERE \"authorRefId\" IN (SELECT \"anonymousId\" FROM \"User\" WHERE email LIKE '%@example.com');
     DELETE FROM \"User\" WHERE email LIKE '%@example.com';
     DELETE FROM \"Tag\"; DELETE FROM \"EmailCode\"; DELETE FROM \"Company\" WHERE id LIKE 'acme%';" >/dev/null
  npm run -s db:seed >/dev/null
  echo "== smoke_$n"
  output=$(python3 -I "test/smoke_$n.py" 2>&1) || status=1
  printf '%s\n' "$output" | grep -v '^PASS'
done
exit $status
