#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://api.pawpalai.cn}"
PASS_COUNT=0
FAIL_COUNT=0

check_endpoint() {
    local url="$1"
    local expected_code="${2:-200}"
    local label="${3:-$url}"

    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 2>/dev/null || echo "000")

    if [ "$status_code" = "$expected_code" ]; then
        echo "  ✓ $label ($status_code)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "  ✗ $label (expected $expected_code, got $status_code)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

echo "=== Health Check: $BASE_URL ==="

check_endpoint "$BASE_URL/health" 200 "Health endpoint"
check_endpoint "$BASE_URL/v1/categories" 200 "Categories endpoint"
check_endpoint "$BASE_URL/metrics" 200 "Metrics endpoint"

echo ""
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
