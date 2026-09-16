#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-/var/www/frontend}"
LOG_DIR="${LOG_DIR:-$FRONTEND_DIR/logs/catalog-unifier}"
LOG_FILE="$LOG_DIR/run-$(date +%Y-%m-%d).log"
LOCK_FILE="${LOCK_FILE:-$FRONTEND_DIR/catalog-unifier/storage/cron.lock}"

KEEP_LOG_DAYS="${KEEP_LOG_DAYS:-21}"
RUN_TIMEOUT="${RUN_TIMEOUT:-90m}"
MIN_FREE_MB="${MIN_FREE_MB:-2048}"
UNIFIER_ARGS="${UNIFIER_ARGS:---source=all --dry-run --publish=off}"

mkdir -p "$LOG_DIR" "$(dirname "$LOCK_FILE")"

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
started_epoch="$(date +%s)"

write_result() {
  local status="$1"
  local code="$2"
  local reason="$3"
  local ended_at ended_epoch duration_s
  ended_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  ended_epoch="$(date +%s)"
  duration_s="$((ended_epoch - started_epoch))"
  printf 'RUN_RESULT status=%s code=%s reason=%s started_at=%s ended_at=%s duration_s=%s\n' \
    "$status" "$code" "$reason" "$started_at" "$ended_at" "$duration_s" >> "$LOG_FILE"
}

{
  echo "=================================================="
  echo "Catalog unifier cron start: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "cwd=$FRONTEND_DIR"
  echo "args=$UNIFIER_ARGS"
} >> "$LOG_FILE"

available_kb="$(df -Pk "$FRONTEND_DIR" | awk 'NR==2{print $4}')"
min_kb="$((MIN_FREE_MB * 1024))"
if [[ -z "$available_kb" || "$available_kb" -lt "$min_kb" ]]; then
  echo "Low disk space: available_kb=${available_kb:-unknown} min_kb=$min_kb. Job skipped." >> "$LOG_FILE"
  write_result "SKIPPED_LOW_DISK" "0" "low_disk"
  find "$LOG_DIR" -type f -name 'run-*.log' -mtime +"$KEEP_LOG_DAYS" -delete || true
  exit 0
fi

exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "Another catalog-unifier run is still active. Job skipped." >> "$LOG_FILE"
  write_result "SKIPPED_LOCKED" "0" "already_running"
  find "$LOG_DIR" -type f -name 'run-*.log' -mtime +"$KEEP_LOG_DAYS" -delete || true
  exit 0
fi

cd "$FRONTEND_DIR"

run_code=0
set +e
timeout "$RUN_TIMEOUT" node catalog-unifier/src/cli.js run $UNIFIER_ARGS >> "$LOG_FILE" 2>&1
run_code="$?"
set -e

if [[ "$run_code" -eq 0 ]]; then
  echo "Catalog unifier cron finished OK." >> "$LOG_FILE"
  write_result "OK" "0" "completed"
else
  echo "Catalog unifier cron finished with error code=$run_code." >> "$LOG_FILE"
  write_result "ERROR" "$run_code" "command_failed"
fi

find "$LOG_DIR" -type f -name 'run-*.log' -mtime +"$KEEP_LOG_DAYS" -delete || true

exit "$run_code"
