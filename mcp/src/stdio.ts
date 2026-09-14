import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readStdioConfig } from "./config.js";
import { isDirectRun, reportFatalError } from "./main-utils.js";
import { createNubbiMcpServer } from "./server.js";
import { NubbiApiClient } from "./services/api-client.js";

export const runStdio = async (): Promise<void> => {
  const config = readStdioConfig();
  const api = new NubbiApiClient(config.apiUrl, config.apiKey);
  await api.validateContext();

  const server = createNubbiMcpServer(api);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("nubbi-mcp-server connected over stdio\n");
};

if (isDirectRun(import.meta.url)) {
  runStdio().catch((error: unknown) => reportFatalError("stdio startup failed", error));
}
