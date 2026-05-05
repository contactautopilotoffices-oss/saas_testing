// ============================================
// Zoho PO Module — Shared TypeScript Types
// ============================================

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
    unit: string;                 // pcs, kg, m, etc.
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

// ========== ZOHO API TYPES ==========

export interface ZohoVendor {
    contact_id: string;
    contact_name: string;
    company_name?: string;
    gst_treatment?: string;
    gst_no?: string;
    pan?: string;
    billing_address?: ZohoAddress;
    payment_terms?: string;
    contact_persons?: ZohoContactPerson[];
}

export interface ZohoAddress {
    address: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface ZohoContactPerson {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
}

export interface ZohoPORecord {
    purchaseorder_id: string;
    purchaseorder_number: string;
    date: string;
    status: string;
    vendor_id: string;
    vendor_name: string;
    total: number;
    sub_total: number;
    tax_total: number;
    line_items: ZohoPOApiLineItem[];
}

export interface ZohoPOApiLineItem {
    line_item_id: string;
    item_id?: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    tax_id?: string;
    tax_name: string;
    tax_percentage: number;
    item_total: number;
    hsn_or_sac?: string;
}

export interface ZohoOrganization {
    organization_id: string;
    name: string;
    country: string;
    currency_code: string;
    time_zone: string;
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
    processing_time_ms: number;
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

// ========== MODEL ADAPTER INTERFACE ==========

export interface ModelAdapter {
    parseInvoice(documentBase64: string, filename: string): Promise<AIParseResult>;
    mapToZohoPayload(
        parsedInvoice: ParsedInvoice,
        userContext: UserContext,
        gstCalculation: GSTCalculation
    ): Promise<AIMiddlewareResponse>;
}
