import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerContentTools } from "./tools/content-tools.js";
import { registerOrganizationTools } from "./tools/organization-tools.js";
import { registerReadTools } from "./tools/read-tools.js";
import type { NubbiApi } from "./types.js";

export const createNubbiMcpServer = (api: NubbiApi): McpServer => {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerReadTools(server, api);
  registerContentTools(server, api);
  registerOrganizationTools(server, api);
  return server;
};
