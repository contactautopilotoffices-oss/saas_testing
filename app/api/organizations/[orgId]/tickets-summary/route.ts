import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/organizations/[orgId]/tickets-summary
 * Organization-wide ticketing summary for Super Admin / Master Admin
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    try {
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

        const propertyIds = properties?.map((p) => p.id) || [];

        if (propertyIds.length === 0) {
            return NextResponse.json({
                organization_id: orgId,
                period,
                total_tickets: 0,
                open_tickets: 0,
                in_progress: 0,
                resolved: 0,
                sla_breached: 0,
                avg_resolution_hours: 0,
                properties: [],
            });
        }

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

        // Fetch all tickets for these properties
        const { data: tickets } = await supabase
            .from('tickets')
            .select('id, property_id, status, sla_breached, created_at, resolved_at')
            .in('property_id', propertyIds)
            .gte('created_at', startDate.toISOString());

        // Calculate overall stats
        const totalTickets = tickets?.length || 0;
        const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'waitlist').length || 0;
        const inProgress = tickets?.filter(t => t.status === 'assigned' || t.status === 'in_progress').length || 0;
        const resolved = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;
        const slaBreached = tickets?.filter(t => t.sla_breached).length || 0;

        // Calculate average resolution time
        const resolvedTickets = tickets?.filter(t => t.resolved_at) || [];
        let totalResolutionMs = 0;
        resolvedTickets.forEach(t => {
            const created = new Date(t.created_at);
            const resolved = new Date(t.resolved_at);
            totalResolutionMs += resolved.getTime() - created.getTime();
        });
        const avgResolutionHours = resolvedTickets.length > 0
            ? Math.round(totalResolutionMs / resolvedTickets.length / (1000 * 60 * 60))
            : 0;

        // Build property breakdown
        const propertyBreakdown = properties?.map(prop => {
            const propTickets = tickets?.filter(t => t.property_id === prop.id) || [];
            return {
                property_id: prop.id,
                property_name: prop.name,
                property_code: prop.code,
                total: propTickets.length,
                open: propTickets.filter(t => t.status === 'open' || t.status === 'waitlist').length,
                in_progress: propTickets.filter(t => t.status === 'assigned' || t.status === 'in_progress').length,
                resolved: propTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
                sla_breached: propTickets.filter(t => t.sla_breached).length,
            };
        }) || [];

        // Sort by total tickets descending
        propertyBreakdown.sort((a, b) => b.total - a.total);

        return NextResponse.json({
            organization_id: orgId,
            period,
            total_tickets: totalTickets,
            open_tickets: openTickets,
            in_progress: inProgress,
            resolved,
            sla_breached: slaBreached,
            avg_resolution_hours: avgResolutionHours,
            properties: propertyBreakdown,
        });
    } catch (error) {
        console.error('Tickets summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
