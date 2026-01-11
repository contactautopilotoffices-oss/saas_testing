import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/tickets/[id]
 * Get ticket detail with timeline, comments, and activity
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;
        const supabase = await createClient();

        const { data: ticket, error } = await supabase
            .from('tickets')
            .select(`
        *,
        category:issue_categories(id, code, name, icon),
        skill_group:skill_groups(id, code, name),
        creator:users!created_by(id, full_name, email, avatar_url),
        assignee:users!assigned_to(id, full_name, email, avatar_url),
        organization:organizations(id, name, code),
        property:properties(id, name, code)
      `)
            .eq('id', ticketId)
            .single();

        if (error || !ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Get comments
        const { data: comments } = await supabase
            .from('ticket_comments')
            .select(`*, user:users(id, full_name, email, avatar_url)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        // Get activity log
        const { data: activities } = await supabase
            .from('ticket_activity_log')
            .select(`*, user:users(id, full_name)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false })
            .limit(20);

        // Build timeline
        const timeline = [
            { step: 'Requested', completed: true, time: ticket.created_at },
            { step: 'Assigned', completed: !!ticket.assigned_at, time: ticket.assigned_at },
            { step: 'In Progress', completed: !!ticket.work_started_at, time: ticket.work_started_at },
            { step: 'Photos Uploaded', completed: !!ticket.photo_after_url, time: null },
            { step: 'Completed', completed: ticket.status === 'resolved' || ticket.status === 'closed', time: ticket.resolved_at },
        ];

        return NextResponse.json({ ticket, comments: comments || [], activities: activities || [], timeline });
    } catch (error) {
        console.error('Ticket detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/tickets/[id]
 * Update ticket status, assignment, SLA, photos
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            status,
            assigned_to,
            priority,
            sla_paused,
            sla_pause_reason,
            resolution_notes,
            photo_before_url,
            photo_after_url,
            rating,
        } = body;

        // Get current ticket
        const { data: currentTicket } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (!currentTicket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        // Handle status changes
        if (status && status !== currentTicket.status) {
            updates.status = status;

            if (status === 'in_progress' && !currentTicket.work_started_at) {
                updates.work_started_at = new Date().toISOString();
            }
            if (status === 'resolved' && !currentTicket.resolved_at) {
                updates.resolved_at = new Date().toISOString();
            }
            if (status === 'closed' && !currentTicket.closed_at) {
                updates.closed_at = new Date().toISOString();
            }

            await supabase.from('ticket_activity_log').insert({
                ticket_id: ticketId,
                user_id: user.id,
                action: 'status_change',
                old_value: currentTicket.status,
                new_value: status,
            });
        }

        // Handle assignment
        if (assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) {
            updates.assigned_to = assigned_to;
            updates.assigned_at = new Date().toISOString();
            updates.status = 'assigned';
            updates.sla_started = true;

            const slaHours = currentTicket.sla_hours || 24;
            updates.sla_deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

            await supabase.from('ticket_activity_log').insert({
                ticket_id: ticketId,
                user_id: user.id,
                action: 'assigned',
                new_value: assigned_to,
            });
        }

        // Handle SLA pause/resume
        if (sla_paused !== undefined && sla_paused !== currentTicket.sla_paused) {
            updates.sla_paused = sla_paused;

            if (sla_paused) {
                updates.sla_paused_at = new Date().toISOString();
                updates.sla_pause_reason = sla_pause_reason || 'Paused by admin';
            } else if (currentTicket.sla_paused_at) {
                const pausedMinutes = Math.floor((Date.now() - new Date(currentTicket.sla_paused_at).getTime()) / 60000);
                updates.total_paused_minutes = (currentTicket.total_paused_minutes || 0) + pausedMinutes;

                if (currentTicket.sla_deadline) {
                    const newDeadline = new Date(currentTicket.sla_deadline);
                    newDeadline.setMinutes(newDeadline.getMinutes() + pausedMinutes);
                    updates.sla_deadline = newDeadline.toISOString();
                }
            }

            await supabase.from('ticket_activity_log').insert({
                ticket_id: ticketId,
                user_id: user.id,
                action: sla_paused ? 'sla_paused' : 'sla_resumed',
                new_value: sla_pause_reason,
            });
        }

        if (priority) updates.priority = priority;
        if (resolution_notes) updates.resolution_notes = resolution_notes;
        if (photo_before_url) updates.photo_before_url = photo_before_url;
        if (photo_after_url) updates.photo_after_url = photo_after_url;
        if (rating) updates.rating = rating;

        const { data: ticket, error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', ticketId)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
        }

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error('Ticket update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
