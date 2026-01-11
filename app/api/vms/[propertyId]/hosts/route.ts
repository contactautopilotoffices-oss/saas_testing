import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/vms/[propertyId]/hosts
 * Get searchable list of hosts (staff + tenants) for auto-complete
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    try {
        const { propertyId } = await params;
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        const search = searchParams.get('q') || '';
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get property members who can receive visitors
        let query = supabase
            .from('property_memberships')
            .select(`
        user_id,
        role,
        user:users(id, full_name, email)
      `)
            .eq('property_id', propertyId)
            .limit(limit);

        const { data: memberships, error } = await query;

        if (error) {
            console.error('Hosts fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch hosts' }, { status: 500 });
        }

        // Format and filter results
        let hosts = (memberships || [])
            .filter((m: any) => m.user?.full_name)
            .map((m: any) => ({
                id: m.user_id,
                name: m.user.full_name,
                email: m.user.email,
                role: m.role,
            }));

        // Apply search filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            hosts = hosts.filter((h: any) =>
                h.name.toLowerCase().includes(lowerSearch) ||
                h.email?.toLowerCase().includes(lowerSearch)
            );
        }

        // Sort by name
        hosts.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({
            hosts,
            total: hosts.length,
        });
    } catch (error) {
        console.error('Hosts error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
