#!/usr/bin/env node
import { reportFatalError } from "./utils.js";

const printHelp = (): void => {
  process.stdout.write(
    "nubbi-mcp-server\n\n" +
      "Environment:\n" +
      "  MCP_TRANSPORT=stdio|http (default: stdio)\n" +
      "  NUBBI_API_URL=http://localhost:4000\n" +
      "  NUBBI_API_KEY=nb_... (stdio only)\n" +
      "See README.md for HTTP host/origin settings.\n",
  );
};

const main = async (): Promise<void> => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }
  const transport = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (transport === "stdio") {
    const { runStdio } = await import("./transport/stdio.js");
    await runStdio();
    return;
  }
  if (transport === "http") {
    const { runHttp } = await import("./transport/http.js");
    await runHttp();
    return;
  }
  throw new Error("MCP_TRANSPORT must be either 'stdio' or 'http'");
};

main().catch((error: unknown) => reportFatalError("MCP startup failed", error));
