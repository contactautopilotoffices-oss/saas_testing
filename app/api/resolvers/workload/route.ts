import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Get resolver workload for load balancing
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const searchParams = request.nextUrl.searchParams;
        const propertyId = searchParams.get('propertyId');
        const skillGroupId = searchParams.get('skillGroupId');

        if (!propertyId) {
            return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
        }

        // Get resolver stats with active ticket counts
        const { data: resolvers, error } = await supabase
            .from('resolver_stats')
            .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
            .eq('property_id', propertyId)
            .eq('is_available', true);

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch resolvers' }, { status: 500 });
        }

        // Get active ticket counts
        let ticketQuery = supabase
            .from('tickets')
            .select('assigned_to')
            .eq('property_id', propertyId)
            .in('status', ['assigned', 'in_progress']);

        if (skillGroupId) {
            ticketQuery = ticketQuery.eq('skill_group_id', skillGroupId);
        }

        const { data: activeTickets } = await ticketQuery;

        // Count tickets per resolver
        const ticketCounts: Record<string, number> = {};
        activeTickets?.forEach((t) => {
            if (t.assigned_to) {
                ticketCounts[t.assigned_to] = (ticketCounts[t.assigned_to] || 0) + 1;
            }
        });

        // Calculate scores
        const resolversWithScores = resolvers?.map((r) => {
            const activeCount = ticketCounts[r.user_id] || 0;
            const score = (activeCount * 0.6) +
                ((r.current_floor || 1) * 0.2) +
                (Math.min((r.avg_resolution_minutes || 60) / 60, 10) * 0.2);

            return {
                ...r,
                active_tickets: activeCount,
                score: Math.round(score * 100) / 100,
            };
        }).sort((a, b) => a.score - b.score);

        return NextResponse.json({
            resolvers: resolversWithScores || [],
            total_available: resolversWithScores?.length || 0,
        });
    } catch (error) {
        console.error('Resolver workload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
