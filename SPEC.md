# SPEC.md — Zoho MCP Purchase Order Module
## Autopilot AI-Powered PO Creation via Zoho Books MCP Server

**Version:** 1.1 | **Date:** 2026-05-05 | Status: MCP Architecture Complete

---

## 1. Overview

This module provides a **Zoho Books MCP (Model Context Protocol) Server** that exposes Zoho Books operations as discoverable AI tools, plus a complete web UI for human users to create Purchase Orders from Proforma Invoices.

### Two Interface Layers:

**Layer 1 — MCP Server (AI-facing):**
An MCP-compliant server at `/api/mcp/zoho` that exposes 9 tools via the Model Context Protocol. AI agents connect via HTTP, discover available tools through `tools/list`, and call them with `tools/call`. No Zoho API knowledge required by the AI — all authentication, GST logic, and error handling is managed by the MCP server.

**Layer 2 — Web Wizard (Human-facing):**
A 4-step UI at `/zoho-po` for human users: **Invoice Upload → AI Document Parsing → 5-Question Context Prompt → Zoho Books PO Creation → Confirmation**. The web layer internally calls the same business logic that backs the MCP tools.

### Core Capabilities:
- **MCP Protocol Server**: 9 tools exposed via `/api/mcp/zoho` (Streamable HTTP transport)
- **AI Document Parsing**: Extract structured data from proforma invoice PDFs/images (model-agnostic)
- **GST Engine**: Automatic inter/intra-state detection with correct CGST/SGST/IGST
- **Vendor Intelligence**: Fuzzy-matched empanelled vendor lookup + new vendor creation
- **Model-Agnostic AI**: Swap LLM providers via `AI_MODEL_PROVIDER` env var
- **Full Audit Trail**: Every PO creation attempt logged with inputs, outputs, model used

---

## 2. Module Structure

### MCP Server (The Core)
```
lib/zoho-mcp-server.ts          # McpServer with 9 registered MCP tools
lib/zoho-mcp-client.ts          # MCP client for calling Zoho tools from app code

app/api/mcp/zoho/
  route.ts                      # Streamable HTTP transport (POST/GET/DELETE)
  tools/route.ts                # Tool discovery endpoint (GET /tools)
```

### MCP Tools Exposed:
| Tool | Description |
|------|-------------|
| `create_purchase_order` | Create a PO in Zoho Books with line items, GST, vendor |
| `get_vendors` | List/search vendors in Zoho Books |
| `get_vendor_by_id` | Get a single vendor's full details |
| `create_vendor` | Add a new vendor (validates GSTIN/PAN, checks duplicates) |
| `get_purchase_order` | Retrieve PO by ID |
| `get_gst_entities` | Get GST entity master (filters by city) |
| `parse_invoice` | AI-powered document parsing (PDF/image → structured JSON) |
| `search_empanelled_vendor` | Fuzzy-search empanelled vendor master |
| `calculate_gst` | Compute CGST/SGST/IGST for given vendor + entity GSTINs |

### Backend Services:
```
backend/lib/zoho-po/
  types.ts                    # Shared TypeScript types
  ai-middleware.ts            # Model-agnostic AI abstraction layer
  document-parser.ts          # Invoice document parsing orchestrator
  gst-engine.ts               # GST logic engine (IGST/CGST/SGST)
  vendor-service.ts           # Empanelled vendor lookup + new vendor creation
  zoho-client.ts              # Zoho Books REST API client (OAuth, retries)
  adapters/
    claude-adapter.ts         # Anthropic Claude adapter
    openai-adapter.ts         # OpenAI GPT-4o adapter
    gemini-adapter.ts         # Google Gemini adapter
    groq-adapter.ts           # Groq/Llama adapter
```

### REST API Routes (Web Layer → MCP Tools):
```
app/api/zoho-po/
  parse-invoice/route.ts      # POST: Upload & parse invoice
  vendors/route.ts            # GET/POST: Vendor search & creation
  create/route.ts             # POST: Full PO creation pipeline
  audit-log/route.ts          # GET: PO audit trail
  gst-entities/route.ts       # GET: GST entity master
  status/[poId]/route.ts      # GET: Check PO status in Zoho
```

### Frontend Wizard:
```
app/zoho-po/
  page.tsx                    # Redirects to /new
  new/page.tsx                # Step 1: Invoice upload + AI parse
  context/page.tsx            # Steps 2-5: City -> GST -> Vendor -> Billing -> Review
  confirmation/page.tsx       # Step 6: PO number + Zoho deep link
  history/page.tsx            # Past POs with status badges
  layout.tsx                  # Tab navigation (New PO / History)

frontend/components/zoho-po/
  InvoiceUpload.tsx           # Drag-and-drop upload zone
  StepIndicator.tsx           # 5-step progress indicator
  POFlowContext.tsx           # Cross-step state management

frontend/context/
  POFlowContext.tsx           # Enhanced wizard state context
  POFlowTypes.ts              # Frontend type exports
```

### Database:
```
backend/db/migrations/
  zoho_po_module.sql          # Audit log, vendor cache, entity master, settings
```

---

## 3. MCP Architecture (The Core Innovation)

### 3.1 What is the MCP Server?

The **Zoho Books MCP Server** is the heart of this module. It is an MCP-compliant server built with `@modelcontextprotocol/sdk` that exposes Zoho Books operations as **discoverable, callable tools**. AI agents don't need to know Zoho's API -- they discover the tools through the MCP protocol and call them with simple JSON arguments.

### 3.2 How It Works

```
AI Agent (Claude, GPT-4o, etc.)
    |
    |  1. Connects to /api/mcp/zoho (Streamable HTTP)
    |  2. Calls tools/list -> discovers 9 available tools
    |  3. Calls tools/call with arguments
    v
+-------------------------------------------+
|  Zoho Books MCP Server                    |
|  (lib/zoho-mcp-server.ts)                 |
|                                           |
|  Tools:                                   |
|  - create_purchase_order                  |
|  - get_vendors                            |
|  - get_vendor_by_id                       |
|  - create_vendor                          |
|  - get_purchase_order                     |
|  - get_gst_entities                       |
|  - parse_invoice                          |
|  - search_empanelled_vendor               |
|  - calculate_gst                          |
+-------------------------------------------+
    |
    |  Validates args, calls business logic
    v
+-------------------------------------------+
|  Backend Services                         |
|  - zoho-client.ts (Zoho REST API)         |
|  - vendor-service.ts (fuzzy matching)     |
|  - gst-engine.ts (tax calculation)        |
|  - document-parser.ts (AI OCR)            |
+-------------------------------------------+
```

### 3.3 Transport: Streamable HTTP

The MCP server uses `WebStandardStreamableHTTPServerTransport` (Web Standard APIs), making it compatible with Next.js App Router:

- **POST**: JSON-RPC messages (tool calls, initialization)
- **GET**: SSE stream for server-to-client notifications
- **DELETE**: Session termination
- **Stateful**: Sessions tracked via `sessionIdGenerator` with `InMemoryEventStore`

### 3.4 MCP Client for Internal Use

The app's own code uses `lib/zoho-mcp-client.ts` to call MCP tools internally:

```typescript
import { callZohoTool, parseInvoiceViaMCP } from "@/lib/zoho-mcp-client";

// Parse an invoice
const parsed = await parseInvoiceViaMCP(base64, "invoice.pdf", "claude");

// Create a PO
const po = await callZohoTool("create_purchase_order", {
  org_id: "...",
  vendor_id: "...",
  line_items: [...],
  entity_gstin: "...",
  ...
});
```

### 3.5 Why MCP?

| Without MCP | With MCP |
|-------------|----------|
| Each AI integration requires custom Zoho API code | AI agents discover tools automatically via `tools/list` |
| AI models need Zoho API docs in context | Tool descriptions embedded in the protocol |
| Hard to swap AI providers | Any MCP-compatible agent works (Claude, GPT, etc.) |
| No standardization | Standardized MCP protocol (Anthropic/open standard) |
| Auth managed per integration | Centralized auth in the MCP server |

---

## 4. Data Models

### 4.1 Audit Log Table
```sql
CREATE TABLE IF NOT EXISTS zoho_po_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    property_id UUID REFERENCES properties(id),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Input
    invoice_filename TEXT NOT NULL,
    invoice_file_url TEXT,
    parsed_invoice_data JSONB,
    user_context JSONB,           -- Answers to 5 questions
    ai_model_used TEXT NOT NULL,  -- claude|openai|gemini|groq
    
    -- Processing
    vendor_id TEXT,               -- Zoho vendor ID
    vendor_name TEXT,
    is_new_vendor BOOLEAN DEFAULT false,
    
    -- Output
    po_id TEXT,                   -- Zoho PO ID
    po_number TEXT,
    po_amount DECIMAL(12,2),
    po_status TEXT,               -- created|failed|draft
    zoho_response JSONB,
    
    -- Metrics
    processing_time_ms INTEGER,
    extraction_confidence DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_zoho_po_audit_org ON zoho_po_audit_log(organization_id);
CREATE INDEX idx_zoho_po_audit_created ON zoho_po_audit_log(created_at);
CREATE INDEX idx_zoho_po_audit_status ON zoho_po_audit_log(po_status);
```

### 3.2 Vendor Cache Table
```sql
CREATE TABLE IF NOT EXISTS zoho_po_vendor_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Zoho vendor data
    zoho_vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    legal_name TEXT,
    gstin TEXT,
    pan TEXT,
    billing_address JSONB,
    payment_terms TEXT,           -- net_30|net_45|advance
    bank_details JSONB,
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Status
    is_empanelled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(organization_id, zoho_vendor_id)
);

CREATE INDEX idx_vendor_cache_org ON zoho_po_vendor_cache(organization_id);
CREATE INDEX idx_vendor_cache_name ON zoho_po_vendor_cache USING gin(to_tsvector('simple', vendor_name));
CREATE INDEX idx_vendor_cache_gstin ON zoho_po_vendor_cache(gstin);
```

### 3.3 Entity Master Table (GSTIN ↔ Entity ↔ Address)
```sql
CREATE TABLE IF NOT EXISTS zoho_po_entity_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Entity info
    entity_name TEXT NOT NULL,           -- e.g., "Autopilot Offices Pvt. Ltd."
    legal_entity_name TEXT,
    gstin TEXT NOT NULL,
    state_code TEXT NOT NULL,            -- 27 = Maharashtra, etc.
    state_name TEXT NOT NULL,
    
    -- Address
    billing_address JSONB NOT NULL,      -- {line1, line2, city, state, pincode}
    shipping_address JSONB,              -- optional
    
    -- Zoho mapping
    zoho_organization_id TEXT,           -- Zoho org ID if different
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(organization_id, gstin)
);

CREATE INDEX idx_entity_master_org ON zoho_po_entity_master(organization_id);
CREATE INDEX idx_entity_master_state ON zoho_po_entity_master(state_code);
```

### 3.4 Module Settings Table
```sql
CREATE TABLE IF NOT EXISTS zoho_po_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id),
    
    -- Zoho credentials (encrypted at application layer if needed)
    zoho_organization_id TEXT,
    zoho_access_token TEXT,
    zoho_refresh_token TEXT,
    zoho_token_expires_at TIMESTAMPTZ,
    
    -- AI Configuration
    ai_model_provider TEXT DEFAULT 'claude',  -- claude|openai|gemini|groq
    ai_model_name TEXT,                       -- e.g., "claude-sonnet-4-20250514"
    
    -- Business rules
    po_approval_threshold DECIMAL(12,2) DEFAULT 100000,  -- INR 1L
    auto_retry_enabled BOOLEAN DEFAULT true,
    max_retry_count INTEGER DEFAULT 3,
    
    -- Feature flags
    is_enabled BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. TypeScript Types (backend/lib/zoho-po/types.ts)

```typescript
// ========== INVOICE PARSING ==========

export interface ParsedInvoice {
    vendor_name: string;
    vendor_gstin?: string;
    vendor_address?: string;
    invoice_number: string;
    invoice_date: string;         // ISO date
    line_items: ParsedLineItem[];
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;             // INR default
    confidence: number;           // 0-1 extraction confidence
}

export interface ParsedLineItem {
    description: string;
    quantity: number;
    unit: string;                 -- pcs, kg, m, etc.
    unit_price: number;
    total_price: number;
    tax_rate?: number;
    tax_amount?: number;
    hsn_code?: string;
}

// ========== USER CONTEXT (5 Questions) ==========

export interface UserContext {
    city: string;                    // Q1: City/site
    gstin: string;                   // Q2: GST registration
    vendor_type: 'empanelled' | 'new'; // Q3
    vendor_id?: string;              // If empanelled: Zoho vendor ID
    new_vendor?: NewVendorInput;     // If new: vendor details
    billing_address_id: string;      // Q4: Selected billing address/entity
    confirmed_line_items: ConfirmedLineItem[]; // Q5: User-confirmed line items
    notes?: string;
}

export interface NewVendorInput {
    legal_name: string;
    gstin: string;
    pan: string;
    billing_address: Address;
    payment_terms: 'net_30' | 'net_45' | 'advance';
    bank_account?: BankAccount;
    contact_email?: string;
    contact_phone?: string;
}

export interface ConfirmedLineItem {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;             // Final tax rate %
    tax_amount: number;
    total_price: number;
    hsn_code?: string;
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;              // default "India"
}

export interface BankAccount {
    account_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
}

// ========== ZOHO PO PAYLOAD ==========

export interface ZohoPOPayload {
    vendor_id: string;
    purchaseorder_number?: string;
    date: string;                 // YYYY-MM-DD
    delivery_date?: string;
    reference_number?: string;    // Original invoice number
    line_items: ZohoPOLineItem[];
    notes?: string;
    terms?: string;
    custom_fields?: Record<string, string>;
    
    // Tax & entity info
    is_intra_state: boolean;      // true = CGST+SGST, false = IGST
    gst_treatment: string;
    entity_gstin: string;
    billing_address: Address;
    shipping_address?: Address;
}

export interface ZohoPOLineItem {
    item_id?: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;                 // unit price
    tax_id?: string;
    tax_name?: string;
    tax_percentage: number;
    tax_type: 'cgst' | 'sgst' | 'igst';
    item_total: number;
    hsn_or_sac?: string;
}

// ========== AI MIDDLEWARE ==========

export type AIModelProvider = 'claude' | 'openai' | 'gemini' | 'groq';

export interface AIModelConfig {
    provider: AIModelProvider;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
}

export interface AIParseResult {
    parsed_invoice: ParsedInvoice;
    raw_response: string;
    latency_ms: number;
    model_used: string;
}

export interface AIMiddlewareResponse {
    zoho_payload: ZohoPOPayload;
    processing_notes: string[];
    confidence: number;
    model_used: string;
    latency_ms: number;
}

// ========== GST ENGINE ==========

export interface GSTCalculation {
    is_intra_state: boolean;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
    total_tax_rate: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    taxable_value: number;
    total_amount: number;
}

export interface GSTEntity {
    id: string;
    entity_name: string;
    gstin: string;
    state_code: string;
    state_name: string;
    billing_address: Address;
}

// ========== VENDOR ==========

export interface VendorMatch {
    vendor: VendorCacheRecord;
    match_score: number;          // 0-1 fuzzy match score
    match_reason: string;
}

export interface VendorCacheRecord {
    id: string;
    zoho_vendor_id: string;
    vendor_name: string;
    legal_name?: string;
    gstin?: string;
    pan?: string;
    billing_address?: Address;
    payment_terms?: string;
    is_empanelled: boolean;
}

// ========== API RESPONSES ==========

export interface POCreationResponse {
    success: boolean;
    po_id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    zoho_deep_link: string;
    message: string;
    audit_log_id: string;
}

export interface POAuditLogEntry {
    id: string;
    invoice_filename: string;
    vendor_name: string;
    po_number?: string;
    po_amount?: number;
    po_status: string;
    ai_model_used: string;
    created_at: string;
    processing_time_ms?: number;
    error_message?: string;
}

// ========== MODULE SETTINGS ==========

export interface ZohoPOSettings {
    organization_id: string;
    zoho_organization_id?: string;
    ai_model_provider: AIModelProvider;
    ai_model_name?: string;
    po_approval_threshold: number;
    auto_retry_enabled: boolean;
    max_retry_count: number;
    is_enabled: boolean;
    require_approval: boolean;
}
```

---

## 5. AI Middleware Interface

### 5.1 Abstraction Layer

```typescript
// backend/lib/zoho-po/ai-middleware.ts

interface ModelAdapter {
    parseInvoice(documentBase64: string, filename: string): Promise<AIParseResult>;
    mapToZohoPayload(
        parsedInvoice: ParsedInvoice,
        userContext: UserContext,
        gstCalculation: GSTCalculation
    ): Promise<AIMiddlewareResponse>;
}

export function getModelAdapter(config: AIModelConfig): ModelAdapter;
export function getDefaultAdapter(orgSettings: ZohoPOSettings): ModelAdapter;
```

### 5.2 Environment-Based Model Selection

```
AI_MODEL_PROVIDER=claude     # claude | openai | gemini | groq
AI_MODEL_NAME=claude-sonnet-4-20250514  # optional override
```

Organization-level override via `zoho_po_settings.ai_model_provider`.

### 5.3 Document Parser Prompt (Standardized)

All model adapters use the same extraction prompt structure:

```
You are an expert invoice parsing system. Extract the following fields from this 
Proforma Invoice document and return ONLY valid JSON matching this schema:

{
  "vendor_name": string,
  "vendor_gstin": string (optional),
  "vendor_address": string (optional),
  "invoice_number": string,
  "invoice_date": "YYYY-MM-DD",
  "line_items": [
    {
      "description": string,
      "quantity": number,
      "unit": string,
      "unit_price": number,
      "total_price": number,
      "tax_rate": number (percentage, optional),
      "tax_amount": number (optional),
      "hsn_code": string (optional)
    }
  ],
  "subtotal": number,
  "tax_amount": number,
  "total_amount": number,
  "currency": string (default "INR"),
  "confidence": number (0-1, your confidence in the extraction)
}

Rules:
- Extract ALL line items visible on the invoice
- Do NOT calculate or invent values — extract only what's on the document
- For quantities, extract the numeric value only
- For dates, use ISO format YYYY-MM-DD
- If a field is unclear or not visible, use null or omit it
- Confidence should reflect your certainty: 1.0 = perfect readability, 0.5 = blurry/partial, 0.0 = unreadable
```

### 5.4 Zoho Payload Mapping Prompt

```
You are a procurement data mapping specialist. Given parsed invoice data and user 
context, produce a Zoho Books Purchase Order payload.

Input:
- Parsed Invoice: {parsedInvoice}
- User Context: {userContext}
- GST Calculation: {gstCalculation}

Rules:
- Use ONLY the line items confirmed by the user (from userContext.confirmed_line_items)
- Apply the GST calculation provided (do NOT recalculate tax)
- Set tax_type per line item: "igst" for inter-state, "cgst"+"sgst" for intra-state
- Include HSN codes if available
- reference_number = original invoice number
- notes = any user-provided notes
```

---

## 6. GST Logic Engine

### 6.1 Interface

```typescript
// backend/lib/zoho-po/gst-engine.ts

export function determineGSTTreatment(
    vendorState: string,           // Vendor's state (from GSTIN or address)
    entityGSTIN: string,           // Selected entity's GSTIN
    lineItems: Array<{ hsn_code?: string; taxable_value: number }>
): GSTCalculation;

export function getStateFromGSTIN(gstin: string): string;
export function isIntraState(
    vendorState: string,
    entityState: string
): boolean;
```

### 6.2 GST Rate Rules (v1)

| HSN Code Pattern | CGST | SGST | IGST | Total |
|-----------------|------|------|------|-------|
| Default (goods) | 9%   | 9%   | 18%  | 18%   |
| Services (SAC)  | 9%   | 9%   | 18%  | 18%   |
| Essential goods | 2.5% | 2.5% | 5%   | 5%    |

GST treatment:
- **Intra-state** (vendor state == entity state): CGST + SGST
- **Inter-state** (vendor state != entity state): IGST

### 6.3 State Mapping

GSTIN first 2 digits → State:
- 27: Maharashtra
- 29: Karnataka
- 33: Tamil Nadu
- 36: Telangana
- 24: Gujarat
- 06: Haryana
- 09: Uttar Pradesh
- 07: Delhi
- 23: Madhya Pradesh
- 21: Odisha
- 10: Bihar
- 20: Jharkhand
- 03: Punjab
- 04: Chandigarh
- 08: Rajasthan
- 30: Goa
- 32: Kerala
- 34: Puducherry
- 35: Andaman & Nicobar
- 37: Dadra & Nagar Haveli
- 38: Daman & Diu
- 39: Lakshadweep
- 96: Jammu & Kashmir

---

## 7. Zoho Books API Client

### 7.1 Authentication

Uses OAuth 2.0 with refresh token flow. Tokens stored per-organization in `zoho_po_settings`.

```typescript
// backend/lib/zoho-po/zoho-client.ts

export class ZohoBooksClient {
    constructor(orgSettings: ZohoPOSettings);
    
    async ensureValidToken(): Promise<string>;  // Refreshes if expired
    
    // Vendor operations
    async getVendors(): Promise<ZohoVendor[]>;
    async getVendor(vendorId: string): Promise<ZohoVendor>;
    async createVendor(vendor: NewVendorInput): Promise<{ vendor_id: string; vendor_name: string }>;
    async searchVendors(query: string): Promise<ZohoVendor[]>;
    
    // PO operations
    async createPurchaseOrder(payload: ZohoPOPayload): Promise<{
        purchaseorder_id: string;
        purchaseorder_number: string;
        status: string;
        total: number;
    }>;
    async getPurchaseOrder(poId: string): Promise<ZohoPORecord>;
    
    // Organization
    async getOrganizationDetails(): Promise<ZohoOrganization>;
}
```

### 7.2 API Endpoints

Base URL: `https://www.zohoapis.com/books/v3`

Key endpoints:
- `GET /contacts?vendor=true&organization_id={orgId}` — List vendors
- `POST /contacts?organization_id={orgId}` — Create vendor
- `POST /purchaseorders?organization_id={orgId}` — Create PO
- `GET /purchaseorders/{poId}?organization_id={orgId}` — Get PO
- `GET /organization` — Organization details

### 7.3 Token Refresh Flow

```
1. Check zoho_po_settings.zoho_token_expires_at
2. If expired or expiring within 5 minutes:
   a. POST https://accounts.zoho.com/oauth/v2/token
      ?refresh_token={refresh_token}
      &client_id={ZOHO_CLIENT_ID}
      &client_secret={ZOHO_CLIENT_SECRET}
      &grant_type=refresh_token
   b. Update access_token and expires_at in DB
3. Return valid access token
```

---

## 8. API Routes Specification

### 8.1 POST /api/zoho-po/parse-invoice

**Request:** `multipart/form-data` with `file` (PDF/JPG/PNG, max 10MB)

**Response:**
```json
{
  "success": true,
  "parsed_invoice": {
    "vendor_name": "Raj Electricals Pvt. Ltd.",
    "vendor_gstin": "27AABCR1234Z1Z5",
    "invoice_number": "PI-2026-0542",
    "invoice_date": "2026-04-28",
    "line_items": [
      {
        "description": "LED Panel Light 2x2",
        "quantity": 50,
        "unit": "pcs",
        "unit_price": 850.00,
        "total_price": 42500.00,
        "tax_rate": 18,
        "tax_amount": 7650.00,
        "hsn_code": "9405"
      }
    ],
    "subtotal": 42500.00,
    "tax_amount": 7650.00,
    "total_amount": 50150.00,
    "currency": "INR",
    "confidence": 0.94
  },
  "processing_time_ms": 2340,
  "model_used": "claude-sonnet-4-20250514"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Document parsing failed",
  "details": "Could not extract line items from document",
  "confidence_too_low": true
}
```

### 8.2 GET /api/zoho-po/vendors

**Query Params:** `?search={query}&orgId={orgId}`

**Response:**
```json
{
  "vendors": [
    {
      "id": "uuid",
      "zoho_vendor_id": "123456789",
      "vendor_name": "Raj Electricals Pvt. Ltd.",
      "legal_name": "Raj Electricals Private Limited",
      "gstin": "27AABCR1234Z1Z5",
      "pan": "AABCR1234Z",
      "match_score": 0.92,
      "match_reason": "Name fuzzy match"
    }
  ]
}
```

### 8.3 POST /api/zoho-po/vendors

**Body (new vendor):**
```json
{
  "legal_name": "New Vendor Pvt. Ltd.",
  "gstin": "27AABCX9999Z1Z5",
  "pan": "AABCX9999Z",
  "billing_address": {
    "line1": "123, Industrial Estate",
    "line2": "Phase 2",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "payment_terms": "net_30",
  "bank_account": {
    "account_name": "New Vendor Pvt. Ltd.",
    "account_number": "123456789012",
    "ifsc_code": "HDFC0000123",
    "bank_name": "HDFC Bank"
  },
  "contact_email": "accounts@newvendor.com",
  "contact_phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "vendor_id": "987654321",
  "vendor_name": "New Vendor Pvt. Ltd.",
  "message": "Vendor created in Zoho Books"
}
```

### 8.4 POST /api/zoho-po/create

**Body:**
```json
{
  "parsed_invoice": { ... },
  "user_context": {
    "city": "Mumbai",
    "gstin": "27AABCU9603R1ZX",
    "vendor_type": "empanelled",
    "vendor_id": "123456789",
    "billing_address_id": "entity-uuid",
    "confirmed_line_items": [ ... ],
    "notes": "Urgent delivery required"
  }
}
```

**Response:**
```json
{
  "success": true,
  "po_id": "1234567890123",
  "po_number": "PO-2026-0104",
  "vendor_name": "Raj Electricals Pvt. Ltd.",
  "total_amount": 50150.00,
  "zoho_deep_link": "https://books.zoho.com/app#/purchaseorders/1234567890123",
  "message": "Purchase Order created successfully",
  "audit_log_id": "uuid",
  "processing_time_ms": 3420
}
```

### 8.5 GET /api/zoho-po/audit-log

**Query Params:** `?orgId={orgId}&page={n}&limit={20}`

**Response:**
```json
{
  "entries": [ ...POAuditLogEntry... ],
  "total": 156,
  "page": 1,
  "limit": 20
}
```

### 8.6 GET /api/zoho-po/gst-entities

**Query Params:** `?orgId={orgId}&city={city}`

**Response:**
```json
{
  "entities": [
    {
      "id": "uuid",
      "entity_name": "Autopilot Offices Pvt. Ltd.",
      "gstin": "27AABCU9603R1ZX",
      "state_code": "27",
      "state_name": "Maharashtra",
      "billing_address": { ... }
    }
  ]
}
```

---

## 9. Frontend Wizard Flow

### 9.1 Step 1: Upload (`/zoho-po/new`)
- Drag-and-drop file upload zone
- Accept: PDF, JPG, PNG (max 10MB)
- Show upload progress
- After upload, call `/api/zoho-po/parse-invoice`
- Display parsed preview (vendor name, total amount, confidence)
- If confidence < 0.8, show warning banner
- "Continue" button → navigate to context prompt

### 9.2 Step 2: Context Prompt (`/zoho-po/context`)
5-question wizard, one question at a time:

**Q1: City/Site**
- Dropdown of active sites (fetched from properties table)
- Pre-select if only one property for user

**Q2: GST Registration**
- Dropdown filtered by Q1's state
- Auto-select if only one GSTIN for that state
- Show GSTIN + entity name

**Q3: Vendor Type**
- Toggle: Empanelled / New
- Search box for empanelled vendors with fuzzy match
- If vendor name from invoice matches, pre-select and highlight
- If new vendor selected → show NewVendorForm modal

**Q4: Billing Address**
- Auto-populated from Q1 + Q2
- If single entity → auto-confirmed
- Otherwise dropdown of matching entities

**Q5: Line Item Review**
- Editable table of all parsed line items
- Columns: Description, Qty, Unit, Unit Price, Tax %, Tax Amt, Total
- Inline editing enabled
- "Add line item" button for missed items
- Show GST treatment (IGST vs CGST+SGST) based on state comparison

### 9.3 Step 3: Review & Submit (`/zoho-po/review`)
- Summary card: Vendor, Entity, GSTIN, City, Total
- Line item table (read-only)
- "Create Purchase Order" button
- Loading state with progress steps

### 9.4 Step 4: Confirmation (`/zoho-po/confirmation`)
- Success animation
- PO number (large, copyable)
- Vendor name, total amount
- "View in Zoho Books" deep link button
- "Create Another PO" button
- "View History" link

### 9.5 History Page (`/zoho-po/history`)
- Table: Date, Invoice, Vendor, PO Number, Amount, Status, Model Used
- Pagination
- Filter by status, date range
- Click row → detail view with full audit

---

## 10. Environment Variables

```bash
# Zoho Books API
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REDIRECT_URI=https://your-app.com/api/auth/zoho/callback
ZOHO_BOOKS_API_DOMAIN=https://www.zohoapis.com/books/v3

# AI Model API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key

# AI Configuration
AI_MODEL_PROVIDER=claude          # claude | openai | gemini | groq
AI_MODEL_NAME=                    # optional override

# Module Configuration
ZOHO_PO_MAX_FILE_SIZE=10485760    # 10MB in bytes
ZOHO_PO_MIN_CONFIDENCE=0.80       # Minimum extraction confidence
ZOHO_PO_MAX_RETRY_COUNT=3
ZOHO_PO_RETRY_BASE_DELAY_MS=1000
```

---

## 11. Error Handling & Retry Logic

### 11.1 Zoho API Errors
| Error | Action |
|-------|--------|
| 401 Unauthorized | Refresh token, retry once |
| 429 Rate Limited | Exponential backoff (1s, 2s, 4s), max 3 retries |
| 500 Zoho Error | Retry with backoff, then fail with user message |
| Network Error | Retry 3 times, then queue for later |

### 11.2 AI Parser Errors
| Error | Action |
|-------|--------|
| Low confidence (< 0.8) | Flag fields in red, require manual confirmation |
| Parse failure | Show error, allow re-upload |
| Timeout | Auto-retry with same model, then fallback model |
| Model unavailable | Use next available model per priority list |

### 11.3 Audit Log on Failure
Every failure is logged:
- Error message and stack trace
- Input data (invoice, context)
- Model used and latency
- Retry count
- Final error status

---

## 12. Implementation Order

1. **Foundation** (all other work depends on this):
   - Database migrations
   - Shared types (`backend/lib/zoho-po/types.ts`)
   - GST engine (`backend/lib/zoho-po/gst-engine.ts`)
   
2. **Backend Core** (can be parallel):
   - Zoho Books client + vendor service
   - AI middleware + model adapters
   - Document parser
   
3. **API Routes** (depends on backend core):
   - All 6 API route handlers
   
4. **Frontend** (depends on API routes):
   - All 5 pages + components
   
5. **Integration**:
   - Navigation integration
   - Role-based access
   - End-to-end testing
