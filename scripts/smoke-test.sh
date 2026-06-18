#!/bin/bash
set -e

BASE_URL="${1:-https://localhost}"

echo "Smoke testing ${BASE_URL}..."

echo "1. Health check"
curl -sfk "${BASE_URL}/health" || curl -sf "${BASE_URL}/health"

echo ""
echo "2. Frontend index"
curl -sfk "${BASE_URL}/" -o /dev/null

echo ""
echo "3. Login endpoint responds"
curl -sfk "${BASE_URL}/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{"email":"admin@diyou.test","password":"wrong"}' -o /dev/null

echo ""
echo "Smoke test passed."
