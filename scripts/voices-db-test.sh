#!/usr/bin/env bash
# Applies every migration to a throwaway LOCAL Postgres database and runs the Voices RLS tests.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/voices-db-test.sh
# Never point this at a Supabase project.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${VOICES_TEST_DB:-lyx_voices_test}
case "${PGHOST:-localhost}" in *supabase*) echo "refusing: PGHOST looks like Supabase"; exit 2;; esac
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$P -d "$DB" -c 'create extension if not exists pgcrypto' -f database/tests/supabase_shim.sql >/dev/null 2>&1
for f in 0001_init.sql 0002_enterprise_leads_source.sql 0003_public_catalog.sql 0004_catalog_ids.sql \
         0005_id_backed_public_domain.sql 0005b_cixy_messages.sql 20260922_track_unlocks.sql \
         20260922_harden_track_unlocks.sql 20260923_lock_my_track_unlocks_view.sql 0006_lyrixis_voices.sql; do
  $P -d "$DB" -1 -f "database/migrations/$f" >/dev/null 2>&1 || { echo "migration failed: $f"; $P -d "$DB" -1 -f "database/migrations/$f"; exit 1; }
done
$P -d "$DB" -tA -f database/tests/0006_voices_rls_test.sql
# rollback script works and re-apply is clean
$P -d "$DB" -1 -f database/migrations/rollback/0006_lyrixis_voices_down.sql >/dev/null 2>&1
$P -d "$DB" -1 -f database/migrations/0006_lyrixis_voices.sql >/dev/null 2>&1
echo "rollback + re-apply OK"
$P -d postgres -c "drop database $DB" >/dev/null
