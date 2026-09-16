#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="/var/www/frontend-dev"
LOG_DIR="$FRONTEND_DIR/logs"
LOG_FILE="$LOG_DIR/blog-autopublish-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

cd "$FRONTEND_DIR"

{
  echo "============================="
  echo "📰 Blog autopublish started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "============================="
  npm run blog:autopublish
  echo "✅ Blog autopublish completed: $(date '+%Y-%m-%d %H:%M:%S')"
} >> "$LOG_FILE" 2>&1
