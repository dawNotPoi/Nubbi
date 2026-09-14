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

get_env_value() {
  awk -F= -v key="$1" '
    $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' .env 2>/dev/null || true
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp

  tmp="$(mktemp)"

  if awk -F= -v key="$key" '$1 == key { found = 1 } END { exit(found ? 0 : 1) }' .env; then
    awk -F= -v key="$key" -v value="$value" '
      $1 == key && !done {
        print key "=" value
        done = 1
        next
      }
      $1 == key {
        next
      }
      {
        print
      }
    ' .env >"$tmp"
  else
    cat .env >"$tmp"
    printf '%s=%s\n' "$key" "$value" >>"$tmp"
  fi

  mv "$tmp" .env
}

get_mapped_port() {
  local service="$1"
  local container_port="$2"
  local mapped_port
  mapped_port="$(docker compose port "$service" "$container_port" 2>/dev/null | tail -n 1 || true)"

  if [ -n "$mapped_port" ]; then
    printf '%s\n' "${mapped_port##*:}"
  fi

  return 0
}

preserve_port() {
  local env_key="$1"
  local service="$2"
  local container_port="$3"
  local default_port="$4"
  local configured_port
  configured_port="${!env_key:-$(get_env_value "$env_key" || true)}"

  if [ -n "$configured_port" ]; then
    log "using configured $env_key: $configured_port"
    return
  fi

  local mapped_port
  mapped_port="$(get_mapped_port "$service" "$container_port")"

  if [ -z "$mapped_port" ]; then
    log "$env_key is not set; using docker-compose default port $default_port"
    return
  fi

  log "preserving existing $env_key mapping: $mapped_port"
  set_env_value "$env_key" "$mapped_port"
}

preserve_ports() {
  preserve_port WEB_PORT client 80 80
  preserve_port SERVER_PORT server 4000 4000
  preserve_port SOCKET_PORT server 4040 4040
  preserve_port MCP_PORT mcp 3100 3100
}

has_service() {
  case " $DEPLOY_SERVICES " in
    *" $1 "*) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_healthcheck_url() {
  if [ -n "$HEALTHCHECK_URL" ]; then
    printf '%s\n' "$HEALTHCHECK_URL"
    return
  fi

  if ! has_service client && has_service mcp && ! has_service server; then
    local mcp_port
    mcp_port="${MCP_PORT:-$(get_env_value MCP_PORT || true)}"
    printf 'http://127.0.0.1:%s/health\n' "${mcp_port:-3100}"
    return
  fi

  if ! has_service client && has_service server && ! has_service mcp; then
    local server_port
    server_port="${SERVER_PORT:-$(get_env_value SERVER_PORT || true)}"
    printf 'http://127.0.0.1:%s/\n' "${server_port:-4000}"
    return
  fi

  local mapped_port
  mapped_port="$(get_mapped_port client 80)"

  if [ -n "$mapped_port" ]; then
    printf 'http://127.0.0.1:%s/\n' "$mapped_port"
    return
  fi

  local env_port
  env_port="${WEB_PORT:-$(get_env_value WEB_PORT || true)}"
  printf 'http://127.0.0.1:%s/\n' "${env_port:-80}"
}

print_diagnostics() {
  log "containers"
  docker compose ps || true
  log "client logs"
  docker compose logs --tail 80 client || true
  log "server logs"
  docker compose logs --tail 80 server || true
  log "mcp logs"
  docker compose logs --tail 80 mcp || true
}

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
docker compose stop $DEPLOY_SERVICES || true
docker compose rm -f $DEPLOY_SERVICES || true
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
