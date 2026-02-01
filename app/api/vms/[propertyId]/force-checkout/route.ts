import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

/**
 * POST /api/vms/[propertyId]/force-checkout
 * Admin force checkout for visitors who forgot to check out
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    try {
        const { propertyId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { visitor_log_id, reason } = body;

        if (!visitor_log_id) {
            return NextResponse.json({ error: 'visitor_log_id required' }, { status: 400 });
        }

        // Get visitor log
        const { data: visitor, error: fetchError } = await supabase
            .from('visitor_logs')
            .select('*')
            .eq('id', visitor_log_id)
            .eq('property_id', propertyId)
            .single();

        if (fetchError || !visitor) {
            return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
        }

        if (visitor.status === 'checked_out') {
            return NextResponse.json({ error: 'Visitor already checked out' }, { status: 400 });
        }

        // Force checkout
        const { data: updated, error: updateError } = await supabase
            .from('visitor_logs')
            .update({
                status: 'checked_out',
                checkout_time: new Date().toISOString(),
            })
            .eq('id', visitor_log_id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: 'Failed to checkout' }, { status: 500 });
        }

        // Log admin action (non-blocking)
        try {
            await supabase.from('property_activities').insert({
                property_id: propertyId,
                user_id: user.id,
                action: 'vms_force_checkout',
                details: {
                    visitor_id: visitor.visitor_id,
                    visitor_name: visitor.name,
                    reason: reason || 'Force checkout by admin',
                },
            });
        } catch { /* Non-blocking */ }

        return NextResponse.json({
            success: true,
            message: `${visitor.name} has been checked out`,
            visitor: updated,
        });
    } catch (error) {
        console.error('Force checkout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
