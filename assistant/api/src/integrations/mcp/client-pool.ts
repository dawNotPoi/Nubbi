import { connect } from "./transport.ts";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { type McpServerConfig } from "./mcp-config.ts";

/** 已缓存的 MCP 客户端及其最近使用时间。 */
type CachedClient = {
  client: Client;
  lastUsed: number;
  closeTimer?: NodeJS.Timeout;
};

const clientCache = new Map<string, CachedClient>();

const pendingConnections = new Map<string, Promise<Client>>();

const CLIENT_IDLE_TIMEOUT_MS = 5 * 60_000;

/**
 * 生成 MCP 服务连接的缓存键：配置变化后自然使用新连接。
 * @param server MCP 服务配置。
 * @returns 缓存键字符串。
 */
const configKey = (server: McpServerConfig): string =>
  JSON.stringify({
    id: server.id,
    transport: server.transport,
    url: server.url,
    headers: server.headers,
    command: server.command,
    args: server.args,
    cwd: server.cwd,
    env: server.env,
  });

/**
 * 关闭并移除指定缓存连接。
 * @param key 缓存键。
 * @returns 关闭完成后的 Promise。
 */
const closeCachedClient = async (key: string): Promise<void> => {
  const cached = clientCache.get(key);
  if (!cached) return;
  clientCache.delete(key);
  if (cached.closeTimer) clearTimeout(cached.closeTimer);
  await cached.client.close().catch(() => undefined);
};

/**
 * 为缓存连接安排空闲回收，避免 stdio 子进程常驻过多。
 * @param key 缓存键。
 * @returns 无返回值。
 */
const scheduleIdleClose = (key: string): void => {
  const cached = clientCache.get(key);
  if (!cached) return;
  if (cached.closeTimer) clearTimeout(cached.closeTimer);
  cached.closeTimer = setTimeout(() => {
    void closeCachedClient(key);
  }, CLIENT_IDLE_TIMEOUT_MS);
  cached.closeTimer.unref?.();
};

/**
 * 获取 MCP 客户端：优先复用同配置的常驻连接，避免每次工具调用都重新拉起 stdio 子进程。
 * @param server MCP 服务配置。
 * @returns 可用的 MCP 客户端。
 */
const getCachedClient = async (server: McpServerConfig): Promise<Client> => {
  const key = configKey(server);
  const cached = clientCache.get(key);
  if (cached) {
    cached.lastUsed = Date.now();
    scheduleIdleClose(key);
    return cached.client;
  }
  const pending = pendingConnections.get(key);
  if (pending) return pending;
  const connection = connect(server)
    .then((client) => {
      clientCache.set(key, { client, lastUsed: Date.now() });
      scheduleIdleClose(key);
      return client;
    })
    .finally(() => {
      pendingConnections.delete(key);
    });
  pendingConnections.set(key, connection);
  return connection;
};

/**
 * 使用缓存客户端执行操作；连接级异常时丢弃缓存，下次调用自动重建。
 * @param server MCP 服务配置。
 * @param signal 可选的取消信号。
 * @param operation 使用客户端的操作。
 * @returns 操作结果。
 */
export const runWithClient = async <T>(
  server: McpServerConfig,
  signal: AbortSignal | undefined,
  operation: (client: Client) => Promise<T>,
): Promise<T> => {
  const key = configKey(server);
  signal?.throwIfAborted();
  const client = await waitForConnection(getCachedClient(server), signal);
  signal?.throwIfAborted();
  try {
    return await operation(client);
  } catch (error) {
    // 用户主动取消时不需要重建连接，避免无谓的进程启动。
    if (!signal?.aborted) {
      await closeCachedClient(key);
    }
    throw error;
  }
};

/** 取消当前等待者，不关闭其他运行正在等待的共享连接。 */
async function waitForConnection(connection: Promise<Client>, signal?: AbortSignal): Promise<Client> {
  if (!signal) return connection;
  return new Promise<Client>((resolve, reject) => {
    const cancel = (): void => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    void connection.then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel));
    if (signal.aborted) cancel();
  });
}
