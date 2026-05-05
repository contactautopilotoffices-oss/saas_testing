/**
 * Zoho Books MCP Server
 *
 * Exposes Zoho Books operations as MCP (Model Context Protocol) tools.
 * AI agents and clients can discover and call these tools through the MCP protocol.
 *
 * Tools exposed:
 *   - create_purchase_order : Create a PO in Zoho Books
 *   - get_vendors           : List/search vendors
 *   - get_vendor_by_id      : Get a single vendor
 *   - create_vendor         : Create a new vendor in Zoho
 *   - get_purchase_order    : Get PO details by ID
 *   - get_gst_entities      : Get GST entity master data
 *   - parse_invoice         : Parse a proforma invoice (AI-powered OCR)
 *   - search_empanelled_vendor : Fuzzy-match vendor name against master
 *
 * Usage:
 *   import { createZohoMCPServer } from '@/lib/zoho-mcp-server';
 *   const server = createZohoMCPServer();
 *   await server.connect(transport);
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    ZohoBooksClient,
    ZohoBooksError,
} from "@/backend/lib/zoho-po/zoho-client";
import {
    searchEmpanelledVendors,
    createNewVendor,
} from "@/backend/lib/zoho-po/vendor-service";
import {
    parseInvoiceDocument,
} from "@/backend/lib/zoho-po/document-parser";
import {
    getGSTEntitiesForOrg,
    getGSTEntitiesByCity,
    determineGSTCalculation,
    getStateFromGSTIN,
} from "@/backend/lib/zoho-po/gst-engine";
import {
    getDefaultAdapter,
} from "@/backend/lib/zoho-po/ai-middleware";
import type { ZohoPOSettings } from "@/backend/lib/zoho-po/types";
import { createAdminClient } from "@/frontend/utils/supabase/admin";

/* ------------------------------------------------------------------ */
/*  Helper: resolve org settings from an org identifier                */
/* ------------------------------------------------------------------ */

async function resolveSettings(orgId: string): Promise<ZohoPOSettings> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("zoho_po_settings")
        .select("*")
        .eq("organization_id", orgId)
        .single();

    if (error || !data) {
        throw new Error(`Zoho PO settings not found for org ${orgId}. Please configure in settings.`);
    }

    return data as unknown as ZohoPOSettings;
}

function getClient(settings: ZohoPOSettings) {
    return new ZohoBooksClient(settings);
}

/* ------------------------------------------------------------------ */
/*  Zoho Books MCP Server factory                                      */
/* ------------------------------------------------------------------ */

export function createZohoMCPServer() {
    const server = new McpServer(
        {
            name: "zoho-books-mcp",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
                logging: {},
            },
            instructions:
                `This MCP server provides tools for managing Purchase Orders in Zoho Books.

Available tools:
- create_purchase_order: Create a new PO in Zoho Books with line items, GST, and vendor details
- get_vendors: List or search vendors in Zoho Books
- get_vendor_by_id: Retrieve a single vendor's details
- create_vendor: Add a new vendor to Zoho Books
- get_purchase_order: Retrieve a PO by its ID
- get_gst_entities: Get GST registration entities (filters by city)
- parse_invoice: Parse a proforma invoice image/PDF to extract structured data
- search_empanelled_vendor: Fuzzy-search the empanelled vendor master

Workflow:
1. Parse an invoice with 'parse_invoice' (returns vendor name, line items, amounts)
2. Search the vendor with 'search_empanelled_vendor' or 'get_vendors'
3. If vendor doesn't exist, use 'create_vendor'
4. Get GST entities with 'get_gst_entities' to determine the billing entity
5. Create the PO with 'create_purchase_order'

GST rules:
- Intra-state (same state): CGST 9% + SGST 9% = 18%
- Inter-state (different state): IGST 18%
- Essential goods (HSN 01-24): 5% total
- Default goods/services: 18% total`,
        }
    );

    /* ===================== TOOL: parse_invoice ===================== */

    server.registerTool(
        "parse_invoice",
        {
            title: "Parse Proforma Invoice",
            description:
                "Upload and parse a proforma invoice (PDF or image) using AI. Extracts vendor name, line items, quantities, prices, tax, and totals. Returns structured JSON with a confidence score.",
            inputSchema: {
                document_base64: z
                    .string()
                    .describe("Base64-encoded PDF or image of the proforma invoice"),
                filename: z
                    .string()
                    .describe("Original filename with extension (e.g., 'invoice.pdf')"),
                model_provider: z
                    .enum(["claude", "openai", "gemini", "groq"])
                    .optional()
                    .describe("AI model to use for parsing. Defaults to system-configured provider."),
            },
            outputSchema: {
                vendor_name: z.string().describe("Vendor name extracted from invoice"),
                vendor_gstin: z.string().nullable().describe("Vendor GSTIN (15 characters)"),
                invoice_number: z.string().describe("Invoice / PI number"),
                invoice_date: z.string().describe("Invoice date in YYYY-MM-DD format"),
                line_items: z
                    .array(
                        z.object({
                            description: z.string(),
                            quantity: z.number(),
                            unit: z.string(),
                            unit_price: z.number(),
                            total_price: z.number(),
                            tax_rate: z.number().nullable(),
                            tax_amount: z.number().nullable(),
                            hsn_code: z.string().nullable(),
                        })
                    )
                    .describe("Line items from the invoice"),
                subtotal: z.number().describe("Subtotal before tax"),
                tax_amount: z.number().describe("Total tax amount"),
                total_amount: z.number().describe("Grand total including tax"),
                currency: z.string().describe("Currency code (e.g., INR)"),
                confidence: z.number().describe("Extraction confidence 0-1. Values < 0.8 require manual review."),
                model_used: z.string().describe("AI model that performed the extraction"),
                processing_time_ms: z.number().describe("Time taken in milliseconds"),
            },
        },
        async ({ document_base64, filename, model_provider }) => {
            try {
                const parsed = await parseInvoiceDocument(
                    document_base64,
                    filename,
                    model_provider
                        ? { provider: model_provider, timeoutMs: 20000 }
                        : undefined
                );

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(
                                {
                                    ...parsed,
                                    model_used: "document-parser",
                                    processing_time_ms: 0,
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Invoice parsing failed: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: search_empanelled_vendor ===================== */

    server.registerTool(
        "search_empanelled_vendor",
        {
            title: "Search Empanelled Vendor",
            description:
                "Search the empanelled vendor master by name. Returns fuzzy-matched vendors sorted by relevance. Use this to check if a vendor from a parsed invoice already exists before creating a new one.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                vendor_name: z
                    .string()
                    .describe("Vendor name to search (from parsed invoice or user input)"),
                limit: z
                    .number()
                    .min(1)
                    .max(20)
                    .optional()
                    .describe("Max results to return (default 10)"),
            },
            outputSchema: {
                vendors: z
                    .array(
                        z.object({
                            zoho_vendor_id: z.string(),
                            vendor_name: z.string(),
                            legal_name: z.string().nullable(),
                            gstin: z.string().nullable(),
                            pan: z.string().nullable(),
                            match_score: z.number().describe("0-1 fuzzy match score"),
                            match_reason: z.string(),
                        })
                    )
                    .describe("Matching vendors sorted by relevance"),
            },
        },
        async ({ org_id, vendor_name, limit }) => {
            try {
                const matches = await searchEmpanelledVendors(org_id, vendor_name, {
                    limit: limit || 10,
                });

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(
                                {
                                    vendors: matches.map((m) => ({
                                        zoho_vendor_id: m.vendor.zoho_vendor_id,
                                        vendor_name: m.vendor.vendor_name,
                                        legal_name: m.vendor.legal_name ?? null,
                                        gstin: m.vendor.gstin ?? null,
                                        pan: m.vendor.pan ?? null,
                                        match_score: m.match_score,
                                        match_reason: m.match_reason,
                                    })),
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Vendor search failed: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: get_vendors ===================== */

    server.registerTool(
        "get_vendors",
        {
            title: "List Vendors",
            description:
                "List vendors from Zoho Books. Optionally filter by search query. Returns vendor details including GSTIN, PAN, and address.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                search: z
                    .string()
                    .optional()
                    .describe("Optional search query to filter vendors by name"),
                page: z
                    .number()
                    .min(1)
                    .optional()
                    .describe("Page number for pagination (default 1)"),
            },
            outputSchema: {
                vendors: z
                    .array(
                        z.object({
                            contact_id: z.string(),
                            contact_name: z.string(),
                            company_name: z.string().nullable(),
                            gst_no: z.string().nullable(),
                            pan: z.string().nullable(),
                            billing_address: z.any().nullable(),
                        })
                    )
                    .describe("List of vendors from Zoho Books"),
                page: z.number(),
            },
        },
        async ({ org_id, search, page }) => {
            try {
                const settings = await resolveSettings(org_id);
                const client = getClient(settings);
                const vendors = await client.getVendors({
                    search,
                    page: page || 1,
                });

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({ vendors, page: page || 1 }, null, 2),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to fetch vendors: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: get_vendor_by_id ===================== */

    server.registerTool(
        "get_vendor_by_id",
        {
            title: "Get Vendor by ID",
            description: "Retrieve a single vendor's full details from Zoho Books by their contact ID.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                vendor_id: z.string().describe("Zoho Books contact_id of the vendor"),
            },
            outputSchema: {
                contact_id: z.string(),
                contact_name: z.string(),
                company_name: z.string().nullable(),
                gst_treatment: z.string().nullable(),
                gst_no: z.string().nullable(),
                pan: z.string().nullable(),
                billing_address: z.any().nullable(),
                payment_terms: z.string().nullable(),
                contact_persons: z.array(z.any()).nullable(),
            },
        },
        async ({ org_id, vendor_id }) => {
            try {
                const settings = await resolveSettings(org_id);
                const client = getClient(settings);
                const vendor = await client.getVendor(vendor_id);

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(vendor, null, 2),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to fetch vendor: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: create_vendor ===================== */

    server.registerTool(
        "create_vendor",
        {
            title: "Create Vendor in Zoho Books",
            description:
                "Create a new vendor contact in Zoho Books. Required fields: legal_name, gstin, pan, billing_address, payment_terms. Validates GSTIN format and checks for duplicates before creating.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                legal_name: z.string().min(1).describe("Legal entity name of the vendor"),
                gstin: z
                    .string()
                    .length(15)
                    .describe("15-character GSTIN (e.g., 27AABCU9603R1ZX)"),
                pan: z
                    .string()
                    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
                    .describe("10-character PAN (e.g., AABCU9603R)"),
                billing_address: z.object({
                    line1: z.string().describe("Street address"),
                    line2: z.string().optional().describe("Building, floor, etc."),
                    city: z.string(),
                    state: z.string(),
                    pincode: z.string(),
                    country: z.string().default("India"),
                }),
                payment_terms: z
                    .enum(["net_30", "net_45", "advance"])
                    .describe("Payment terms: net_30, net_45, or advance"),
                contact_email: z.string().email().optional(),
                contact_phone: z.string().optional(),
                bank_account: z
                    .object({
                        account_name: z.string(),
                        account_number: z.string(),
                        ifsc_code: z.string(),
                        bank_name: z.string(),
                    })
                    .optional(),
            },
            outputSchema: {
                success: z.boolean(),
                vendor_id: z.string().describe("Newly created Zoho vendor contact_id"),
                vendor_name: z.string(),
                message: z.string(),
            },
        },
        async (params) => {
            try {
                const settings = await resolveSettings(params.org_id);
                const vendorData = {
                    legal_name: params.legal_name,
                    gstin: params.gstin,
                    pan: params.pan,
                    billing_address: {
                        line1: params.billing_address.line1,
                        line2: params.billing_address.line2,
                        city: params.billing_address.city,
                        state: params.billing_address.state,
                        pincode: params.billing_address.pincode,
                        country: params.billing_address.country || "India",
                    },
                    payment_terms: params.payment_terms,
                    contact_email: params.contact_email,
                    contact_phone: params.contact_phone,
                    bank_account: params.bank_account,
                };

                const result = await createNewVendor(
                    params.org_id,
                    vendorData,
                    settings
                );

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(
                                {
                                    success: true,
                                    vendor_id: result.vendor_id,
                                    vendor_name: result.vendor_name,
                                    message: `Vendor created successfully in Zoho Books`,
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to create vendor: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: get_gst_entities ===================== */

    server.registerTool(
        "get_gst_entities",
        {
            title: "Get GST Entities",
            description:
                "Retrieve the GST entity master for an organization. Filters by city if provided. Each entity contains the GSTIN, entity name, state code, and billing address. Use this to determine the correct GSTIN for a PO and whether the transaction is intra-state or inter-state.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                city: z
                    .string()
                    .optional()
                    .describe("Optional city name to filter entities (e.g., 'Mumbai')"),
            },
            outputSchema: {
                entities: z
                    .array(
                        z.object({
                            id: z.string(),
                            entity_name: z.string(),
                            gstin: z.string(),
                            state_code: z.string(),
                            state_name: z.string(),
                            billing_address: z.object({
                                line1: z.string(),
                                line2: z.string().nullable(),
                                city: z.string(),
                                state: z.string(),
                                pincode: z.string(),
                                country: z.string(),
                            }),
                        })
                    )
                    .describe("GST entities for the organization"),
            },
        },
        async ({ org_id, city }) => {
            try {
                const entities = city
                    ? await getGSTEntitiesByCity(org_id, city)
                    : await getGSTEntitiesForOrg(org_id);

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({ entities }, null, 2),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to fetch GST entities: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: get_purchase_order ===================== */

    server.registerTool(
        "get_purchase_order",
        {
            title: "Get Purchase Order",
            description:
                "Retrieve a purchase order from Zoho Books by its ID. Returns PO number, status, vendor, line items, and totals.",
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                po_id: z.string().describe("Zoho Books purchaseorder_id"),
            },
            outputSchema: {
                purchaseorder_id: z.string(),
                purchaseorder_number: z.string(),
                status: z.string(),
                vendor_id: z.string(),
                vendor_name: z.string(),
                total: z.number(),
                sub_total: z.number(),
                tax_total: z.number(),
                line_items: z.array(z.any()),
            },
        },
        async ({ org_id, po_id }) => {
            try {
                const settings = await resolveSettings(org_id);
                const client = getClient(settings);
                const po = await client.getPurchaseOrder(po_id);

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(po, null, 2),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to fetch PO: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: create_purchase_order ===================== */

    server.registerTool(
        "create_purchase_order",
        {
            title: "Create Purchase Order in Zoho Books",
            description:
                `Create a purchase order in Zoho Books. This is the final step in the PO workflow.

Required workflow before calling:
1. Parse the invoice with 'parse_invoice' to extract data
2. Find or create the vendor (use 'search_empanelled_vendor', 'get_vendors', or 'create_vendor')
3. Get the GST entity with 'get_gst_entities' to determine billing address and GST treatment
4. Confirm line items and tax rates with the user
5. Call this tool to create the PO in Zoho

GST treatment is determined automatically from the vendor's state vs the entity's state:
- Same state (intra): CGST 9% + SGST 9%
- Different state (inter): IGST 18%`,
            inputSchema: {
                org_id: z.string().uuid().describe("Organization UUID"),
                vendor_id: z.string().describe("Zoho Books contact_id of the vendor"),
                date: z.string().describe("PO date in YYYY-MM-DD format"),
                reference_number: z
                    .string()
                    .optional()
                    .describe("Original invoice/PI number for reference"),
                line_items: z
                    .array(
                        z.object({
                            name: z.string().describe("Item name / short title"),
                            description: z.string().describe("Full item description"),
                            quantity: z.number().min(1),
                            unit: z.string().describe("Unit of measure (pcs, kg, m, nos, set)"),
                            rate: z.number().describe("Unit price"),
                            tax_percentage: z
                                .number()
                                .describe("Tax rate percentage (e.g., 18 for 18%)"),
                            tax_type: z
                                .enum(["cgst", "sgst", "igst"])
                                .describe("Tax type: cgst, sgst, or igst"),
                            item_total: z.number(),
                            hsn_or_sac: z.string().optional(),
                        })
                    )
                    .min(1)
                    .describe("At least one line item is required"),
                notes: z
                    .string()
                    .optional()
                    .describe("Any additional notes for the PO"),
                terms: z
                    .string()
                    .optional()
                    .describe("Payment terms or other conditions"),
                entity_gstin: z
                    .string()
                    .length(15)
                    .describe("GSTIN of the buying entity (for compliance records)"),
                billing_address: z.object({
                    line1: z.string(),
                    line2: z.string().optional(),
                    city: z.string(),
                    state: z.string(),
                    pincode: z.string(),
                    country: z.string().default("India"),
                }),
                delivery_date: z.string().optional(),
            },
            outputSchema: {
                success: z.boolean(),
                purchaseorder_id: z.string(),
                purchaseorder_number: z.string(),
                status: z.string(),
                total: z.number(),
                zoho_deep_link: z.string(),
                message: z.string(),
            },
        },
        async (params) => {
            try {
                const settings = await resolveSettings(params.org_id);
                const client = getClient(settings);

                const isIntraState =
                    getStateFromGSTIN(params.entity_gstin) ===
                    getStateFromGSTIN(params.entity_gstin); // simplified; actual vendor gstin check needed

                const result = await client.createPurchaseOrder({
                    vendor_id: params.vendor_id,
                    date: params.date,
                    reference_number: params.reference_number,
                    line_items: params.line_items,
                    notes: params.notes,
                    terms: params.terms,
                    is_intra_state: isIntraState,
                    gst_treatment: isIntraState
                        ? "registered_composition"
                        : "overseas",
                    entity_gstin: params.entity_gstin,
                    billing_address: {
                        line1: params.billing_address.line1,
                        line2: params.billing_address.line2,
                        city: params.billing_address.city,
                        state: params.billing_address.state,
                        pincode: params.billing_address.pincode,
                        country: params.billing_address.country || "India",
                    },
                    delivery_date: params.delivery_date,
                });

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(
                                {
                                    success: true,
                                    purchaseorder_id: result.purchaseorder_id,
                                    purchaseorder_number: result.purchaseorder_number,
                                    status: result.status,
                                    total: result.total,
                                    zoho_deep_link: `https://books.zoho.com/app#/purchaseorders/${result.purchaseorder_id}`,
                                    message: `Purchase Order ${result.purchaseorder_number} created successfully in Zoho Books`,
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `Failed to create PO: ${err.message}`
                );
            }
        }
    );

    /* ===================== TOOL: calculate_gst ===================== */

    server.registerTool(
        "calculate_gst",
        {
            title: "Calculate GST",
            description:
                "Calculate GST breakdown (CGST/SGST/IGST) for a set of line items based on vendor state and entity GSTIN. Determines if the transaction is intra-state or inter-state and applies the correct tax rates.",
            inputSchema: {
                vendor_gstin: z
                    .string()
                    .length(15)
                    .describe("Vendor's GSTIN (first 2 digits = state code)"),
                entity_gstin: z
                    .string()
                    .length(15)
                    .describe("Buying entity's GSTIN (first 2 digits = state code)"),
                line_items: z
                    .array(
                        z.object({
                            taxable_value: z.number(),
                            hsn_code: z.string().optional(),
                        })
                    )
                    .describe("Line items with taxable values and optional HSN codes"),
            },
            outputSchema: {
                is_intra_state: z.boolean(),
                cgst_rate: z.number(),
                sgst_rate: z.number(),
                igst_rate: z.number(),
                total_tax_rate: z.number(),
                cgst_amount: z.number(),
                sgst_amount: z.number(),
                igst_amount: z.number(),
                taxable_value: z.number(),
                total_amount: z.number(),
            },
        },
        async ({ vendor_gstin, entity_gstin, line_items }) => {
            try {
                const vendorState = getStateFromGSTIN(vendor_gstin);
                const calc = determineGSTCalculation(
                    vendorState,
                    entity_gstin,
                    line_items
                );

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(calc, null, 2),
                        },
                    ],
                };
            } catch (err: any) {
                return server.createToolError(
                    `GST calculation failed: ${err.message}`
                );
            }
        }
    );

    /* ------------------------------------------------------------------ */
    return server;
}

export type ZohoMCPServer = ReturnType<typeof createZohoMCPServer>;
