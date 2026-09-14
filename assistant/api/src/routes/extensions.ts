import { Router } from "express";
import { asyncRoute } from "../middleware/async-route.js";
import { listMcpServers } from "../mcp-config.js";
import { discoverMcpTools } from "../mcp.js";
import { listSkills } from "../skills.js";

export const extensionRoutes = Router();

extensionRoutes.get("/extensions", asyncRoute(async (_request, response) => {
  const [skills, servers, tools] = await Promise.all([
    listSkills(),
    listMcpServers(),
    discoverMcpTools(),
  ]);
  response.json({
    skills: skills.map(({ name, description }) => ({ name, description })),
    servers: servers.map((server) => ({
      id: server.id,
      name: server.name,
      transport: "http",
      endpoint: server.url,
      toolCount: tools.filter((tool) => tool.server.id === server.id).length,
    })),
  });
}));
