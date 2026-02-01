import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

const BUCKET_NAME = 'ticket_photos';

/**
 * POST /api/tickets/[id]/photos
 * Upload before/after photos for a ticket
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const photoType = formData.get('type') as string; // 'before' or 'after'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!['before', 'after'].includes(photoType)) {
            return NextResponse.json({ error: 'Invalid photo type. Use "before" or "after"' }, { status: 400 });
        }

        // Get ticket to verify access
        const { data: ticket } = await supabase
            .from('tickets')
            .select('id, property_id, raised_by, assigned_to')
            .eq('id', ticketId)
            .single();

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Only creator or assignee can upload photos
        if (ticket.raised_by !== user.id && ticket.assigned_to !== user.id) {
            return NextResponse.json({ error: 'Not authorized to upload photos' }, { status: 403 });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}/${photoType}_${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        // Update ticket with photo URL
        const updateField = photoType === 'before' ? 'photo_before_url' : 'photo_after_url';
        const { error: updateError } = await supabase
            .from('tickets')
            .update({ [updateField]: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ error: 'Failed to save photo URL' }, { status: 500 });
        }

        // Log activity
        await supabase.from('ticket_activity_log').insert({
            ticket_id: ticketId,
            user_id: user.id,
            action: `photo_${photoType}_uploaded`,
            new_value: publicUrl,
        });

        return NextResponse.json({
            success: true,
            url: publicUrl,
            type: photoType,
        });
    } catch (error) {
        console.error('Photo upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
