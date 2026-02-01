import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

// GET: Organization-wide VMS summary (Super Admin)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') || 'today'; // 'today' | 'week' | 'month'

    // Fetch all properties in the org
    const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name, code')
        .eq('organization_id', orgId);

    if (propError) {
        return NextResponse.json({ error: propError.message }, { status: 500 });
    }

    const propertyIds = properties?.map((p: any) => p.id) || [];

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Fetch all visitors for these properties
    const { data: visitors } = await supabase
        .from('visitor_logs')
        .select('*')
        .in('property_id', propertyIds)
        .gte('checkin_time', startDate.toISOString());

    // Process data per property
    const propertyBreakdown = properties?.map(prop => {
        const propVisitors = visitors?.filter((v: any) => v.property_id === prop.id) || [];
        const checkedIn = propVisitors.filter((v: any) => v.status === 'checked_in').length;
        const checkedOut = propVisitors.filter((v: any) => v.status === 'checked_out').length;

        // Calculate this week's visitors
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeek = propVisitors.filter((v: any) => new Date(v.checkin_time) >= weekAgo).length;

        return {
            property_id: prop.id,
            property_name: prop.name,
            property_code: prop.code,
            today: propVisitors.filter((v: any) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(v.checkin_time) >= today;
            }).length,
            this_week: thisWeek,
            checked_in: checkedIn,
            checked_out: checkedOut,
            total: propVisitors.length,
        };
    }) || [];

    // Sort by today's visitors descending
    propertyBreakdown.sort((a, b) => b.today - a.today);

    // Calculate totals
    const totalVisitors = visitors?.length || 0;
    const totalCheckedIn = visitors?.filter((v: any) => v.status === 'checked_in').length || 0;
    const totalCheckedOut = visitors?.filter((v: any) => v.status === 'checked_out').length || 0;

    return NextResponse.json({
        organization_id: orgId,
        period,
        total_visitors: totalVisitors,
        total_checked_in: totalCheckedIn,
        total_checked_out: totalCheckedOut,
        properties: propertyBreakdown,
    });
}
