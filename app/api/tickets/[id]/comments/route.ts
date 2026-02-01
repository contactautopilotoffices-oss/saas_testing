import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';

/**
 * POST /api/tickets/[id]/comments
 * 
 * Add a comment to a ticket
 */
export async function POST(
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
        const { comment, is_internal } = body;

        if (!comment) {
            return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
        }

        // Verify user can access this ticket
        const { data: ticket } = await supabase
            .from('tickets')
            .select('id')
            .eq('id', ticketId)
            .single();

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Check if internal comment (only Master Admin can post internal)
        const adminClient = createAdminClient();
        const { data: userRecord } = await adminClient
            .from('users')
            .select('is_master_admin')
            .eq('id', user.id)
            .single();

        const isMasterAdmin = userRecord?.is_master_admin === true;
        const finalIsInternal = is_internal && isMasterAdmin; // Only MA can post internal

        const { data: newComment, error: insertError } = await supabase
            .from('ticket_comments')
            .insert({
                ticket_id: ticketId,
                user_id: user.id,
                comment,
                is_internal: finalIsInternal
            })
            .select(`
        *,
        user:users(id, full_name, email)
      `)
            .single();

        if (insertError) {
            console.error('Error adding comment:', insertError);
            return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
        }

        return NextResponse.json(newComment, { status: 201 });

    } catch (error) {
        console.error('Add comment API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/tickets/[id]/comments
 * 
 * Get all comments for a ticket
 */
export async function GET(
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

        const { data: comments, error: fetchError } = await supabase
            .from('ticket_comments')
            .select(`
        *,
        user:users(id, full_name, email)
      `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (fetchError) {
            console.error('Error fetching comments:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
        }

        return NextResponse.json(comments || []);

    } catch (error) {
        console.error('Get comments API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
