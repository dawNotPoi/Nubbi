FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mcp/package.json ./mcp/package.json
RUN pnpm install --frozen-lockfile --filter nubbi-mcp-server...

COPY mcp ./mcp
RUN pnpm --filter nubbi-mcp-server build
RUN pnpm --filter nubbi-mcp-server deploy --prod --legacy /deploy

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production MCP_TRANSPORT=http MCP_HOST=0.0.0.0 MCP_PORT=3100
COPY --from=build --chown=node:node /deploy ./
USER node
EXPOSE 3100
CMD ["node", "dist/http.js"]
