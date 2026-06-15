#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/pet-store"
COMPOSE_FILE="deploy/production/docker-compose.yml"
ENV_FILE="deploy/production/.env.production"
BRANCH="${1:-main}"

echo "=== Pet Store Deployment ==="
echo "Target: $APP_DIR"
echo "Branch: $BRANCH"

if [ ! -d "$APP_DIR" ]; then
    echo "Error: $APP_DIR does not exist. Clone the repo first."
    exit 1
fi

cd "$APP_DIR"

echo "--- Pulling latest code ---"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: $ENV_FILE not found. Copying from example..."
    cp deploy/production/.env.production.example "$ENV_FILE"
    echo "Please edit $ENV_FILE with production secrets and re-run this script."
    exit 1
fi

echo "--- Building and starting services ---"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "--- Running health checks ---"
sleep 5
./deploy/scripts/healthcheck.sh

echo "=== Deployment complete ==="
