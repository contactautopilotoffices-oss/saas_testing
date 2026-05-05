/**
 * GET /api/zoho-po/gst-entities?orgId={uuid}&city={optional city filter}
 *
 * Get GST entity master data for an organization.
 * Optionally filter by city.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { getGSTEntitiesForOrg, getGSTEntitiesByCity } from '@/backend/lib/zoho-po/gst-engine';
import type { GSTEntity } from '@/backend/lib/zoho-po/types';

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * Get GST entities for an organization.
 *
 * Query params:
 *   orgId (required) — Organization UUID
 *   city  (optional) — City name to filter by (partial match)
 */
export async function GET(request: NextRequest) {
    try {
        // ── 1. Authenticate user ────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[GSTEntities] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse query params ───────────────────────────────────
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        const city = searchParams.get('city');

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

        // ── 4. Fetch GST entities ───────────────────────────────────
        let entities: GSTEntity[];
        if (city && city.trim().length > 0) {
            entities = await getGSTEntitiesByCity(orgId, city.trim());
        } else {
            entities = await getGSTEntitiesForOrg(orgId);
        }

        return NextResponse.json({
            success: true,
            entities,
            count: entities.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[GSTEntities] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
