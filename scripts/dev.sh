#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_PORT="${SERVER_PORT:-4000}"
CLIENT_PORT="${CLIENT_PORT:-5173}"

usage() {
  cat <<EOF

============================================
  Nubbi Dev Launcher
============================================

Usage: dev.sh [command]

Commands:
  all      Start both frontend and backend
  server   Start backend server only
  client   Start frontend client only

Examples:
  dev.sh all          - Launch full dev environment
  dev.sh server       - Launch server only
  dev.sh client       - Launch client only

EOF
}

run_server() {
  echo "Starting server (port $SERVER_PORT)..."
  cd "$ROOT/server"
  pnpm dev &
  echo "  Server: http://localhost:$SERVER_PORT"
}

run_client() {
  echo "Starting client (port $CLIENT_PORT)..."
  cd "$ROOT/client"
  pnpm dev &
  echo "  Client: http://localhost:$CLIENT_PORT"
}

CMD="${1:-help}"

case "$CMD" in
  all)
    run_server
    run_client
    wait
    ;;
  server)
    run_server
    wait
    ;;
  client)
    run_client
    wait
    ;;
  *)
    usage
    exit 0
    ;;
esac
