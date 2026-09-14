FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
RUN pnpm install --frozen-lockfile --filter nubbi-client...

COPY client ./client

ARG VITE_API_URL=
ARG VITE_AUTH_URL=
ARG VITE_SOCKET_URL=
ARG VITE_GITHUB_REPO=
ARG VITE_GITHUB_TOKEN=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_GITHUB_REPO=$VITE_GITHUB_REPO
ENV VITE_GITHUB_TOKEN=$VITE_GITHUB_TOKEN

RUN pnpm --filter nubbi-client build

FROM nginx:1.27-alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
