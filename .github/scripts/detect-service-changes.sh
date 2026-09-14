#!/usr/bin/env bash
set -Eeuo pipefail

client=false
server=false
mcp=false
lockfile_changed=false
non_lockfile_changed=false
reason="changed files"

mark_all() {
  client=true
  server=true
  mcp=true
}

is_zero_sha() {
  case "$1" in
    ""|0000000000000000000000000000000000000000) return 0 ;;
    *) return 1 ;;
  esac
}

if [ "${FORCE_ALL:-0}" = "1" ]; then
  reason="manual deployment"
  mark_all
elif is_zero_sha "${BASE_SHA:-}" || is_zero_sha "${HEAD_SHA:-}"; then
  reason="missing comparison commit"
  mark_all
else
  if [ "${EVENT_NAME:-}" = "pull_request" ]; then
    diff_args=("${BASE_SHA}...${HEAD_SHA}")
  else
    diff_args=("${BASE_SHA}" "${HEAD_SHA}")
  fi

  while IFS= read -r path; do
    if [ "$path" = "pnpm-lock.yaml" ]; then
      lockfile_changed=true
    else
      non_lockfile_changed=true
    fi

    case "$path" in
      client/*) client=true ;;
      server/*) server=true ;;
      turn/*|scripts/turn/*) server=true ;;
      mcp/*) mcp=true ;;
      .dockerignore|docker-compose.yml|package.json|pnpm-workspace.yaml)
        mark_all
        ;;
      .github/workflows/deploy.yml|.github/scripts/*|scripts/deploy-docker*.sh)
        mark_all
        ;;
    esac
  done < <(git diff --name-only "${diff_args[@]}")

  if [ "$lockfile_changed" = "true" ] && [ "$non_lockfile_changed" = "false" ]; then
    reason="lockfile-only change"
    mark_all
  fi
fi

any=false
if [ "$client" = "true" ] || [ "$server" = "true" ] || [ "$mcp" = "true" ]; then
  any=true
fi

{
  printf 'client=%s\n' "$client"
  printf 'server=%s\n' "$server"
  printf 'mcp=%s\n' "$mcp"
  printf 'any=%s\n' "$any"
} >> "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

printf '[changes] client=%s server=%s mcp=%s (%s)\n' \
  "$client" "$server" "$mcp" "$reason"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    printf '### Service change detection\n\n'
    printf '| Service | Changed |\n'
    printf '| --- | --- |\n'
    printf '| Client | `%s` |\n' "$client"
    printf '| Server | `%s` |\n' "$server"
    printf '| MCP | `%s` |\n' "$mcp"
    printf '\nReason: %s.\n' "$reason"
  } >> "$GITHUB_STEP_SUMMARY"
fi
