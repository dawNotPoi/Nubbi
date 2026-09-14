#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="${1:-${DEPLOY_BRANCH:-master}}"
APP_DIR="${APP_DIR:-$(pwd)}"
PM2_SERVICE_NAME="${PM2_SERVICE_NAME:-d-note-api}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:4000/}"
RELOAD_NGINX="${RELOAD_NGINX:-0}"

log() {
  printf '[deploy] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[deploy] missing command: %s\n' "$1" >&2
    exit 1
  fi
}

cd "$APP_DIR"

require_command git
require_command node

if ! command -v pnpm >/dev/null 2>&1; then
  require_command corepack
  log "pnpm not found, enabling corepack"
  corepack enable
fi

require_command pnpm
require_command pm2

log "deploying branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f "client/.env.production" ]; then
  printf '[deploy] missing client/.env.production\n' >&2
  exit 1
fi

if [ ! -f "server/.env" ]; then
  printf '[deploy] missing server/.env\n' >&2
  exit 1
fi

log "installing and building client"
pnpm --dir client install --frozen-lockfile
pnpm --dir client build

log "installing server dependencies"
pnpm --dir server install --frozen-lockfile --prod

log "starting or restarting pm2 service: $PM2_SERVICE_NAME"
if pm2 describe "$PM2_SERVICE_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_SERVICE_NAME" --update-env
else
  pm2 start pnpm --name "$PM2_SERVICE_NAME" --cwd "$APP_DIR/server" -- start
fi
pm2 save >/dev/null || true

if [ "$RELOAD_NGINX" = "1" ]; then
  log "reloading nginx"
  sudo nginx -t
  sudo systemctl reload nginx
fi

if command -v curl >/dev/null 2>&1; then
  log "health checking: $HEALTHCHECK_URL"
  curl -fsS --retry 5 --retry-delay 2 "$HEALTHCHECK_URL" >/dev/null
fi

log "done"
