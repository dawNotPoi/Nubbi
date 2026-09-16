#!/usr/bin/env bash
set -euo pipefail

# 统一委托根脚本，保持各平台启动范围和退出信号一致。
cd "$(dirname "$0")/.."
case "${1:-help}" in
  all) exec pnpm dev:all ;;
  blog) exec pnpm dev:blog ;;
  blog-full) exec pnpm dev:blog:full ;;
  server) exec pnpm dev:server ;;
  client) exec pnpm dev:client ;;
  *)
    echo "Usage: bash scripts/dev.sh [all|blog|blog-full|server|client]"
    echo "Blog: http://localhost:3002"
    echo "Client: http://localhost:5173"
    echo "Server: http://localhost:4000"
    ;;
esac
