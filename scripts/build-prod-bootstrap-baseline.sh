#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"
BASELINE_PATH="$SUPABASE_DIR/baselines/20260408120000_prod_bootstrap_baseline.sql"
PROD_SEED_PATH="$SUPABASE_DIR/seeds/prod_seed.sql"
TRAIN_SEED_PATH="$SUPABASE_DIR/seeds/train_seed.sql"

mkdir -p "$SUPABASE_DIR/baselines" "$SUPABASE_DIR/seeds"

{
  cat <<'HEADER'
-- =========================================================
-- PRIORITY LOGISTICS ERP
-- PROD BOOTSTRAP BASELINE
-- GENERATED FROM CANONICAL SQL SOURCES
-- DO NOT TREAT THIS FILE AS A NORMAL DELTA MIGRATION
-- FOR CLEAN ENVIRONMENTS ONLY
-- =========================================================

-- Source order:
-- 1. ERP_schema.sql
-- 2. ERP_functions.sql
-- 3. ERP_views.sql
-- 4. ERP_triggers.sql
-- 5. ERP_policies.sql

-- ===== BEGIN ERP_schema.sql =====

HEADER
  cat "$SUPABASE_DIR/ERP_schema.sql"
  printf '\n\n-- ===== BEGIN ERP_functions.sql =====\n\n'
  cat "$SUPABASE_DIR/ERP_functions.sql"
  printf '\n\n-- ===== BEGIN ERP_views.sql =====\n\n'
  cat "$SUPABASE_DIR/ERP_views.sql"
  printf '\n\n-- ===== BEGIN ERP_triggers.sql =====\n\n'
  cat "$SUPABASE_DIR/ERP_triggers.sql"
  printf '\n\n-- ===== BEGIN ERP_policies.sql =====\n\n'
  cat "$SUPABASE_DIR/ERP_policies.sql"
} > "$BASELINE_PATH"

cp "$SUPABASE_DIR/seed.sql" "$PROD_SEED_PATH"

if [[ ! -f "$TRAIN_SEED_PATH" ]]; then
  cat > "$TRAIN_SEED_PATH" <<'TRAINSEED'
-- TRAIN-only fixtures belong here.
-- Keep this file empty until a controlled DEV/TRAIN-only seed is explicitly approved.
-- Never load this file into PROD.
TRAINSEED
fi

echo "Generated:"
echo "  $BASELINE_PATH"
echo "  $PROD_SEED_PATH"
echo "  $TRAIN_SEED_PATH"
