import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const propertyId = request.nextUrl.searchParams.get('propertyId');
        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
        }

        const { data: statsList, error } = await supabase
            .from('resolver_stats')
            .select('is_checked_in')
            .eq('user_id', user.id)
            .eq('property_id', propertyId)
            .limit(1);

        if (error) throw error;

        const data = statsList && statsList.length > 0 ? statsList[0] : null;
        return NextResponse.json({ isCheckedIn: data?.is_checked_in || false });
    } catch (error) {
        console.error('Check-in status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, propertyId } = await request.json();

        if (!propertyId || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (action === 'check-in') {
            // 1. Create shift log
            const { error: shiftError } = await supabase
                .from('shift_logs')
                .insert({
                    user_id: user.id,
                    property_id: propertyId,
                    status: 'active',
                    check_in_at: new Date().toISOString()
                });

            if (shiftError) throw shiftError;

            // 2. Update/Create Resolver Stats
            const { data: statsList, error: fetchError } = await supabase
                .from('resolver_stats')
                .select('id')
                .eq('user_id', user.id)
                .eq('property_id', propertyId)
                .limit(1);

            if (fetchError) throw fetchError;
            const existingStats = statsList && statsList.length > 0 ? statsList[0] : null;

            if (existingStats) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('resolver_stats')
                    .update({
                        is_checked_in: true,
                        is_available: true
                    })
                    .eq('id', existingStats.id);

                if (updateError) throw updateError;
            } else {
                // Insert new
                const { error: insertError } = await supabase
                    .from('resolver_stats')
                    .insert({
                        user_id: user.id,
                        property_id: propertyId,
                        is_checked_in: true,
                        is_available: true
                    });

                if (insertError) throw insertError;
            }

            return NextResponse.json({ isCheckedIn: true, message: 'Shift started successfully' });
        }

        if (action === 'check-out') {
            // 1. Close active shift logs
            const { error: shiftError } = await supabase
                .from('shift_logs')
                .update({
                    status: 'completed',
                    check_out_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('property_id', propertyId)
                .eq('status', 'active');

            if (shiftError) throw shiftError;

            // 2. Update stats
            const { error: statsError } = await supabase
                .from('resolver_stats')
                .update({
                    is_checked_in: false,
                    is_available: false
                })
                .eq('user_id', user.id)
                .eq('property_id', propertyId);

            if (statsError) throw statsError;

            return NextResponse.json({ isCheckedIn: false, message: 'Shift ended successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Check-in error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
