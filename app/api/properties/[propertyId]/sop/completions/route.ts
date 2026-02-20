import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const templateId = searchParams.get('templateId');
    const completionDate = searchParams.get('completionDate');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        let query = supabase
            .from('sop_completions')
            .select(`
                *,
                template:sop_templates(title, frequency),
                user:users(id, full_name),
                items:sop_completion_items(*)
            `)
            .eq('property_id', propertyId)
            .order('completion_date', { ascending: false })
            .limit(limit);

        if (templateId) {
            query = query.eq('template_id', templateId);
        }

        if (completionDate) {
            query = query.eq('completion_date', completionDate);
        }

        if (userId) {
            query = query.eq('completed_by', userId);
        }

        const { data: completions, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            completions,
            total: completions?.length || 0,
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { templateId, completionDate, notes } = body;

        if (!templateId) {
            return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
        }

        // Get org ID from property
        const { data: property, error: propError } = await supabase
            .from('properties')
            .select('organization_id')
            .eq('id', propertyId)
            .single();

        if (propError || !property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // Get template to verify it exists
        const { data: template, error: templateError } = await supabase
            .from('sop_templates')
            .select('id')
            .eq('id', templateId)
            .eq('property_id', propertyId)
            .single();

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const finalCompletionDate = completionDate || new Date().toISOString().split('T')[0];

        // Create completion
        const { data: completion, error: completionError } = await supabase
            .from('sop_completions')
            .insert({
                template_id: templateId,
                property_id: propertyId,
                organization_id: property.organization_id,
                completed_by: user.id,
                completion_date: finalCompletionDate,
                status: 'in_progress',
                notes,
            })
            .select()
            .single();

        if (completionError) {
            return NextResponse.json({ error: completionError.message }, { status: 500 });
        }

        // Fetch template items
        const { data: items, error: itemsError } = await supabase
            .from('sop_checklist_items')
            .select('*')
            .eq('template_id', templateId)
            .order('order_index', { ascending: true });

        if (itemsError) {
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        // Create completion items (unchecked)
        if (items && items.length > 0) {
            const completionItemsToInsert = items.map((item: any) => ({
                completion_id: completion.id,
                checklist_item_id: item.id,
                is_checked: false,
            }));

            const { error: insertError } = await supabase
                .from('sop_completion_items')
                .insert(completionItemsToInsert);

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        // Fetch completion with items
        const { data: completeCompletion } = await supabase
            .from('sop_completions')
            .select(`
                *,
                items:sop_completion_items(*)
            `)
            .eq('id', completion.id)
            .single();

        return NextResponse.json(
            { success: true, completion: completeCompletion },
            { status: 201 }
        );
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
