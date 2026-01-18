import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface AssignmentResult {
    ticketId: string;
    assignedTo: string | null;
    status: string;
}

/**
 * POST /api/tickets/bulk-assign
 * Assign multiple tickets using round-robin load balancing
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { ticket_ids, property_id } = body;

        if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
            return NextResponse.json({ error: 'Missing or empty ticket_ids array' }, { status: 400 });
        }

        if (!property_id) {
            return NextResponse.json({ error: 'Missing property_id' }, { status: 400 });
        }

        console.log('=== BULK ASSIGN DEBUG ===');
        console.log('Property ID:', property_id);
        console.log('Ticket IDs received:', ticket_ids);

        // Fetch tickets to be assigned (only 'open' status, don't filter by property)
        const { data: tickets, error: fetchError } = await supabase
            .from('tickets')
            .select('id, category, status, property_id')
            .in('id', ticket_ids)
            .eq('status', 'open');

        console.log('Eligible tickets found:', tickets);
        console.log('Fetch error:', fetchError);

        if (fetchError) {
            console.error('Error fetching tickets:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch tickets', details: fetchError.message }, { status: 500 });
        }

        if (!tickets || tickets.length === 0) {
            return NextResponse.json({
                error: 'No eligible tickets found for assignment. Tickets may have already been assigned or IDs are invalid.',
                debug: {
                    receivedIds: ticket_ids,
                }
            }, { status: 400 });
        }

        // Use property_id from the first ticket
        const actualPropertyId = tickets[0].property_id || property_id;

        // Get MST users from property_memberships (role = 'mst' or similar)
        const { data: mstUsers, error: mstError } = await supabase
            .from('property_memberships')
            .select('user_id')
            .eq('property_id', actualPropertyId)
            .eq('is_active', true)
            .in('role', ['mst', 'mst_technical', 'mst_plumbing', 'mst_soft_service', 'resolver', 'technician']);

        if (mstError) {
            console.warn('Could not fetch MST users:', mstError.message);
        }

        const resolvers = mstUsers || [];
        const results: AssignmentResult[] = [];

        if (resolvers.length === 0) {
            // No resolvers available - update all tickets to in_progress and assign to raising user
            for (const ticket of tickets) {
                const { error: updateError } = await supabase
                    .from('tickets')
                    .update({
                        status: 'in_progress',
                        assigned_to: user.id,
                        work_started_at: new Date().toISOString(),
                    })
                    .eq('id', ticket.id);

                results.push({
                    ticketId: ticket.id,
                    assignedTo: updateError ? null : user.id,
                    status: updateError ? 'error' : 'in_progress',
                });
            }
        } else {
            // Round-robin assignment to available MSTs
            let resolverIndex = 0;
            for (const ticket of tickets) {
                const assignedResolver = resolvers[resolverIndex % resolvers.length];
                const now = new Date().toISOString();

                const { error: assignError } = await supabase
                    .from('tickets')
                    .update({
                        assigned_to: assignedResolver.user_id,
                        work_started_at: now,
                        status: 'in_progress',
                    })
                    .eq('id', ticket.id);

                if (assignError) {
                    console.error('Error assigning ticket:', assignError);
                    results.push({
                        ticketId: ticket.id,
                        assignedTo: null,
                        status: 'error',
                    });
                } else {
                    results.push({
                        ticketId: ticket.id,
                        assignedTo: assignedResolver.user_id,
                        status: 'assigned',
                    });
                }

                resolverIndex++;
            }
        }

        const assigned = results.filter(r => r.status === 'assigned' || r.status === 'in_progress').length;
        const errors = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            success: true,
            summary: {
                total: results.length,
                assigned,
                waitlisted: 0,
                errors,
            },
            results,
        });

    } catch (error) {
        console.error('Bulk assign API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
