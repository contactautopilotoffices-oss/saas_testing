/**
 * Zoho Books MCP Server — HTTP Streamable Transport Endpoint
 *
 * Serves the Zoho Books MCP server over HTTP using the Streamable HTTP transport.
 * AI agents and MCP clients connect to this endpoint to discover and call Zoho tools.
 *
 * Endpoint: POST /api/mcp/zoho
 * Protocol: Model Context Protocol (MCP) 2025-03-26
 * Transport: Streamable HTTP (stateful with session management)
 *
 * Tools exposed:
 *   - create_purchase_order
 *   - get_vendors
 *   - get_vendor_by_id
 *   - create_vendor
 *   - get_purchase_order
 *   - get_gst_entities
 *   - parse_invoice
 *   - search_empanelled_vendor
 *   - calculate_gst
 */

import { randomUUID } from "node:crypto";
import { createZohoMCPServer } from "@/lib/zoho-mcp-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";

// Singleton: one MCP server instance, one transport
let mcpServer: ReturnType<typeof createZohoMCPServer> | null = null;
let transport: WebStandardStreamableHTTPServerTransport | null = null;

async function getOrCreateServer() {
    if (mcpServer) return { mcpServer, transport: transport! };

    // Create the MCP server with Zoho tools
    mcpServer = createZohoMCPServer();

    // Create stateful streamable HTTP transport with session management
    const eventStore = new InMemoryEventStore();
    transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sessionId) => {
            console.log(`[Zoho MCP] Session initialized: ${sessionId}`);
        },
    });

    await mcpServer.connect(transport);
    console.log("[Zoho MCP] Server connected to transport");

    return { mcpServer, transport };
}

/**
 * POST handler — accepts MCP JSON-RPC messages
 * The transport handles: tool calls, initialization, SSE streaming
 */
export async function POST(request: Request) {
    try {
        const { transport: t } = await getOrCreateServer();

        // The transport reads the request body, parses JSON-RPC messages,
        // dispatches to the MCP server, and returns the response
        return await t.handleRequest(request);
    } catch (error: any) {
        console.error("[Zoho MCP] POST error:", error);
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32603, message: `Internal error: ${error.message}` },
                id: null,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

/**
 * GET handler — for SSE stream connections (MCP protocol requirement)
 */
export async function GET(request: Request) {
    try {
        const { transport: t } = await getOrCreateServer();
        return await t.handleRequest(request);
    } catch (error: any) {
        console.error("[Zoho MCP] GET error:", error);
        return new Response(
            JSON.stringify({ error: `Stream error: ${error.message}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

/**
 * DELETE handler — session termination
 */
export async function DELETE(request: Request) {
    try {
        const { transport: t } = await getOrCreateServer();
        return await t.handleRequest(request);
    } catch (error: any) {
        console.error("[Zoho MCP] DELETE error:", error);
        return new Response(
            JSON.stringify({ error: `Session termination error: ${error.message}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// Prevent Next.js from parsing the body — the MCP transport handles raw request streams
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const bodyParser = false;
