#!/usr/bin/env bash
set -Eeuo pipefail

test -n "${DEPLOY_HOST:-}"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
PREVIEW_WEB_PORT="${PREVIEW_WEB_PORT:-8088}"
PREVIEW_CONTAINER="nubbi-preview"

if ! [[ "$PREVIEW_WEB_PORT" =~ ^[0-9]+$ ]] || [ "$PREVIEW_WEB_PORT" -lt 1024 ] || [ "$PREVIEW_WEB_PORT" -gt 65535 ]; then
  printf '[preview] invalid PREVIEW_WEB_PORT: %s\n' "$PREVIEW_WEB_PORT" >&2
  exit 1
fi

if [ ! -f client/dist/index.html ]; then
  printf '[preview] client/dist/index.html is missing; build the client first\n' >&2
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  printf '%s\n' "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key
  chmod 600 ~/.ssh/deploy_key
elif [ -z "${DEPLOY_PASSWORD:-}" ]; then
  printf '[preview] missing DEPLOY_SSH_KEY or DEPLOY_PASSWORD\n' >&2
  exit 1
fi

ssh-keyscan -p "$DEPLOY_PORT" "$DEPLOY_HOST" >> ~/.ssh/known_hosts

if [ -z "${DEPLOY_SSH_KEY:-}" ]; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq sshpass
fi

cat > "$RUNNER_TEMP/preview-ssh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
if [ -f "$HOME/.ssh/deploy_key" ]; then
  exec ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -i "$HOME/.ssh/deploy_key" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "$@"
fi
exec sshpass -p "$DEPLOY_PASSWORD" ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "$@"
SH

cat > "$RUNNER_TEMP/preview-scp" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
source_path="$1"
target_path="$2"
if [ -f "$HOME/.ssh/deploy_key" ]; then
  exec scp -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -i "$HOME/.ssh/deploy_key" -P "$DEPLOY_PORT" "$source_path" "$DEPLOY_USER@$DEPLOY_HOST:$target_path"
fi
exec sshpass -p "$DEPLOY_PASSWORD" scp -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -P "$DEPLOY_PORT" "$source_path" "$DEPLOY_USER@$DEPLOY_HOST:$target_path"
SH

chmod +x "$RUNNER_TEMP/preview-ssh" "$RUNNER_TEMP/preview-scp"

tar -C client -czf "$RUNNER_TEMP/nubbi-preview.tgz" dist nginx.conf

"$RUNNER_TEMP/preview-ssh" "rm -rf ~/nubbi-preview.next && mkdir -p ~/nubbi-preview.next"
"$RUNNER_TEMP/preview-scp" "$RUNNER_TEMP/nubbi-preview.tgz" "~/nubbi-preview.tgz"

"$RUNNER_TEMP/preview-ssh" "PREVIEW_WEB_PORT='$PREVIEW_WEB_PORT' PREVIEW_CONTAINER='$PREVIEW_CONTAINER' bash -s" <<'REMOTE'
set -Eeuo pipefail

rm -rf ~/nubbi-preview.next
mkdir -p ~/nubbi-preview.next
tar -xzf ~/nubbi-preview.tgz -C ~/nubbi-preview.next
rm -f ~/nubbi-preview.tgz

if docker ps -a --format '{{.Names}}' | grep -qx "$PREVIEW_CONTAINER"; then
  docker rm -f "$PREVIEW_CONTAINER" >/dev/null
fi

rm -rf ~/nubbi-preview.prev
if [ -d ~/nubbi-preview ]; then
  mv ~/nubbi-preview ~/nubbi-preview.prev
fi
mv ~/nubbi-preview.next ~/nubbi-preview

docker run -d \
  --name "$PREVIEW_CONTAINER" \
  --restart unless-stopped \
  -p "${PREVIEW_WEB_PORT}:80" \
  -v "$HOME/nubbi-preview/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$HOME/nubbi-preview/dist:/usr/share/nginx/html:ro" \
  nginx:1.27-alpine >/dev/null

for attempt in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PREVIEW_WEB_PORT}/" >/dev/null; then
    printf '[preview] ready on port %s\n' "$PREVIEW_WEB_PORT"
    docker ps --filter "name=^/${PREVIEW_CONTAINER}$"
    exit 0
  fi
  sleep 1
done

printf '[preview] health check failed\n' >&2
docker logs "$PREVIEW_CONTAINER" >&2 || true
exit 1
REMOTE
