/**
 * GET  /api/zoho-po/vendors?orgId={uuid}&search={query}&limit={number}
 * POST /api/zoho-po/vendors
 *
 * GET:  Search empanelled vendors with fuzzy matching
 * POST: Create a new vendor in Zoho Books
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { searchEmpanelledVendors, createNewVendor } from '@/backend/lib/zoho-po/vendor-service';
import { ZohoBooksClient, ZohoBooksError } from '@/backend/lib/zoho-po/zoho-client';
import type { NewVendorInput, ZohoPOSettings } from '@/backend/lib/zoho-po/types';
import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const NewVendorInputSchema = z.object({
    legal_name: z.string().min(1, 'Legal name is required'),
    gstin: z.string().length(15, 'GSTIN must be 15 characters'),
    pan: z.string().length(10, 'PAN must be 10 characters').optional(),
    billing_address: z.object({
        line1: z.string().min(1, 'Address line 1 is required'),
        line2: z.string().optional(),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        pincode: z.string().min(6, 'Pincode is required'),
        country: z.string().default('India'),
    }),
    payment_terms: z.enum(['net_30', 'net_45', 'advance']),
    bank_account: z.object({
        account_name: z.string().min(1, 'Account name is required'),
        account_number: z.string().min(1, 'Account number is required'),
        ifsc_code: z.string().min(11, 'IFSC code is required'),
        bank_name: z.string().min(1, 'Bank name is required'),
    }).optional(),
    contact_email: z.string().email('Invalid email').optional(),
    contact_phone: z.string().optional(),
});

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * Search empanelled vendors.
 *
 * Query params:
 *   orgId  (required) — Organization UUID
 *   search (required) — Search query string
 *   limit  (optional) — Max results (default 20, max 100)
 */
export async function GET(request: NextRequest) {
    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[Vendors:GET] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse query params ───────────────────────────────────
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        const search = searchParams.get('search') || '';
        const limitParam = searchParams.get('limit');

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'Missing required query parameter: orgId' },
                { status: 400 }
            );
        }

        // Validate orgId is a UUID-like string
        const UUID_REGEX =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(orgId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid orgId format. Expected UUID.' },
                { status: 400 }
            );
        }

        // Parse and clamp limit
        let limit = 20;
        if (limitParam) {
            limit = parseInt(limitParam, 10);
            if (isNaN(limit) || limit < 1) limit = 20;
            if (limit > 100) limit = 100;
        }

        // ── 3. Verify user belongs to org ───────────────────────────
        const adminSupabase = createAdminClient();
        const { data: membership } = await adminSupabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: you do not belong to this organization' },
                { status: 403 }
            );
        }

        // ── 4. Call vendor service ──────────────────────────────────
        const matches = await searchEmpanelledVendors(orgId, search, { limit });

        return NextResponse.json({
            success: true,
            vendors: matches,
            count: matches.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[Vendors:GET] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}

// ── POST ─────────────────────────────────────────────────────────────────────

/**
 * Create a new vendor in Zoho Books.
 *
 * Body: NewVendorInput JSON
 * Query params: orgId (required) — Organization UUID
 */
export async function POST(request: NextRequest) {
    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[Vendors:POST] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse query params ───────────────────────────────────
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'Missing required query parameter: orgId' },
                { status: 400 }
            );
        }

        // ── 3. Validate request body ────────────────────────────────
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const validation = NewVendorInputSchema.safeParse(body);
        if (!validation.success) {
            const issues = validation.error.issues.map(
                (i) => `${i.path.join('.')}: ${i.message}`
            );
            return NextResponse.json(
                { success: false, error: `Validation failed: ${issues.join('; ')}` },
                { status: 400 }
            );
        }

        const vendorData = validation.data as NewVendorInput;

        // ── 4. Verify user belongs to org ───────────────────────────
        const adminSupabase = createAdminClient();
        const { data: membership } = await adminSupabase
            .from('organization_members')
            .select('id, role')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: you do not belong to this organization' },
                { status: 403 }
            );
        }

        // ── 5. Get org settings ─────────────────────────────────────
        const { data: settings, error: settingsError } = await adminSupabase
            .from('zoho_po_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (settingsError || !settings) {
            console.error('[Vendors:POST] Settings not found:', settingsError);
            return NextResponse.json(
                { success: false, error: 'Zoho PO settings not found for this organization' },
                { status: 404 }
            );
        }

        const typedSettings = settings as unknown as ZohoPOSettings;

        // ── 6. Create vendor ────────────────────────────────────────
        const result = await createNewVendor(orgId, vendorData, typedSettings);

        return NextResponse.json(
            {
                success: true,
                vendor_id: result.vendor_id,
                vendor_name: result.vendor_name,
                message: `Vendor "${result.vendor_name}" created successfully in Zoho Books.`,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof ZohoBooksError) {
            console.error('[Vendors:POST] Zoho error:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: `Zoho Books error: ${error.message}`,
                    retryable: error.retryable,
                },
                { status: error.statusCode || 502 }
            );
        }

        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[Vendors:POST] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
