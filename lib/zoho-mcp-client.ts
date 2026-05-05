/**
 * Zoho Books MCP Client
 *
 * Connects to the local Zoho MCP server via StreamableHTTP transport.
 * Provides a typed wrapper around MCP tool calls for use in API routes
 * and the AI middleware layer.
 *
 * Usage:
 *   const client = await getZohoMCPClient();
 *   const tools = await client.listTools();
 *   const result = await client.callTool('create_purchase_order', { ... });
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

let clientPromise: Promise<Client> | null = null;

export async function getZohoMCPClient(): Promise<Client> {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const mcpUrl = `${baseUrl}/api/mcp/zoho`;

        const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
            requestInit: {
                headers: {
                    "Content-Type": "application/json",
                },
            },
        });

        const client = new Client(
            {
                name: "autopilot-zoho-client",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                    prompts: {},
                },
            }
        );

        await client.connect(transport);
        console.log("[Zoho MCP Client] Connected to Zoho MCP server at", mcpUrl);
        return client;
    })();

    return clientPromise;
}

/**
 * List all available tools from the Zoho MCP server
 */
export async function listZohoTools() {
    const client = await getZohoMCPClient();
    return client.listTools();
}

/**
 * Call a Zoho MCP tool by name with arguments
 */
export async function callZohoTool<T = any>(
    toolName: string,
    args: Record<string, any>
): Promise<T> {
    const client = await getZohoMCPClient();
    const result: CallToolResult = await client.callTool({
        name: toolName,
        arguments: args,
    });

    // Extract text content from tool result
    const textContent = result.content
        ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");

    if (!textContent) {
        throw new Error(`Tool ${toolName} returned no text content`);
    }

    // Try to parse as JSON
    try {
        return JSON.parse(textContent) as T;
    } catch {
        // If not valid JSON, return the raw text wrapped
        return textContent as unknown as T;
    }
}

/**
 * Convenience: Create a purchase order via MCP tool call
 */
export async function createPurchaseOrderViaMCP(params: {
    org_id: string;
    vendor_id: string;
    date: string;
    reference_number?: string;
    line_items: Array<{
        name: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        tax_percentage: number;
        tax_type: "cgst" | "sgst" | "igst";
        item_total: number;
        hsn_or_sac?: string;
    }>;
    notes?: string;
    terms?: string;
    entity_gstin: string;
    billing_address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        country?: string;
    };
    delivery_date?: string;
}) {
    return callZohoTool<{
        success: boolean;
        purchaseorder_id: string;
        purchaseorder_number: string;
        status: string;
        total: number;
        zoho_deep_link: string;
        message: string;
    }>("create_purchase_order", params);
}

/**
 * Convenience: Parse an invoice via MCP tool call
 */
export async function parseInvoiceViaMCP(
    documentBase64: string,
    filename: string,
    modelProvider?: "claude" | "openai" | "gemini" | "groq"
) {
    return callZohoTool<{
        vendor_name: string;
        vendor_gstin: string | null;
        invoice_number: string;
        invoice_date: string;
        line_items: Array<{
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            total_price: number;
            tax_rate: number | null;
            tax_amount: number | null;
            hsn_code: string | null;
        }>;
        subtotal: number;
        tax_amount: number;
        total_amount: number;
        currency: string;
        confidence: number;
        model_used: string;
        processing_time_ms: number;
    }>("parse_invoice", {
        document_base64: documentBase64,
        filename,
        model_provider: modelProvider,
    });
}

/**
 * Convenience: Search empanelled vendors via MCP
 */
export async function searchVendorViaMCP(
    orgId: string,
    vendorName: string,
    limit?: number
) {
    return callZohoTool<{
        vendors: Array<{
            zoho_vendor_id: string;
            vendor_name: string;
            legal_name: string | null;
            gstin: string | null;
            pan: string | null;
            match_score: number;
            match_reason: string;
        }>;
    }>("search_empanelled_vendor", {
        org_id: orgId,
        vendor_name: vendorName,
        limit: limit || 10,
    });
}

/**
 * Convenience: Get GST entities via MCP
 */
export async function getGSTEntitiesViaMCP(orgId: string, city?: string) {
    return callZohoTool<{
        entities: Array<{
            id: string;
            entity_name: string;
            gstin: string;
            state_code: string;
            state_name: string;
            billing_address: {
                line1: string;
                line2: string | null;
                city: string;
                state: string;
                pincode: string;
                country: string;
            };
        }>;
    }>("get_gst_entities", { org_id: orgId, city });
}

/**
 * Reset the client (useful for testing or after errors)
 */
export function resetZohoMCPClient() {
    clientPromise = null;
}
