#!/usr/bin/env bash
# Build a throwaway database, apply the Sealed Record layer, seal, verify,
# tamper, verify again. Needs psql and a Postgres you can create a database on.
#
#   ./test/run.sh                 # uses PGHOST/PGPORT/PGUSER from the environment
#   PGDATABASE=mirsad_test ./test/run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
db="${PGDATABASE:-mirsad_seal_test}"
unset PGDATABASE

dropdb --if-exists "$db"
createdb "$db"
trap 'dropdb --if-exists "$db" >/dev/null 2>&1 || true' EXIT

export PGDATABASE="$db"
psql -q -v ON_ERROR_STOP=1 -f "$here/migrations/0001_sealed_record.sql"
psql -q -v ON_ERROR_STOP=1 -f "$here/migrations/0002_seal_and_verify.sql"
psql -q -v ON_ERROR_STOP=1 -f "$here/seed/demo_seed.sql"
psql -q -f "$here/test/acceptance.sql"
