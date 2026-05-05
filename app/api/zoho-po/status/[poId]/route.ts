/**
 * GET /api/zoho-po/status/{poId}?orgId={uuid}
 *
 * Check a Purchase Order's status in Zoho Books.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { ZohoBooksClient, ZohoBooksError } from '@/backend/lib/zoho-po/zoho-client';
import type { ZohoPOSettings, ZohoPORecord } from '@/backend/lib/zoho-po/types';

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * Get PO status from Zoho Books.
 *
 * Path params:
 *   poId (required) — Zoho Purchase Order ID
 *
 * Query params:
 *   orgId (required) — Organization UUID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ poId: string }> }
) {
    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[Status] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse params ─────────────────────────────────────────
        const { poId } = await params;

        if (!poId || poId.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order ID is required' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'Missing required query parameter: orgId' },
                { status: 400 }
            );
        }

        // ── 3. Validate user belongs to org ─────────────────────────
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

        // ── 4. Get org settings ─────────────────────────────────────
        const { data: settings, error: settingsError } = await adminSupabase
            .from('zoho_po_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (settingsError || !settings) {
            console.error('[Status] Settings not found:', settingsError);
            return NextResponse.json(
                { success: false, error: 'Zoho PO settings not found for this organization' },
                { status: 404 }
            );
        }

        const typedSettings = settings as unknown as ZohoPOSettings;

        // ── 5. Call Zoho Books API ──────────────────────────────────
        const client = new ZohoBooksClient(typedSettings);
        const poRecord: ZohoPORecord = await client.getPurchaseOrder(poId);

        // ── 6. Return PO status ─────────────────────────────────────
        return NextResponse.json({
            success: true,
            po_id: poRecord.purchaseorder_id,
            po_number: poRecord.purchaseorder_number,
            status: poRecord.status,
            date: poRecord.date,
            total: poRecord.total,
            sub_total: poRecord.sub_total,
            tax_total: poRecord.tax_total,
            vendor_id: poRecord.vendor_id,
            vendor_name: poRecord.vendor_name,
            line_items_count: poRecord.line_items?.length ?? 0,
            zoho_deep_link: `https://books.zoho.com/app#/purchaseorders/${poRecord.purchaseorder_id}`,
        });
    } catch (error) {
        if (error instanceof ZohoBooksError) {
            console.error('[Status] Zoho error:', error);

            // Handle 404 specifically
            if (error.statusCode === 404 || error.message.toLowerCase().includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'Purchase order not found in Zoho Books' },
                    { status: 404 }
                );
            }

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
        console.error('[Status] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
