#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-/var/www/frontend}"
LOG_DIR="${LOG_DIR:-$FRONTEND_DIR/logs/catalog-unifier}"
WINDOW_HOURS="${1:-48}"
STRICT_MODE="${STRICT_MODE:-0}"

if ! [[ "$WINDOW_HOURS" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [window_hours]"
  exit 1
fi

window_minutes="$((WINDOW_HOURS * 60))"

if [[ ! -d "$LOG_DIR" ]]; then
  echo "No log directory found: $LOG_DIR"
  exit 0
fi

mapfile -t recent_logs < <(find "$LOG_DIR" -type f -name 'run-*.log' -mmin "-$window_minutes" | sort)
if [[ "${#recent_logs[@]}" -eq 0 ]]; then
  echo "No catalog-unifier logs in the last ${WINDOW_HOURS}h."
  exit 0
fi

tmp_results="$(mktemp)"
trap 'rm -f "$tmp_results"' EXIT

rg 'RUN_RESULT status=' "${recent_logs[@]}" > "$tmp_results" || true

total_runs="$(wc -l < "$tmp_results" | tr -d ' ')"
ok_runs="$(rg -c 'status=OK' "$tmp_results" || true)"
error_runs="$(rg -c 'status=ERROR' "$tmp_results" || true)"
skip_locked_runs="$(rg -c 'status=SKIPPED_LOCKED' "$tmp_results" || true)"
skip_disk_runs="$(rg -c 'status=SKIPPED_LOW_DISK' "$tmp_results" || true)"

latest_line="$(tail -n 1 "$tmp_results" 2>/dev/null || true)"
disk_line="$(df -h "$FRONTEND_DIR" | awk 'NR==2{printf "disk_used=%s disk_avail=%s use_percent=%s", $3, $4, $5}')"

db_size="$(du -sh "$FRONTEND_DIR/catalog-unifier/storage" 2>/dev/null | awk '{print $1}')"
out_size="$(du -sh "$FRONTEND_DIR/catalog-unifier/output" 2>/dev/null | awk '{print $1}')"

echo "Catalog-unifier health report (${WINDOW_HOURS}h)"
echo "logs_scanned=${#recent_logs[@]}"
echo "runs_total=${total_runs}"
echo "runs_ok=${ok_runs:-0}"
echo "runs_error=${error_runs:-0}"
echo "runs_skipped_locked=${skip_locked_runs:-0}"
echo "runs_skipped_low_disk=${skip_disk_runs:-0}"
echo "$disk_line"
echo "storage_db=${db_size:-n/a} storage_output=${out_size:-n/a}"
echo "last_result=${latest_line:-none}"

if [[ "$STRICT_MODE" == "1" && "${error_runs:-0}" -gt 0 ]]; then
  exit 2
fi

