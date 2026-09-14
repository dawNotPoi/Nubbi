#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="${1:-${DEPLOY_BRANCH:-master}}"
APP_DIR="${APP_DIR:-$(pwd)}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"

log() {
  printf '[docker-deploy] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[docker-deploy] missing command: %s\n' "$1" >&2
    exit 1
  fi
}

cd "$APP_DIR"

require_command git
require_command docker

log "deploying branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f "server/.env" ]; then
  printf '[docker-deploy] missing server/.env\n' >&2
  exit 1
fi

log "building and starting containers"
docker compose up -d --build --remove-orphans

if command -v curl >/dev/null 2>&1; then
  log "health checking: $HEALTHCHECK_URL"
  curl -fsS --retry 10 --retry-delay 3 "$HEALTHCHECK_URL" >/dev/null
fi

log "containers"
docker compose ps

log "done"
