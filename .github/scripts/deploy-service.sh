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

node <<'NODE'
const fs = require('fs');
const path = require('path');

const rootEnv = {
  VITE_API_URL: process.env.VITE_API_URL,
  VITE_AUTH_URL: process.env.VITE_AUTH_URL,
  VITE_SOCKET_URL: process.env.VITE_SOCKET_URL,
  MONGO_URI: process.env.MONGO_URI,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_GOOLE_ID: process.env.AUTH_GOOLE_ID || '',
  AUTH_GOOLE_SECRET: process.env.AUTH_GOOLE_SECRET || '',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || '',
  AI_CONFIG_SECRET: process.env.AI_CONFIG_SECRET || '',
  GH_IMAGE_REPO: process.env.GH_IMAGE_REPO || '',
  GH_IMAGE_TOKEN: process.env.GH_IMAGE_TOKEN || '',
  GH_IMAGE_BRANCH: process.env.GH_IMAGE_BRANCH || 'main',
  WEB_SEARCH_PROVIDER: process.env.WEB_SEARCH_PROVIDER || '',
  WEB_SEARCH_API_KEY: process.env.WEB_SEARCH_API_KEY || '',
  WEB_SEARCH_BASE_URL: process.env.WEB_SEARCH_BASE_URL || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '',
  SMTP_SECURE: process.env.SMTP_SECURE || '',
};

for (const key of [
  'WEB_PORT',
  'SERVER_PORT',
  'SOCKET_PORT',
  'MCP_PORT',
  'MCP_BIND_ADDRESS',
  'MCP_ALLOWED_HOSTS',
  'MCP_ALLOWED_ORIGINS',
]) {
  if (process.env[key]) rootEnv[key] = process.env[key];
}

const serialize = (value) => JSON.stringify(String(value ?? ''));
const render = (env) =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${serialize(value)}`)
    .join('\n') + '\n';

const content = render(rootEnv);
fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'nubbi.root.env'), content);
fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'nubbi.server.env'), content);
NODE

tar \
  --exclude='.git' \
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

# A server-only or MCP-only release does not download a new client artifact.
# Keep the currently deployed client build available for future Compose operations.
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
