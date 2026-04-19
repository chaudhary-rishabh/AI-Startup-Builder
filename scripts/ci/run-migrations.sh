#!/usr/bin/env bash
# Run db:migrate for each microservice (Drizzle). api-gateway has no migrations — skipped.
#
# Secrets / env: DATABASE_URL (set in CI for integration; production migrate job).
set -euo pipefail

SERVICES=(
  api-gateway
  auth-service
  billing-service
  user-service
  project-service
  ai-service
  analytics-service
  rag-service
  notification-service
)

for service in "${SERVICES[@]}"; do
  if [ "${service}" = "api-gateway" ]; then
    echo "==> skip ${service} (no db:migrate)"
    continue
  fi
  echo "==> pnpm --filter @ai-startup-builder/${service} db:migrate"
  pnpm --filter "@ai-startup-builder/${service}" db:migrate
done
