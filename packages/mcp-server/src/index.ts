#!/usr/bin/env node

/**
 * FlowLink MCP Compliance Server — entry point.
 *
 * Supports two transport modes:
 *   stdio (default): FLOWLINK_API_KEY=fl_live_xxx npx @flowlink/mcp-server
 *   SSE:             FLOWLINK_TRANSPORT=sse npx @flowlink/mcp-server
 */

export { createFlowLinkMCPServer } from "./server.js";
export type { FlowLinkMCPHandle, FlowLinkMCPOptions } from "./server.js";
export type { SSETransportOptions, SSETransportHandle } from "./transports/sse.js";
export { createSSETransport } from "./transports/sse.js";
export { formatMcpError, formatUnknownError } from "./errors.js";
export type { FlowLinkMcpErrorCode, McpErrorResponse } from "./errors.js";

import { createFlowLinkMCPServer } from "./server.js";

async function main(): Promise<void> {
  const transport = process.env["FLOWLINK_TRANSPORT"] === "sse" ? "sse" : "stdio";
  const port = process.env["FLOWLINK_SSE_PORT"]
    ? parseInt(process.env["FLOWLINK_SSE_PORT"], 10)
    : 3001;

  const handle = await createFlowLinkMCPServer({
    transport,
    sse: { port },
  });
  await handle.start();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[flowlink-mcp] Fatal: ${message}\n`);
  process.exit(1);
});
