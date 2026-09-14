// 生成 CI 部署环境文件；TURN 专用密钥由服务器配置保留，不进入此生成流程。
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
