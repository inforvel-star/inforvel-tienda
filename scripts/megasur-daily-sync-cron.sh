#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/megasur-daily-sync.lock"
LOG_FILE="/var/www/frontend/logs/megasur-daily-sync-cron.log"

exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Otra sync de MegaSur ya está en marcha, se omite esta ejecución." >> "$LOG_FILE"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Iniciando megasur_daily_sync (proceso dedicado, sin límite de 10 min)" >> "$LOG_FILE"

(ulimit -v 3145728; exec timeout -k 60 3600 /usr/local/bin/wp eval 'do_action("megasur_daily_sync");' --path=/var/www/wp) >> "$LOG_FILE" 2>&1
exit_code=$?

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Finalizado megasur_daily_sync (exit_code=$exit_code)" >> "$LOG_FILE"
exit "$exit_code"
