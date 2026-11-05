// MCP Route Entry Point: Stateless Streamable HTTP endpoint for AI agent pairs.
// Authenticates the caller via requireAgent(), instantiates McpServer for the specific request,
// registers authorized tools, processes the JSON-RPC message, and returns the response.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireAgent } from "@/lib/agent/auth";
import { registerToolsForAgent } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER_INSTRUCTIONS =
  "Rony's personal dashboard. Dates are calendar days in Asia/Dhaka (YYYY-MM-DD; 'today' and 'tomorrow' are accepted). Money is whole Bangladeshi taka. Use the ids returned by list/get tools. You cannot delete anything; ask Rony to do it in the app.";

export async function POST(req: Request): Promise<Response> {
  // 1. Authenticate agent from Authorization: Bearer <key>
  const auth = await requireAgent(req);
  if (auth instanceof Response) {
    return auth;
  }

  // 2. Ensure Accept header includes text/event-stream for Streamable HTTP compatibility
  const headers = new Headers(req.headers);
  const accept = headers.get("accept") || headers.get("Accept") || "";
  if (!accept.includes("text/event-stream")) {
    headers.set(
      "accept",
      accept ? `${accept}, text/event-stream` : "application/json, text/event-stream"
    );
  }

  const normalizedReq = new Request(req.url, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error - duplex is supported in Node 18+ web standards
    duplex: "half",
  });

  // 3. Build the MCP server for THIS request with authorized tools
  const server = new McpServer(
    {
      name: "life-dashboard",
      version: "0.1.0",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  registerToolsForAgent(server, auth.ctx);

  // 4. Handle request via stateless Streamable HTTP transport
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return transport.handleRequest(normalizedReq);
}

export async function GET(): Promise<Response> {
  return new Response("Method not allowed", {
    status: 405,
    headers: {
      Allow: "POST",
    },
  });
}

export async function DELETE(): Promise<Response> {
  return new Response("Method not allowed", {
    status: 405,
    headers: {
      Allow: "POST",
    },
  });
}
