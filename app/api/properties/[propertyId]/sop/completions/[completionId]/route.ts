import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string; completionId: string }> }
) {
    const { propertyId, completionId } = await params;
    const supabase = await createClient();

    try {
        const { data: completion, error } = await supabase
            .from('sop_completions')
            .select(`
                *,
                template:sop_templates(title, frequency, items:sop_checklist_items(*)),
                items:sop_completion_items(*)
            `)
            .eq('id', completionId)
            .eq('property_id', propertyId)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, completion });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string; completionId: string }> }
) {
    const { propertyId, completionId } = await params;
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, notes, item } = body;

        // Update completion status/notes
        if (status || notes !== undefined) {
            const updates: any = {};
            if (status) updates.status = status;
            if (notes !== undefined) updates.notes = notes;
            if (status === 'completed') updates.completed_at = new Date().toISOString();

            const { error: updateError } = await supabase
                .from('sop_completions')
                .update(updates)
                .eq('id', completionId)
                .eq('property_id', propertyId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        }

        // Update individual item if provided
        if (item) {
            const { completionItemId, is_checked, comment, photo_url } = item;

            const itemUpdates: any = {};
            if (is_checked !== undefined) itemUpdates.is_checked = is_checked;
            if (comment !== undefined) itemUpdates.comment = comment;
            if (photo_url !== undefined) itemUpdates.photo_url = photo_url;
            if (is_checked) itemUpdates.checked_at = new Date().toISOString();

            const { error: itemError } = await supabase
                .from('sop_completion_items')
                .update(itemUpdates)
                .eq('id', completionItemId);

            if (itemError) {
                return NextResponse.json({ error: itemError.message }, { status: 500 });
            }
        }

        // Fetch updated completion
        const { data: completion } = await supabase
            .from('sop_completions')
            .select(`
                *,
                template:sop_templates(title, frequency),
                items:sop_completion_items(*)
            `)
            .eq('id', completionId)
            .single();

        return NextResponse.json({ success: true, completion });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
