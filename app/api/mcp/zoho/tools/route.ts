/**
 * Zoho MCP Tool Discovery Endpoint
 *
 * Returns metadata about all tools exposed by the Zoho Books MCP server.
 * Useful for AI agents that need to discover available capabilities.
 *
 * GET /api/mcp/zoho/tools
 */

import { NextResponse } from "next/server";
import { listZohoTools, resetZohoMCPClient } from "@/lib/zoho-mcp-client";

export async function GET() {
    try {
        const tools = await listZohoTools();
        return NextResponse.json({
            server: "zoho-books-mcp",
            version: "1.0.0",
            protocol: "2025-03-26",
            endpoint: "/api/mcp/zoho",
            toolCount: tools.tools?.length || 0,
            tools: (tools.tools || []).map((t: any) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
            })),
        });
    } catch (error: any) {
        console.error("[Zoho MCP Tools] Discovery error:", error);
        // Reset client on error to force reconnection
        resetZohoMCPClient();
        return NextResponse.json(
            { error: "Failed to discover tools", message: error.message },
            { status: 500 }
        );
    }
}
