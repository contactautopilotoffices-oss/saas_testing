/**
 * GET /api/zoho-po/audit-log?orgId={uuid}&page={number}&limit={number}&status={filter}
 *
 * Get PO audit trail for the user's organization with pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import type { POAuditLogEntry } from '@/backend/lib/zoho-po/types';

// ── Valid status filters ─────────────────────────────────────────────────────

const VALID_STATUSES = [
    'parsed',
    'parsed_low_confidence',
    'processing',
    'created',
    'error',
    'cancelled',
] as const;

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * Get audit log entries for an organization.
 *
 * Query params:
 *   orgId  (required) — Organization UUID
 *   page   (optional) — Page number, 1-based (default 1)
 *   limit  (optional) — Page size (default 20, max 100)
 *   status (optional) — Filter by status
 */
export async function GET(request: NextRequest) {
    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[AuditLog] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse query params ───────────────────────────────────
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        const statusFilter = searchParams.get('status');

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'Missing required query parameter: orgId' },
                { status: 400 }
            );
        }

        // Validate status filter if provided
        if (
            statusFilter &&
            !VALID_STATUSES.includes(statusFilter as (typeof VALID_STATUSES)[number])
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid status filter. Allowed: ${VALID_STATUSES.join(', ')}`,
                },
                { status: 400 }
            );
        }

        // Parse pagination
        let page = 1;
        if (pageParam) {
            page = parseInt(pageParam, 10);
            if (isNaN(page) || page < 1) page = 1;
        }

        let limit = 20;
        if (limitParam) {
            limit = parseInt(limitParam, 10);
            if (isNaN(limit) || limit < 1) limit = 20;
            if (limit > 100) limit = 100;
        }

        const offset = (page - 1) * limit;

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

        // ── 4. Query audit log ──────────────────────────────────────
        let query = adminSupabase
            .from('zoho_po_audit_log')
            .select('*', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply status filter if provided
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        const { data: rows, error, count } = await query;

        if (error) {
            console.error('[AuditLog] Query error:', error);
            return NextResponse.json(
                { success: false, error: `Failed to fetch audit log: ${error.message}` },
                { status: 500 }
            );
        }

        // ── 5. Format entries ───────────────────────────────────────
        const entries: POAuditLogEntry[] = (rows || []).map((row) => ({
            id: String(row.id ?? ''),
            invoice_filename: String(row.invoice_filename ?? ''),
            vendor_name: String(row.vendor_name ?? ''),
            po_number: row.po_number ? String(row.po_number) : undefined,
            po_amount: row.po_amount ? Number(row.po_amount) : undefined,
            po_status: String(row.status ?? ''),
            ai_model_used: String(row.ai_model_used ?? ''),
            created_at: String(row.created_at ?? ''),
            processing_time_ms: row.processing_time_ms
                ? Number(row.processing_time_ms)
                : undefined,
            error_message: row.error_message
                ? String(row.error_message)
                : undefined,
        }));

        return NextResponse.json({
            success: true,
            entries,
            total: count ?? 0,
            page,
            limit,
            total_pages: Math.ceil((count ?? 0) / limit),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[AuditLog] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
