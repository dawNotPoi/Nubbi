# Deployment

The default deployment path is Docker Compose, triggered by GitHub Actions over
SSH.

## Server prerequisites

Install these on the server:

- Git
- Docker Engine
- Docker Compose plugin

Clone the repository on the server:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/weixiaoing/D-NOTE.git
cd D-NOTE
```

Create `server/.env` on the server. This file must not be committed.

For the MongoDB container included in `docker-compose.yml`, use this Mongo URI:

```env
MONGO_URI=mongodb://mongo:27017/d-note
SERVER_PORT=4000
SOCKET_PORT=4040
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://your-domain-or-ip
CLIENT_URL=http://your-domain-or-ip
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

Optional root `.env` values for Docker Compose:

```env
WEB_PORT=80
```

The frontend is built before it is uploaded to the server. The frontend Nginx
container only serves the already-built `client/dist` files, proxies API routes
to the server container, and proxies `/socket.io` to the Socket.IO port.

Do not put high-privilege secrets in `VITE_` variables. Vite embeds them into
browser assets. If `VITE_GITHUB_TOKEN` is still needed, use a minimal-scope token
or move the upload flow behind the server later.

Run the first Docker deployment manually once:

```bash
bash scripts/deploy-docker.sh master
```

## GitHub secrets

Set these in GitHub repository settings:

- `DEPLOY_HOST`: server IP or domain
- `DEPLOY_USER`: SSH user
- `DEPLOY_SSH_KEY`: private key that can SSH into the server
- `DEPLOY_PATH`: repository path on the server, for example `/var/www/D-NOTE`
- `DEPLOY_PORT`: optional SSH port, defaults to `22`

## Deploy flow

Push to `master` to trigger deployment.

The workflow:

1. Checks out the target branch.
2. Installs client dependencies.
3. Builds the client.
4. Installs server dependencies.
5. SSHs into the server.
6. Runs `scripts/deploy-docker.sh`.

The Docker deploy script:

1. Pulls the latest branch with `git pull --ff-only`, unless the release bundle
   was uploaded by GitHub Actions.
2. Verifies `client/dist/index.html` exists.
3. Builds only the runtime Docker images and starts the containers.
4. Checks the frontend URL.
5. Prints `docker compose ps`.

## Manual commands

Deploy:

```bash
pnpm --dir client install --frozen-lockfile
pnpm --dir client build

# Upload this repository, including client/dist, to the server first.
cd /var/www/D-NOTE
bash scripts/deploy-docker.sh master
```

View logs:

```bash
docker compose logs -f server
docker compose logs -f client
```

Restart:

```bash
docker compose restart
```

Stop:

```bash
docker compose down
```

Keep the volumes unless you intentionally want to remove uploaded files and the
MongoDB data.

## PM2 fallback

`scripts/deploy.sh` is kept as a non-Docker fallback. The GitHub Actions workflow
uses Docker by default.
