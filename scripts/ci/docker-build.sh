#!/usr/bin/env bash
set -euo pipefail

if [[ "${#}" -ne 2 ]]; then
  echo "Usage: $0 <ECR_REGISTRY> <IMAGE_TAG>" >&2
  echo "Example: $0 123456789012.dkr.ecr.us-east-1.amazonaws.com v1.2.3" >&2
  exit 1
fi

ECR_REGISTRY="${1%/}"
IMAGE_TAG="$2"

SERVICES=(
  api-gateway
  auth-service
  user-service
  project-service
  ai-service
  rag-service
  billing-service
  notification-service
  analytics-service
)

build_and_push() {
  local svc="$1"
  echo "→ Building ${svc}…"
  if ! docker build -t "${ECR_REGISTRY}/${svc}:${IMAGE_TAG}" -t "${ECR_REGISTRY}/${svc}:latest" "./services/${svc}"; then
    echo "✗ Docker build failed for ${svc}" >&2
    exit 1
  fi
  echo "→ Pushing ${svc}:${IMAGE_TAG} and :latest…"
  docker push "${ECR_REGISTRY}/${svc}:${IMAGE_TAG}"
  docker push "${ECR_REGISTRY}/${svc}:latest"
  echo "✓ ${svc} build and push complete"
}

if docker buildx version >/dev/null 2>&1; then
  echo "Using parallel docker build (buildx available)…"
  pids=()
  for svc in "${SERVICES[@]}"; do
    (
      build_and_push "${svc}" || exit 1
    ) &
    pids+=("$!")
  done
  for pid in "${pids[@]}"; do
    if ! wait "${pid}"; then
      echo "✗ One or more parallel image builds failed." >&2
      exit 1
    fi
  done
else
  echo "docker buildx not available — building images sequentially…"
  for svc in "${SERVICES[@]}"; do
    build_and_push "${svc}"
  done
fi

echo "✓ All service images built and pushed."
