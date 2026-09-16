#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://dev.inforvel.online}"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

require_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    red "Falta dependencia requerida: $1"
    exit 1
  }
}

require_bin curl
require_bin jq

check_json_200() {
  local path="$1"
  local body_file="$2"
  local status
  status="$(curl -k -sS -o "$body_file" -w "%{http_code}" "${BASE_URL}${path}")"
  if [[ "$status" != "200" ]]; then
    red "FALLO ${path}: status=${status}"
    cat "$body_file" || true
    exit 1
  fi
  green "OK ${path} -> 200"
}

yellow "Smoke test API catálogo"
check_json_200 "/api/products?per_page=2" "/tmp/smoke_products.json"
PRODUCTS_COUNT="$(jq 'length' /tmp/smoke_products.json)"
if [[ "${PRODUCTS_COUNT}" -lt 1 ]]; then
  red "Catálogo vacío en /api/products"
  exit 1
fi
green "OK /api/products devuelve ${PRODUCTS_COUNT} productos (muestra)"

yellow "Smoke test reacondicionados"
check_json_200 "/api/refurbished" "/tmp/smoke_refurbished.json"
REF_COUNT="$(jq '.products | length' /tmp/smoke_refurbished.json)"
if [[ "${REF_COUNT}" -lt 1 ]]; then
  red "Reacondicionados vacío en /api/refurbished"
  exit 1
fi
green "OK /api/refurbished devuelve ${REF_COUNT} productos"

yellow "Validando cabeceras de seguridad"
HEADERS="$(curl -k -i -sS "${BASE_URL}/api/products?per_page=1")"
echo "$HEADERS" | rg -qi '^strict-transport-security:' || { red "Falta HSTS"; exit 1; }
echo "$HEADERS" | rg -qi '^content-security-policy:' || { red "Falta CSP"; exit 1; }
if echo "$HEADERS" | rg -qi '^x-powered-by:'; then
  red "X-Powered-By expuesto"
  exit 1
fi
green "OK cabeceras de seguridad"

yellow "Validando render página reacondicionados"
PAGE_STATUS="$(curl -k -sS -o /tmp/smoke_reacondicionados.html -w "%{http_code}" "${BASE_URL}/reacondicionados")"
if [[ "$PAGE_STATUS" != "200" ]]; then
  red "FALLO /reacondicionados status=${PAGE_STATUS}"
  exit 1
fi
if ! rg -q "Productos Reacondicionados" /tmp/smoke_reacondicionados.html; then
  red "No aparece cabecera esperada en /reacondicionados"
  exit 1
fi
green "OK /reacondicionados renderiza correctamente"

green "Smoke test completado sin fallos"
