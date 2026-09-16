#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-/var/www/frontend}"
RUNNER_SCRIPT="$FRONTEND_DIR/scripts/catalog-unifier-scheduled.sh"

if [[ ! -x "$RUNNER_SCRIPT" ]]; then
  echo "Runner script is missing or not executable: $RUNNER_SCRIPT"
  exit 1
fi

begin_marker="# BEGIN catalog-unifier-dev"
end_marker="# END catalog-unifier-dev"

existing="$(crontab -l 2>/dev/null || true)"
cleaned="$(printf '%s\n' "$existing" | awk -v b="$begin_marker" -v e="$end_marker" '
  $0==b {skip=1; next}
  $0==e {skip=0; next}
  skip==0 {print}
')"

new_block="$(cat <<EOF
$begin_marker
10 6 * * * $RUNNER_SCRIPT
10 18 * * * $RUNNER_SCRIPT
$end_marker
EOF
)"

{
  printf '%s\n' "$cleaned" | sed '/^[[:space:]]*$/N;/^\n$/D'
  printf '\n%s\n' "$new_block"
} | crontab -

echo "Installed catalog-unifier cron block:"
crontab -l | awk -v b="$begin_marker" -v e="$end_marker" '
  $0==b {show=1}
  show==1 {print}
  $0==e {show=0}
'

