FROM node:20-alpine

WORKDIR /app

RUN corepack enable
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile --prod --filter nubbi-server... --ignore-scripts

COPY server/tsconfig.json ./server/tsconfig.json
COPY server/app ./server/app

WORKDIR /app/server
RUN mkdir -p storage

EXPOSE 4000 4040

CMD ["pnpm", "start"]
