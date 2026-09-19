#!/usr/bin/env bash
# Dump HardStuck Postgres from docker compose.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/backups"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M)"
OUT="$OUT_DIR/hardstuck-$STAMP.sql"
docker exec hardstuck-postgres pg_dump -U hardstuck -d hardstuck > "$OUT"
echo "Wrote $OUT"
