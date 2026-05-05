/**
 * POST /api/zoho-po/create
 *
 * Full PO creation pipeline — the core endpoint.
 * Orchestrates: GST calculation → vendor resolution → AI mapping → Zoho PO creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { determineGSTCalculation, getStateFromGSTIN } from '@/backend/lib/zoho-po/gst-engine';
import { mapToZohoPayloadWithAdapter } from '@/backend/lib/zoho-po/ai-middleware';
import {
    searchEmpanelledVendors,
    findVendorMatch,
    createNewVendor,
} from '@/backend/lib/zoho-po/vendor-service';
import { ZohoBooksClient, ZohoBooksError } from '@/backend/lib/zoho-po/zoho-client';
import type {
    ParsedInvoice,
    UserContext,
    AIModelProvider,
    POCreationResponse,
    ZohoPOSettings,
    GSTCalculation,
} from '@/backend/lib/zoho-po/types';
import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const ConfirmedLineItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unit_price: z.number().nonnegative('Unit price must be non-negative'),
    tax_rate: z.number().min(0, 'Tax rate must be non-negative'),
    tax_amount: z.number().min(0, 'Tax amount must be non-negative'),
    total_price: z.number().positive('Total price must be positive'),
    hsn_code: z.string().optional(),
});

const NewVendorInputSchema = z.object({
    legal_name: z.string().min(1, 'Legal name is required'),
    gstin: z.string().length(15, 'GSTIN must be 15 characters'),
    pan: z.string().length(10, 'PAN must be 10 characters').optional(),
    billing_address: z.object({
        line1: z.string().min(1, 'Address line 1 is required'),
        line2: z.string().optional(),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        pincode: z.string().min(1, 'Pincode is required'),
        country: z.string().default('India'),
    }),
    payment_terms: z.enum(['net_30', 'net_45', 'advance']),
    bank_account: z
        .object({
            account_name: z.string(),
            account_number: z.string(),
            ifsc_code: z.string(),
            bank_name: z.string(),
        })
        .optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
});

const UserContextSchema = z.object({
    city: z.string().min(1, 'City is required'),
    gstin: z.string().length(15, 'GSTIN must be 15 characters'),
    vendor_type: z.enum(['empanelled', 'new']),
    vendor_id: z.string().optional(),
    new_vendor: NewVendorInputSchema.optional(),
    billing_address_id: z.string().min(1, 'Billing address ID is required'),
    confirmed_line_items: z
        .array(ConfirmedLineItemSchema)
        .min(1, 'At least one confirmed line item is required'),
    notes: z.string().optional(),
});

const ParsedInvoiceSchema = z.object({
    vendor_name: z.string().min(1, 'Vendor name is required'),
    vendor_gstin: z.string().length(15).optional(),
    vendor_address: z.string().optional(),
    invoice_number: z.string().min(1, 'Invoice number is required'),
    invoice_date: z.string().min(1, 'Invoice date is required'),
    line_items: z
        .array(
            z.object({
                description: z.string(),
                quantity: z.number(),
                unit: z.string(),
                unit_price: z.number(),
                total_price: z.number(),
                tax_rate: z.number().optional(),
                tax_amount: z.number().optional(),
                hsn_code: z.string().optional(),
            })
        )
        .min(1),
    subtotal: z.number().nonnegative(),
    tax_amount: z.number().nonnegative(),
    total_amount: z.number().positive(),
    currency: z.string().default('INR'),
    confidence: z.number().min(0).max(1),
});

const CreatePORequestSchema = z.object({
    parsed_invoice: ParsedInvoiceSchema,
    user_context: UserContextSchema,
    modelProvider: z.enum(['claude', 'openai', 'gemini', 'groq']).optional(),
    auditLogId: z.string().optional(),
});

// ── Deep link builder ────────────────────────────────────────────────────────

function buildZohoDeepLink(poId: string): string {
    return `https://books.zoho.com/app#/purchaseorders/${poId}`;
}

// ── POST ─────────────────────────────────────────────────────────────────────

/**
 * Create a Purchase Order in Zoho Books.
 *
 * Body:
 *   parsed_invoice: ParsedInvoice     — Parsed invoice data from /parse-invoice
 *   user_context:   UserContext        — User's answers to the 5 questions
 *   modelProvider?: AIModelProvider    — Optional AI model override
 *   auditLogId?:    string             — Optional existing audit log ID
 */
export async function POST(request: NextRequest) {
    const pipelineStart = Date.now();
    let auditLogId: string | undefined;
    let auditEntryCreated = false;

    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[CreatePO] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse & validate request body ────────────────────────
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const validation = CreatePORequestSchema.safeParse(body);
        if (!validation.success) {
            const issues = validation.error.issues.map(
                (i) => `${i.path.join('.')}: ${i.message}`
            );
            return NextResponse.json(
                { success: false, error: `Validation failed: ${issues.join('; ')}` },
                { status: 400 }
            );
        }

        const { parsed_invoice, user_context, modelProvider, auditLogId: existingAuditLogId } =
            validation.data;

        // ── 3. Determine orgId ──────────────────────────────────────
        // Get orgId from user_context or user's organization membership
        let orgId: string | null = null;

        // Try to get from the user's primary organization membership
        const adminSupabase = createAdminClient();
        const { data: memberships } = await adminSupabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .limit(1);

        if (memberships && memberships.length > 0) {
            orgId = memberships[0].organization_id;
        }

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'User is not associated with any organization' },
                { status: 400 }
            );
        }

        // ── 4. Fetch org settings ───────────────────────────────────
        const { data: settings, error: settingsError } = await adminSupabase
            .from('zoho_po_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (settingsError || !settings) {
            console.error('[CreatePO] Settings not found:', settingsError);
            return NextResponse.json(
                { success: false, error: 'Zoho PO settings not found for this organization' },
                { status: 404 }
            );
        }

        const typedSettings = settings as unknown as ZohoPOSettings;

        if (!typedSettings.is_enabled) {
            return NextResponse.json(
                { success: false, error: 'Zoho PO module is not enabled for this organization' },
                { status: 403 }
            );
        }

        // ── 5. Create or update audit log ───────────────────────────
        if (existingAuditLogId) {
            // Reuse existing audit log entry
            auditLogId = existingAuditLogId;
            await adminSupabase
                .from('zoho_po_audit_log')
                .update({
                    status: 'processing',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', auditLogId);
        } else {
            // Create new audit log entry
            const { data: auditEntry } = await adminSupabase
                .from('zoho_po_audit_log')
                .insert({
                    organization_id: orgId,
                    invoice_filename: parsed_invoice.invoice_number,
                    vendor_name: parsed_invoice.vendor_name,
                    invoice_number: parsed_invoice.invoice_number,
                    invoice_date: parsed_invoice.invoice_date,
                    invoice_amount: parsed_invoice.total_amount,
                    created_by: user.id,
                    status: 'processing',
                    ai_model_used: modelProvider || typedSettings.ai_model_provider || 'claude',
                    confidence_score: parsed_invoice.confidence,
                })
                .select()
                .single();

            if (auditEntry) {
                auditLogId = (auditEntry as Record<string, unknown>).id as string;
                auditEntryCreated = true;
            }
        }

        // ── 6. Determine GST calculation ────────────────────────────
        let gstCalc: GSTCalculation;
        try {
            // Get entity from entity master using user's GSTIN
            const { data: entityRows } = await adminSupabase
                .from('zoho_po_entity_master')
                .select('*')
                .eq('organization_id', orgId)
                .eq('gstin', user_context.gstin)
                .eq('is_active', true)
                .maybeSingle();

            // Determine vendor state from vendor GSTIN or city
            let vendorState: string;
            if (parsed_invoice.vendor_gstin) {
                vendorState = getStateFromGSTIN(parsed_invoice.vendor_gstin);
            } else {
                // Fallback: try to find vendor's state from city
                vendorState = user_context.city;
            }

            // Build line items for GST calculation from confirmed line items
            const gstLineItems = user_context.confirmed_line_items.map((item) => ({
                taxable_value: item.unit_price * item.quantity,
                hsn_code: item.hsn_code,
            }));

            // Get entity GSTIN (from entity master or user context)
            const entityGSTIN =
                (entityRows as Record<string, unknown> | null)?.gstin as string || user_context.gstin;

            gstCalc = determineGSTCalculation(vendorState, entityGSTIN, gstLineItems);
        } catch (gstErr) {
            const msg = gstErr instanceof Error ? gstErr.message : 'GST calculation failed';
            console.error('[CreatePO] GST calculation failed:', gstErr);

            // Update audit log with error
            if (auditLogId) {
                await adminSupabase
                    .from('zoho_po_audit_log')
                    .update({
                        status: 'error',
                        error_message: `GST calculation failed: ${msg}`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', auditLogId);
            }

            return NextResponse.json(
                { success: false, error: `GST calculation failed: ${msg}`, audit_log_id: auditLogId },
                { status: 422 }
            );
        }

        // ── 7. Resolve vendor ───────────────────────────────────────
        let vendorId: string;
        let vendorName: string;

        try {
            if (user_context.vendor_type === 'empanelled' && user_context.vendor_id) {
                // Use existing empanelled vendor
                const existingVendor = await findVendorMatch(
                    orgId,
                    parsed_invoice.vendor_name
                );

                if (existingVendor) {
                    vendorId = existingVendor.vendor.zoho_vendor_id;
                    vendorName = existingVendor.vendor.vendor_name;
                } else {
                    vendorId = user_context.vendor_id;
                    vendorName = parsed_invoice.vendor_name;
                }
            } else if (user_context.vendor_type === 'new' && user_context.new_vendor) {
                // Create new vendor in Zoho Books
                const newVendorResult = await createNewVendor(
                    orgId,
                    user_context.new_vendor,
                    typedSettings
                );
                vendorId = newVendorResult.vendor_id;
                vendorName = newVendorResult.vendor_name;
            } else {
                throw new Error(
                    'Invalid vendor configuration: must provide vendor_id for empanelled or new_vendor for new'
                );
            }
        } catch (vendorErr) {
            const msg = vendorErr instanceof Error ? vendorErr.message : 'Vendor resolution failed';
            console.error('[CreatePO] Vendor resolution failed:', vendorErr);

            if (auditLogId) {
                await adminSupabase
                    .from('zoho_po_audit_log')
                    .update({
                        status: 'error',
                        error_message: `Vendor resolution failed: ${msg}`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', auditLogId);
            }

            return NextResponse.json(
                { success: false, error: `Vendor resolution failed: ${msg}`, audit_log_id: auditLogId },
                { status: 422 }
            );
        }

        // ── 8. Map to Zoho PO payload using AI ──────────────────────
        let zohoPayload;
        try {
            const modelConfig = modelProvider
                ? { provider: modelProvider as AIModelProvider }
                : undefined;

            const mapResult = await mapToZohoPayloadWithAdapter(
                parsed_invoice,
                user_context,
                gstCalc,
                modelConfig
            );

            zohoPayload = mapResult.zoho_payload;
        } catch (mapErr) {
            const msg = mapErr instanceof Error ? mapErr.message : 'AI mapping failed';
            console.error('[CreatePO] AI payload mapping failed:', mapErr);

            if (auditLogId) {
                await adminSupabase
                    .from('zoho_po_audit_log')
                    .update({
                        status: 'error',
                        error_message: `AI mapping failed: ${msg}`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', auditLogId);
            }

            return NextResponse.json(
                { success: false, error: `AI payload mapping failed: ${msg}`, audit_log_id: auditLogId },
                { status: 500 }
            );
        }

        // Override vendor_id with the resolved one
        zohoPayload.vendor_id = vendorId;

        // ── 9. Create PO in Zoho Books ──────────────────────────────
        let poResult: {
            purchaseorder_id: string;
            purchaseorder_number: string;
            status: string;
            total: number;
        };

        try {
            const client = new ZohoBooksClient(typedSettings);
            poResult = await client.createPurchaseOrder(zohoPayload);
        } catch (poErr) {
            if (poErr instanceof ZohoBooksError) {
                console.error('[CreatePO] Zoho error:', poErr);

                if (auditLogId) {
                    await adminSupabase
                        .from('zoho_po_audit_log')
                        .update({
                            status: 'error',
                            error_message: `Zoho error: ${poErr.message}`,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', auditLogId);
                }

                return NextResponse.json(
                    {
                        success: false,
                        error: `Zoho Books error: ${poErr.message}`,
                        audit_log_id: auditLogId,
                        retryable: poErr.retryable,
                    },
                    { status: poErr.statusCode || 502 }
                );
            }

            const msg = poErr instanceof Error ? poErr.message : 'PO creation failed';
            console.error('[CreatePO] PO creation failed:', poErr);

            if (auditLogId) {
                await adminSupabase
                    .from('zoho_po_audit_log')
                    .update({
                        status: 'error',
                        error_message: `PO creation failed: ${msg}`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', auditLogId);
            }

            return NextResponse.json(
                { success: false, error: `PO creation failed: ${msg}`, audit_log_id: auditLogId },
                { status: 500 }
            );
        }

        // ── 10. Update audit log with success ───────────────────────
        const processingTimeMs = Date.now() - pipelineStart;

        if (auditLogId) {
            await adminSupabase
                .from('zoho_po_audit_log')
                .update({
                    status: 'created',
                    po_id: poResult.purchaseorder_id,
                    po_number: poResult.purchaseorder_number,
                    po_amount: poResult.total,
                    processing_time_ms: processingTimeMs,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', auditLogId);
        }

        // ── 11. Build and return response ───────────────────────────
        const response: POCreationResponse = {
            success: true,
            po_id: poResult.purchaseorder_id,
            po_number: poResult.purchaseorder_number,
            vendor_name: vendorName,
            total_amount: poResult.total,
            zoho_deep_link: buildZohoDeepLink(poResult.purchaseorder_id),
            message: `Purchase Order "${poResult.purchaseorder_number}" created successfully in Zoho Books.`,
            audit_log_id: auditLogId || '',
            processing_time_ms: processingTimeMs,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[CreatePO] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message, audit_log_id: auditLogId },
            { status: 500 }
        );
    }
}
