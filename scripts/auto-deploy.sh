#!/bin/bash
# auto-deploy.sh — Inforvel automatic build & restart
# Runs at 7:00 AM and 7:00 PM via cron

LOG_DIR="/var/www/frontend/logs"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y-%m-%d).log"
FRONTEND_DIR="/var/www/frontend"

mkdir -p "$LOG_DIR"

echo "=============================" >> "$LOG_FILE"
echo "🚀 Deploy started: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "=============================" >> "$LOG_FILE"

cd "$FRONTEND_DIR" || { echo "❌ Could not cd to $FRONTEND_DIR" >> "$LOG_FILE"; exit 1; }

# Build
echo "📦 Running npm run build..." >> "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Build FAILED — skipping restart. Check log above." >> "$LOG_FILE"
  exit 1
fi

echo "✅ Build succeeded." >> "$LOG_FILE"

# Restart PM2 as the inforvel user
echo "🔄 Restarting PM2..." >> "$LOG_FILE"
sudo -u inforvel /usr/bin/pm2 restart all >> "$LOG_FILE" 2>&1

echo "✅ Deploy complete: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"

# Keep only last 14 days of logs
find "$LOG_DIR" -name "deploy-*.log" -mtime +14 -delete
