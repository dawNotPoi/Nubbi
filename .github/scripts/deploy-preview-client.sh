#!/usr/bin/env bash
set -Eeuo pipefail

test -n "${DEPLOY_HOST:-}"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
PREVIEW_WEB_PORT="${PREVIEW_WEB_PORT:-8088}"
PREVIEW_API_PORT="${PREVIEW_API_PORT:-4000}"
PREVIEW_SOCKET_PORT="${PREVIEW_SOCKET_PORT:-4040}"
PREVIEW_TRUSTED_ORIGIN="${PREVIEW_TRUSTED_ORIGIN:-}"
PREVIEW_CONTAINER="nubbi-preview"

validate_port() {
  local name="$1"
  local value="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]] || [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
    printf '[preview] invalid %s: %s\n' "$name" "$value" >&2
    exit 1
  fi
}

validate_port PREVIEW_WEB_PORT "$PREVIEW_WEB_PORT"
validate_port PREVIEW_API_PORT "$PREVIEW_API_PORT"
validate_port PREVIEW_SOCKET_PORT "$PREVIEW_SOCKET_PORT"

if [ "$PREVIEW_WEB_PORT" -lt 1024 ]; then
  printf '[preview] PREVIEW_WEB_PORT must be >= 1024: %s\n' "$PREVIEW_WEB_PORT" >&2
  exit 1
fi

if [ -n "$PREVIEW_TRUSTED_ORIGIN" ] && ! [[ "$PREVIEW_TRUSTED_ORIGIN" =~ ^https?://[A-Za-z0-9._:-]+/?$ ]]; then
  printf '[preview] PREVIEW_TRUSTED_ORIGIN must be a plain http(s) origin\n' >&2
  exit 1
fi
PREVIEW_TRUSTED_ORIGIN="${PREVIEW_TRUSTED_ORIGIN%/}"

if [ ! -f client/dist/index.html ]; then
  printf '[preview] client/dist/index.html is missing; build the client first\n' >&2
  exit 1
fi

# The preview client is built with empty VITE_* URL values, so it talks to
# window.location.origin. Nginx then forwards backend paths to the production
# API/socket ports on the same host. This keeps browser traffic same-origin.
if [ -n "$PREVIEW_TRUSTED_ORIGIN" ]; then
  ORIGIN_HEADERS="    proxy_set_header Origin \"$PREVIEW_TRUSTED_ORIGIN\";\n    proxy_set_header Referer \"$PREVIEW_TRUSTED_ORIGIN/\";"
else
  # The backend treats a missing Origin as server-to-server traffic. This is only
  # a fallback; production CLIENT_URL should normally populate this value.
  ORIGIN_HEADERS='    proxy_set_header Origin "";\n    proxy_set_header Referer "";'
fi

cat > client/nginx.preview.conf <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;
  client_max_body_size 200m;

  location /socket.io/ {
    proxy_pass http://host.docker.internal:${PREVIEW_SOCKET_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port \$server_port;
    proxy_set_header X-Forwarded-Proto \$scheme;
${ORIGIN_HEADERS}
    proxy_read_timeout 75s;
    proxy_send_timeout 75s;
  }

  location ~ ^/(api/auth|auth|note|mcp-api|tag|file|summary|meeting|image)(/|\$) {
    proxy_pass http://host.docker.internal:${PREVIEW_API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port \$server_port;
    proxy_set_header X-Forwarded-Proto \$scheme;
${ORIGIN_HEADERS}
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

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

tar -C client -czf "$RUNNER_TEMP/nubbi-preview.tgz" dist nginx.preview.conf

"$RUNNER_TEMP/preview-ssh" "rm -rf ~/nubbi-preview.next && mkdir -p ~/nubbi-preview.next"
"$RUNNER_TEMP/preview-scp" "$RUNNER_TEMP/nubbi-preview.tgz" "~/nubbi-preview.tgz"

"$RUNNER_TEMP/preview-ssh" "PREVIEW_WEB_PORT='$PREVIEW_WEB_PORT' PREVIEW_API_PORT='$PREVIEW_API_PORT' PREVIEW_SOCKET_PORT='$PREVIEW_SOCKET_PORT' PREVIEW_CONTAINER='$PREVIEW_CONTAINER' bash -s" <<'REMOTE'
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
  --add-host host.docker.internal:host-gateway \
  -p "${PREVIEW_WEB_PORT}:80" \
  -v "$HOME/nubbi-preview/nginx.preview.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$HOME/nubbi-preview/dist:/usr/share/nginx/html:ro" \
  nginx:1.27-alpine >/dev/null

for attempt in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PREVIEW_WEB_PORT}/" >/dev/null; then
    printf '[preview] frontend ready on port %s\n' "$PREVIEW_WEB_PORT"
    docker ps --filter "name=^/${PREVIEW_CONTAINER}$"
    break
  fi
  if [ "$attempt" -eq 20 ]; then
    printf '[preview] frontend health check failed\n' >&2
    docker logs "$PREVIEW_CONTAINER" >&2 || true
    exit 1
  fi
  sleep 1
done

# Verify that the preview Nginx container can reach the host-side production API.
if ! docker exec "$PREVIEW_CONTAINER" wget -qO- "http://host.docker.internal:${PREVIEW_API_PORT}/" >/dev/null; then
  printf '[preview] API upstream is unreachable on host port %s\n' "$PREVIEW_API_PORT" >&2
  docker logs "$PREVIEW_CONTAINER" >&2 || true
  exit 1
fi

printf '[preview] same-origin proxy ready: web=%s api=%s socket=%s\n' \
  "$PREVIEW_WEB_PORT" "$PREVIEW_API_PORT" "$PREVIEW_SOCKET_PORT"
REMOTE
