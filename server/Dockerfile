FROM node:20-alpine

WORKDIR /app

RUN corepack enable
ENV CI=true

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY tsconfig.json ./
COPY app ./app

RUN mkdir -p storage

EXPOSE 4000 4040

CMD ["pnpm", "start"]
