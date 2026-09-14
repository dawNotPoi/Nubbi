#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="${1:-${DEPLOY_BRANCH:-master}}"
APP_DIR="${APP_DIR:-$(pwd)}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
DEPLOY_SERVICES="${DEPLOY_SERVICES:-client server mcp}"

log() {
  printf '[docker-deploy] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[docker-deploy] missing command: %s\n' "$1" >&2
    exit 1
  fi
}

# 部署辅助函数只定义操作，不在加载时执行部署。
source "$(dirname "${BASH_SOURCE[0]}")/deploy-docker-support.sh"

cd "$APP_DIR"

require_command docker
export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"

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

if has_service client && [ ! -f "client/dist/index.html" ]; then
  printf '[docker-deploy] missing client/dist/index.html\n' >&2
  printf '[docker-deploy] build the client before deploying\n' >&2
  exit 1
fi

preserve_ports

if [ -f turn/.env ]; then
  export COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}meeting"
fi

# 配置文件留在服务器，后端发布时一同启动 TURN；未配置的环境保持原部署范围。
if has_service server && [ -f turn/.env ] && ! has_service turn; then
  DEPLOY_SERVICES="$DEPLOY_SERVICES turn"
fi
if has_service turn; then
  [ -f turn/.env ] || { log "missing turn/.env; initialize TURN first"; exit 1; }
  log "validating TURN configuration before replacing application containers"
  docker compose build turn
  docker compose run --rm --no-deps turn check
  docker compose up -d --no-deps --wait turn
fi

log "selected services: $DEPLOY_SERVICES"

if has_service server || has_service mcp; then
  log "building runtime images sequentially"
  if has_service server; then
    docker compose build server
  fi
  if has_service mcp; then
    docker compose build mcp
  fi
fi

log "starting all containers"
# 镜像先构建完成，再切换容器；2C2G 服务器上避免并行构建造成内存尖峰。
# TURN 已单独更新并检查；不要在后端重启时再次中断正在中继的通话。
runtime_services="${DEPLOY_SERVICES//turn/}"
if [ -n "${runtime_services// /}" ]; then
  docker compose stop $runtime_services || true
  docker compose rm -f $runtime_services || true
fi
docker compose up -d --no-build --remove-orphans $DEPLOY_SERVICES

if command -v curl >/dev/null 2>&1; then
  HEALTHCHECK_URL="$(resolve_healthcheck_url)"
  log "health checking: $HEALTHCHECK_URL"

  for attempt in $(seq 1 20); do
    if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
      break
    fi

    if [ "$attempt" = "20" ]; then
      log "health check failed after $attempt attempts"
      print_diagnostics
      exit 1
    fi

    sleep 3
  done
fi

log "containers"
docker compose ps

log "done"
