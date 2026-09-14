// 本地视频字幕 MCP 服务：暴露 fetch_video_transcript 工具。
// 依赖 assistant/api 的 node_modules 里的 @modelcontextprotocol/sdk。
// 启动：node server.mjs  （默认端口 8788）
import http from "node:http";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

// pnpm 严格模式未把 @modelcontextprotocol/sdk hoist 到根目录，
// 锚定到 assistant/api 的 node_modules 解析（api 依赖该 SDK）。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "../../api");
const require = createRequire(path.join(apiDir, "package.json"));
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { WebStandardStreamableHTTPServerTransport } =
  require("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js");
const { z } = require("zod");

const SCRIPT = path.join(__dirname, "fetch_transcript.py");
const PORT = Number(process.env.VIDEO_MCP_PORT ?? 8788);

/**
 * 调用 fetch_transcript.py 并解析 JSON 输出。
 * @param url 视频链接。
 * @returns 脚本返回的对象（含 success/transcript 等）。
 */
const runFetch = (url) => new Promise((resolve, reject) => {
  const child = spawn("python", [SCRIPT, url], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => {
    if (code !== 0) {
      return reject(new Error(stderr.trim() || `抓取脚本退出码 ${code}`));
    }
    try {
      resolve(JSON.parse(stdout));
    } catch {
      reject(new Error("抓取脚本输出无法解析"));
    }
  });
});

/** 每个会话一个独立 McpServer（SDK 限制：单 server 只能连一个 transport）。 */
const createServer = () => {
  const server = new McpServer({ name: "video-transcript", version: "0.1.0" });
  server.registerTool(
    "fetch_video_transcript",
    {
      title: "获取视频字幕/转录文本",
      description:
        "给定一个视频链接（支持 YouTube、Bilibili 等），返回视频标题、时长与该视频的字幕/转录文本，供总结分析使用。",
      inputSchema: { url: z.string().url("必须是有效的视频链接") },
    },
    async ({ url }) => {
      try {
        const data = await runFetch(url);
        if (!data.success) {
          return { content: [{ type: "text", text: JSON.stringify({ success: false, error: data.error }) }] };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              title: data.title,
              duration: data.duration,
              channel: data.channel,
              languages: data.languages,
              transcript: data.transcript,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : "抓取失败" }) }],
        };
      }
    },
  );
  return server;
};

/** sessionId → { server, transport } 映射。 */
const sessions = new Map();

/**
 * 处理一次 MCP 请求：带会话头则复用，否则新建会话。
 * @param request Web 标准 Request。
 * @returns Web 标准 Response。
 */
async function handleMcpRequest(request) {
  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId) {
    const entry = sessions.get(sessionId);
    if (!entry) return new Response("无效的 MCP 会话", { status: 400 });
    return entry.transport.handleRequest(request);
  }
  const server = createServer();
  let transport;
  transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { server, transport });
    },
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

/** 读取 Node 请求体为 Buffer。 */
const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => resolve(Buffer.concat(chunks)));
});

const app = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    const request = new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });
    const response = await handleMcpRequest(request);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    res.writeHead(response.status, responseHeaders);
    if (response.body) {
      // SSE 流式响应直接 pipe；普通 JSON 响应缓冲后一次性写出。
      if (responseHeaders["content-type"]?.includes("text/event-stream")) {
        Readable.fromWeb(response.body).pipe(res);
      } else {
        const payload = Buffer.from(await response.arrayBuffer());
        if (responseHeaders["content-length"] === undefined && payload.length) {
          res.setHeader("content-length", String(payload.length));
        }
        res.end(payload);
      }
    } else {
      res.end();
    }
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(error instanceof Error ? error.message : "MCP 服务内部错误");
  }
});

app.listen(PORT, () => {
  console.log(`[video-transcript] MCP 服务已启动: http://127.0.0.1:${PORT}/mcp`);
});
