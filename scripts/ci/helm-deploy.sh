#!/usr/bin/env bash
# Helm upgrade --install per service; on failure, helm rollback for that service only.
#
# Env:
#   IMAGE_TAG    — image tag (github.sha in CD)
#   HELM_NAMESPACE — default user-services
#
# Charts: infra/helm/charts/<service>
set -euo pipefail

NAMESPACE="${HELM_NAMESPACE:-user-services}"
TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
CHART_ROOT="${CHART_ROOT:-infra/helm/charts}"

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

for svc in "${SERVICES[@]}"; do
  chart="${CHART_ROOT}/${svc}"
  if [ ! -d "${chart}" ]; then
    echo "::warning::Chart not found at ${chart} — skipping ${svc}"
    continue
  fi
  echo "==> helm upgrade --install ${svc}"
  if ! helm upgrade --install "${svc}" "${chart}" \
    --namespace "${NAMESPACE}" \
    --create-namespace \
    --set "image.tag=${TAG}" \
    --wait \
    --timeout 5m
  then
    echo "::error::Deploy failed for ${svc} — rolling back"
    helm rollback "${svc}" --namespace "${NAMESPACE}" --wait --timeout 5m || true
    exit 1
  fi
done

echo "Helm deploy finished successfully."
