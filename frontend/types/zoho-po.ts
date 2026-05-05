export interface LineItem {
    id?: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    tax_rate: number;
    tax_amount: number;
    hsn_code: string | null;
}

export interface ParsedInvoice {
    vendor_name: string;
    vendor_gstin: string | null;
    invoice_number: string;
    invoice_date: string;
    line_items: LineItem[];
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    confidence: number;
    raw_text?: string;
}

export interface GSTEntity {
    id: string;
    entity_name: string;
    gstin: string;
    state_code: string;
    state_name: string;
    billing_address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
}

export interface Vendor {
    id: string;
    zoho_vendor_id: string | null;
    vendor_name: string;
    legal_name: string | null;
    gstin: string | null;
    pan: string | null;
    match_score: number | null;
    match_reason: string | null;
}

export interface ConfirmedLineItem {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    total_price: number;
    hsn_code: string | null;
}

export interface UserContext {
    city: string;
    gstin: string;
    vendor_type: 'empanelled' | 'new';
    vendor_id?: string;
    new_vendor?: {
        vendor_id: string;
        vendor_name: string;
    };
    billing_address_id: string;
    confirmed_line_items: ConfirmedLineItem[];
    notes?: string;
}

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

export interface AuditLogEntry {
    id: string;
    invoice_filename: string;
    vendor_name: string | null;
    po_number: string | null;
    po_amount: number | null;
    po_status: 'created' | 'failed' | 'pending' | 'processing';
    ai_model_used: string;
    created_at: string;
    processing_time_ms: number | null;
    error_message: string | null;
}

export interface POFlowState {
    parsedInvoice: ParsedInvoice | null;
    userContext: Partial<UserContext>;
    currentStep: number;
    orgId: string;
    isSubmitting: boolean;
    result: POCreationResponse | null;
    error: string | null;
}

export const INDIAN_CITIES = [
    'Mumbai',
    'Pune',
    'Bangalore',
    'Chennai',
    'Hyderabad',
    'Delhi',
    'Gurgaon',
    'Noida',
    'Ahmedabad',
    'Kolkata',
    'Jaipur',
    'Kochi',
    'Chandigarh',
] as const;

export type IndianCity = (typeof INDIAN_CITIES)[number];

export const PAYMENT_TERMS = [
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 45', label: 'Net 45' },
    { value: 'Advance', label: 'Advance' },
] as const;
