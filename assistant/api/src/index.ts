import cors from "cors";
import express from "express";
import { env } from "./env.js";
import { requireConfigAccess } from "./middleware/config-access.js";
import { approvalRoutes } from "./routes/approvals.js";
import { configRoutes } from "./routes/config.js";
import { conversationRoutes } from "./routes/conversations.js";
import { extensionRoutes } from "./routes/extensions.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api", conversationRoutes);
app.use("/api", approvalRoutes);
app.use("/api", extensionRoutes);
app.use(["/api/mcp", "/api/model"], requireConfigAccess);
app.use("/api", configRoutes);

app.use((
  error: unknown,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) => {
  const message = error instanceof Error ? error.message : "服务器内部错误";
  response.status(500).json({ message });
});

app.listen(env.PORT, () => {
  console.log(`Assistant API listening on http://localhost:${env.PORT}`);
});
