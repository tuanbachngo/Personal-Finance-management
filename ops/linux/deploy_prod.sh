#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ACTION="${1:-deploy}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example to ${ENV_FILE} first." >&2
  exit 1
fi

run_compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

case "$ACTION" in
  build)
    run_compose build
    ;;
  reset-db)
    run_compose build
    run_compose run --rm db-reset-remote
    ;;
  apply-views)
    run_compose build
    run_compose run --rm db-apply-views-remote
    ;;
  bootstrap)
    run_compose build
    run_compose run --rm bootstrap-admin
    ;;
  smoke)
    run_compose build
    run_compose run --rm smoke-test
    ;;
  deploy)
    run_compose build
    run_compose up -d app caddy
    ;;
  first-start)
    run_compose build
    run_compose run --rm db-reset-remote
    run_compose run --rm bootstrap-admin
    run_compose up -d app caddy
    ;;
  *)
    echo "Usage: sh ops/linux/deploy_prod.sh [build|reset-db|apply-views|bootstrap|smoke|deploy|first-start]" >&2
    exit 1
    ;;
esac
