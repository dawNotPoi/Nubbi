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

require_command docker

log "deploying branch: $BRANCH"
if [ "${SKIP_GIT_UPDATE:-0}" = "1" ]; then
  log "skipping git update"
else
  require_command git
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

if [ ! -f "server/.env" ]; then
  printf '[docker-deploy] missing server/.env\n' >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  printf '[docker-deploy] missing .env\n' >&2
  exit 1
fi

if [ ! -f "client/dist/index.html" ]; then
  printf '[docker-deploy] missing client/dist/index.html\n' >&2
  printf '[docker-deploy] build the client before deploying: pnpm --dir client build\n' >&2
  exit 1
fi

log "building and starting client and server containers"
docker compose up -d --build --remove-orphans client server

if command -v curl >/dev/null 2>&1; then
  log "health checking: $HEALTHCHECK_URL"
  curl -fsS --retry 10 --retry-delay 3 "$HEALTHCHECK_URL" >/dev/null
fi

log "containers"
docker compose ps

log "done"
