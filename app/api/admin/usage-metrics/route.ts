import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

/**
 * GET /api/admin/usage-metrics
 * Returns aggregated engagement metrics per user for admin dashboard
 * Only accessible by admins/super_admins
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[UsageMetrics] Request from user:', user.id);

    // Verify admin role
    const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'super_admin', 'owner'])
        .eq('is_active', true)
        .limit(1)
        .single();

    if (!membership) {
        console.log('[UsageMetrics] User is not admin');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    console.log('[UsageMetrics] Fetching metrics for org:', orgId);

    try {
        // First, close any stale sessions
        await supabase.rpc('close_stale_sessions');

        // Get users with their engagement metrics
        let query = supabase
            .from('users')
            .select(`
                id,
                full_name,
                email,
                user_sessions (
                    id,
                    session_start,
                    last_activity,
                    session_end,
                    duration_seconds
                )
            `)
            .order('full_name', { ascending: true });

        // If orgId provided, filter by org membership
        if (orgId) {
            const { data: orgUsers } = await supabase
                .from('organization_memberships')
                .select('user_id')
                .eq('organization_id', orgId)
                .eq('is_active', true);

            if (orgUsers) {
                const userIds = orgUsers.map(u => u.user_id);
                query = query.in('id', userIds);
            }
        }

        const { data: users, error: fetchError } = await query;

        if (fetchError) {
            console.error('[UsageMetrics] Error fetching users:', fetchError.message);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        // Calculate metrics for each user
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const metrics = users?.map(user => {
            const sessions = user.user_sessions || [];

            // Last active
            const lastActive = sessions.length > 0
                ? new Date(Math.max(...sessions.map((s: any) => new Date(s.last_activity).getTime())))
                : null;

            // Sessions this week
            const sessionsThisWeek = sessions.filter((s: any) =>
                new Date(s.session_start) >= weekAgo
            ).length;

            // Average duration (only completed sessions)
            const completedSessions = sessions.filter((s: any) => s.duration_seconds != null);
            const avgDuration = completedSessions.length > 0
                ? Math.round(completedSessions.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) / completedSessions.length)
                : 0;

            // Engagement level
            let engagementLevel: 'high' | 'medium' | 'low' = 'low';
            if (sessionsThisWeek >= 10 && avgDuration >= 600) {
                engagementLevel = 'high';
            } else if (sessionsThisWeek >= 3) {
                engagementLevel = 'medium';
            }

            return {
                user_id: user.id,
                full_name: user.full_name,
                email: user.email,
                last_active: lastActive?.toISOString() || null,
                sessions_this_week: sessionsThisWeek,
                avg_duration_seconds: avgDuration,
                total_sessions: sessions.length,
                engagement_level: engagementLevel
            };
        }) || [];

        console.log('[UsageMetrics] Returning metrics for', metrics.length, 'users');
        return NextResponse.json(metrics);

    } catch (err: any) {
        console.error('[UsageMetrics] Unexpected error:', err.message);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}
