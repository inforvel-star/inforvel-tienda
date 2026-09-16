#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://dev.inforvel.online}"

echo "[gate] Typecheck"
npm run typecheck

echo "[gate] Build"
npm run build

echo "[gate] Security regression (${BASE_URL})"
bash scripts/security-regression.sh "${BASE_URL}"

echo "[gate] Smoke (${BASE_URL})"
bash scripts/smoke-dev.sh "${BASE_URL}"

echo "[gate] OK: dev gate completado"
