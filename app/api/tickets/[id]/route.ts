import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';

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
 * Supports MST-driven workflow actions: self_assign, start_work, pause_work, resume_work, complete
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
            // Standard fields
            status,
            assigned_to,
            priority,
            sla_paused,
            sla_pause_reason,
            resolution_notes,
            photo_before_url,
            photo_after_url,
            rating,
            // Editable content fields
            title,
            description,
            // MST workflow actions
            action, // 'self_assign' | 'start_work' | 'pause_work' | 'resume_work' | 'complete'
            work_pause_reason,
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

        // Handle MST workflow actions
        if (action) {
            switch (action) {
                case 'self_assign':
                    // MST assigns ticket to themselves
                    if (currentTicket.assigned_to && currentTicket.assigned_to !== user.id) {
                        return NextResponse.json({
                            error: 'Ticket already assigned to another MST'
                        }, { status: 400 });
                    }
                    updates.assigned_to = user.id;
                    updates.assigned_at = new Date().toISOString();
                    updates.status = 'assigned';
                    updates.sla_started = true;
                    const slaHoursAssign = currentTicket.sla_hours || 24;
                    updates.sla_deadline = new Date(Date.now() + slaHoursAssign * 60 * 60 * 1000).toISOString();

                    await supabase.from('ticket_activity_log').insert({
                        ticket_id: ticketId,
                        user_id: user.id,
                        action: 'self_assigned',
                        new_value: user.id,
                    });
                    break;

                case 'start_work':
                    // MST starts working on ticket
                    if (currentTicket.assigned_to !== user.id) {
                        return NextResponse.json({
                            error: 'You must be assigned to this ticket to start work'
                        }, { status: 400 });
                    }
                    updates.status = 'in_progress';
                    updates.work_started_at = new Date().toISOString();
                    updates.work_paused = false;

                    await supabase.from('ticket_activity_log').insert({
                        ticket_id: ticketId,
                        user_id: user.id,
                        action: 'work_started',
                        old_value: currentTicket.status,
                        new_value: 'in_progress',
                    });
                    break;

                case 'pause_work':
                    // MST pauses work on ticket (requires reason)
                    if (currentTicket.assigned_to !== user.id) {
                        return NextResponse.json({
                            error: 'You must be assigned to this ticket to pause work'
                        }, { status: 400 });
                    }
                    if (!work_pause_reason) {
                        return NextResponse.json({
                            error: 'Pause reason is required'
                        }, { status: 400 });
                    }
                    updates.work_paused = true;
                    updates.work_paused_at = new Date().toISOString();
                    updates.work_pause_reason = work_pause_reason;
                    updates.work_paused_by = user.id;
                    updates.status = 'paused';

                    await supabase.from('ticket_activity_log').insert({
                        ticket_id: ticketId,
                        user_id: user.id,
                        action: 'work_paused',
                        new_value: work_pause_reason,
                    });
                    break;

                case 'resume_work':
                    // MST resumes paused work
                    if (currentTicket.assigned_to !== user.id) {
                        return NextResponse.json({
                            error: 'You must be assigned to this ticket to resume work'
                        }, { status: 400 });
                    }
                    updates.work_paused = false;
                    updates.work_paused_at = null;
                    updates.work_pause_reason = null;
                    updates.status = 'in_progress';

                    await supabase.from('ticket_activity_log').insert({
                        ticket_id: ticketId,
                        user_id: user.id,
                        action: 'work_resumed',
                        old_value: currentTicket.work_pause_reason,
                        new_value: 'in_progress',
                    });
                    break;

                case 'complete':
                    // MST completes ticket
                    if (currentTicket.assigned_to !== user.id) {
                        return NextResponse.json({
                            error: 'You must be assigned to this ticket to complete it'
                        }, { status: 400 });
                    }
                    updates.status = 'closed';
                    updates.resolved_at = new Date().toISOString();
                    updates.work_paused = false;

                    await supabase.from('ticket_activity_log').insert({
                        ticket_id: ticketId,
                        user_id: user.id,
                        action: 'completed',
                        old_value: currentTicket.status,
                        new_value: 'closed',
                    });
                    break;

                default:
                    return NextResponse.json({
                        error: `Unknown action: ${action}`
                    }, { status: 400 });
            }
        }

        // Handle standard status changes (if no action specified)
        if (!action && status && status !== currentTicket.status) {
            updates.status = status;

            if (status === 'in_progress' && !currentTicket.work_started_at) {
                updates.work_started_at = new Date().toISOString();
            }
            if (status === 'resolved' || status === 'closed') {
                if (!currentTicket.resolved_at) {
                    updates.resolved_at = new Date().toISOString();
                }
            }

            await supabase.from('ticket_activity_log').insert({
                ticket_id: ticketId,
                user_id: user.id,
                action: 'status_change',
                old_value: currentTicket.status,
                new_value: status,
            });
        }

        // Handle assignment (admin reassignment)
        if (!action && assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) {
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

        // Allow editing title and description only if the user is the one who raised the ticket
        if (title || description) {
            if (currentTicket.raised_by !== user.id) {
                return NextResponse.json({ error: 'Only the creator can edit the ticket content' }, { status: 403 });
            }
            if (title) updates.title = title;
            if (description) updates.description = description;

            // Log edit activity
            await supabase.from('ticket_activity_log').insert({
                ticket_id: ticketId,
                user_id: user.id,
                action: 'ticket_edited',
                old_value: 'Content updated',
            });
        }

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
export async function DELETE(
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

        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticketId);

        if (error) {
            console.error('Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete ticket error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
