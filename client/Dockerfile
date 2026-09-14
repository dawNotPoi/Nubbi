FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable
ENV CI=true

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=
ARG VITE_SOCKET_URL=
ARG VITE_GITHUB_REPO=
ARG VITE_GITHUB_TOKEN=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_GITHUB_REPO=$VITE_GITHUB_REPO
ENV VITE_GITHUB_TOKEN=$VITE_GITHUB_TOKEN

RUN pnpm build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
