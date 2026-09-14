#!/usr/bin/env bash
set -Eeuo pipefail

test -n "${DEPLOY_HOST:-}"
test -n "${DEPLOY_SERVICE:-}"

mkdir -p ~/.ssh
if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  printf '%s\n' "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key
  chmod 600 ~/.ssh/deploy_key
elif [ -z "${DEPLOY_PASSWORD:-}" ]; then
  printf '[deploy] missing DEPLOY_SSH_KEY or DEPLOY_PASSWORD\n' >&2
  exit 1
fi
ssh-keyscan -p "$DEPLOY_PORT" "$DEPLOY_HOST" >> ~/.ssh/known_hosts

sudo apt-get update
sudo apt-get install -y sshpass

cat > "$RUNNER_TEMP/ssh-run" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
if [ -f "$HOME/.ssh/deploy_key" ]; then
  exec ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -i "$HOME/.ssh/deploy_key" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "$@"
fi
exec sshpass -p "$DEPLOY_PASSWORD" ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "$@"
SH

cat > "$RUNNER_TEMP/scp-run" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
source_path="$1"
target_path="$2"
if [ -f "$HOME/.ssh/deploy_key" ]; then
  exec scp -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -i "$HOME/.ssh/deploy_key" -P "$DEPLOY_PORT" "$source_path" "$DEPLOY_USER@$DEPLOY_HOST:$target_path"
fi
exec sshpass -p "$DEPLOY_PASSWORD" scp -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -P "$DEPLOY_PORT" "$source_path" "$DEPLOY_USER@$DEPLOY_HOST:$target_path"
SH

chmod +x "$RUNNER_TEMP/ssh-run" "$RUNNER_TEMP/scp-run"

if [ "${DEPLOY_SYNC:-1}" != "0" ]; then
required_vars=(
  DEPLOY_HOST
  MONGO_URI
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  CLIENT_URL
  AUTH_GITHUB_ID
  AUTH_GITHUB_SECRET
  AUTH_GOOGLE_ID
  AUTH_GOOGLE_SECRET
  EMAIL_USER
  EMAIL_PASS
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    printf '[deploy] missing required env: %s\n' "$name" >&2
    exit 1
  fi
done

node .github/scripts/render-deploy-env.cjs

tar \
  --exclude='.git' \
  --exclude='turn/.env' \
  --exclude='turn/certs' \
  --exclude='.tmp' \
  --exclude='client/node_modules' \
  --exclude='server/node_modules' \
  --exclude='mcp/node_modules' \
  --exclude='mcp/dist' \
  --exclude='server/storage' \
  --exclude='.pnpm-store' \
  --exclude='*.log' \
  -czf "$RUNNER_TEMP/nubbi-release.tgz" .

"$RUNNER_TEMP/ssh-run" \
  "rm -rf ~/nubbi-deploy.next && mkdir -p ~/nubbi-deploy.next ~/nubbi-deploy/server"

"$RUNNER_TEMP/scp-run" \
  "$RUNNER_TEMP/nubbi-release.tgz" \
  "~/nubbi-release.tgz"

"$RUNNER_TEMP/ssh-run" \
  "bash -s" <<'REMOTE'
set -Eeuo pipefail

tar -xzf ~/nubbi-release.tgz -C ~/nubbi-deploy.next
rm -f ~/nubbi-release.tgz

if [ -f ~/nubbi-deploy/.env ]; then
  cp -f ~/nubbi-deploy/.env ~/nubbi-deploy.next/.env
fi

mkdir -p ~/nubbi-deploy.next/server
if [ -f ~/nubbi-deploy/server/.env ]; then
  cp -f ~/nubbi-deploy/server/.env ~/nubbi-deploy.next/server/.env
fi

# TURN 配置与私钥不随发布包分发，目录切换时只保留服务器现有内容。
mkdir -p ~/nubbi-deploy.next/turn/certs
if [ -f ~/nubbi-deploy/turn/.env ]; then
  cp -p ~/nubbi-deploy/turn/.env ~/nubbi-deploy.next/turn/.env
fi
if [ -d ~/nubbi-deploy/turn/certs ]; then
  cp -aL ~/nubbi-deploy/turn/certs/. ~/nubbi-deploy.next/turn/certs/
fi

# 后端或 MCP 单独发布时，保留当前客户端构建产物。
if [ ! -f ~/nubbi-deploy.next/client/dist/index.html ] && [ -d ~/nubbi-deploy/client/dist ]; then
  mkdir -p ~/nubbi-deploy.next/client/dist
  cp -a ~/nubbi-deploy/client/dist/. ~/nubbi-deploy.next/client/dist/
fi

rm -rf ~/nubbi-deploy.prev
if [ -d ~/nubbi-deploy ]; then
  mv ~/nubbi-deploy ~/nubbi-deploy.prev
fi
mv ~/nubbi-deploy.next ~/nubbi-deploy
REMOTE

"$RUNNER_TEMP/ssh-run" \
  "mkdir -p ~/nubbi-deploy/server"

"$RUNNER_TEMP/scp-run" \
  "$RUNNER_TEMP/nubbi.root.env" \
  "~/nubbi-deploy/.env.generated"

"$RUNNER_TEMP/ssh-run" \
  "bash -s" <<'REMOTE'
set -Eeuo pipefail

cd ~/nubbi-deploy

preserve_env_value() {
  key="$1"

  if [ ! -f .env ] || grep -q "^${key}=" .env.generated; then
    return
  fi

  existing_value="$(awk -F= -v key="$key" '$1 == key { print; exit }' .env)"

  if [ -n "$existing_value" ]; then
    printf '%s\n' "$existing_value" >> .env.generated
  fi
}

for key in WEB_PORT SERVER_PORT SOCKET_PORT MCP_PORT MCP_BIND_ADDRESS MCP_ALLOWED_HOSTS MCP_ALLOWED_ORIGINS; do
  preserve_env_value "$key"
done

mv .env.generated .env
REMOTE

"$RUNNER_TEMP/scp-run" \
  "$RUNNER_TEMP/nubbi.server.env" \
  "~/nubbi-deploy/server/.env"
fi

"$RUNNER_TEMP/ssh-run" \
  "cd ~/nubbi-deploy && SKIP_GIT_UPDATE=1 DEPLOY_SERVICES='$DEPLOY_SERVICE' DEPLOY_BRANCH='$DEPLOY_BRANCH' bash scripts/deploy-docker.sh '$DEPLOY_BRANCH'"
