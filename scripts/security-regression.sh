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

assert_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local data="${4:-}"
  local status

  if [[ -n "$data" ]]; then
    status="$(curl -k -sS -o /tmp/qa_body.json -w "%{http_code}" -X "$method" \
      "${BASE_URL}${path}" -H "Content-Type: application/json" --data "$data")"
  else
    status="$(curl -k -sS -o /tmp/qa_body.json -w "%{http_code}" -X "$method" \
      "${BASE_URL}${path}")"
  fi

  if [[ "$status" != "$expected" ]]; then
    red "FALLO ${method} ${path}: esperado=${expected} obtenido=${status}"
    cat /tmp/qa_body.json || true
    exit 1
  fi

  green "OK ${method} ${path} -> ${status}"
}

yellow "Validando controles de acceso críticos en ${BASE_URL}"
assert_status "GET" "/api/orders" "401"
assert_status "GET" "/api/points?customerId=1" "401"
assert_status "POST" "/api/points" "403" '{"customerId":1,"points":5,"reason":"qa-test"}'
assert_status "POST" "/api/products/324097/reviews" "401" '{"review":"qa","reviewer":"qa","rating":5}'
assert_status "GET" "/api/me?email=admin@inforvel.online" "401"

yellow "Validando que PaymentIntent no confía en amount del cliente"
PRODUCT_ID="$(curl -k -sS "${BASE_URL}/api/products?per_page=1" | jq -r '.[0].id // empty')"
if [[ -z "${PRODUCT_ID}" ]]; then
  red "No se pudo obtener product_id para test de payment intent"
  exit 1
fi

PI_BODY="$(curl -k -sS -X POST "${BASE_URL}/api/create-payment-intent" \
  -H "Content-Type: application/json" \
  --data "{\"amount\":1,\"currency\":\"eur\",\"line_items\":[{\"product_id\":${PRODUCT_ID},\"quantity\":1}]}")"

PI_ID="$(echo "$PI_BODY" | jq -r '.paymentIntentId // empty')"
PI_AMOUNT="$(echo "$PI_BODY" | jq -r '.amount // 0')"

if [[ -z "${PI_ID}" ]]; then
  red "PaymentIntent no devuelto correctamente"
  echo "$PI_BODY"
  exit 1
fi

if [[ "${PI_AMOUNT}" -le 1 ]]; then
  red "El amount parece manipulable (amount=${PI_AMOUNT})"
  echo "$PI_BODY"
  exit 1
fi

green "OK create-payment-intent recalcula amount en servidor (amount=${PI_AMOUNT})"
green "Security regression completado sin fallos"
