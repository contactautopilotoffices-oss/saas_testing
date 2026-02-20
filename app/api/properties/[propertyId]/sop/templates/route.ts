import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const role = searchParams.get('role');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    try {
        let query = supabase
            .from('sop_templates')
            .select(`
                *,
                items:sop_checklist_items(*)
            `)
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data: templates, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter by role if provided
        let filteredTemplates = templates || [];
        if (role) {
            filteredTemplates = filteredTemplates.filter(t =>
                t.applicable_roles.includes(role)
            );
        }

        return NextResponse.json({
            success: true,
            templates: filteredTemplates,
            total: filteredTemplates.length,
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
        const { title, description, category = 'general', frequency = 'daily', applicable_roles = [], items = [] } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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

        // Create template
        const { data: template, error: templateError } = await supabase
            .from('sop_templates')
            .insert({
                property_id: propertyId,
                organization_id: property.organization_id,
                title,
                description,
                category,
                frequency,
                applicable_roles,
                created_by: user.id,
            })
            .select()
            .single();

        if (templateError) {
            return NextResponse.json({ error: templateError.message }, { status: 500 });
        }

        // Insert checklist items if provided
        if (items.length > 0) {
            const itemsToInsert = items.map((item: any, index: number) => ({
                template_id: template.id,
                title: item.title,
                description: item.description,
                order_index: index,
                type: item.type || 'checkbox',
                is_optional: item.is_optional || false,
                requires_photo: item.requires_photo || false,
                requires_comment: item.requires_comment || false,
                is_mandatory: item.is_mandatory !== false,
            }));

            const { error: itemsError } = await supabase
                .from('sop_checklist_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // Rollback template if items fail (you might handle this differently)
                await supabase.from('sop_templates').delete().eq('id', template.id);
                return NextResponse.json({ error: itemsError.message }, { status: 500 });
            }

            // Fetch items to return with template
            const { data: createdItems } = await supabase
                .from('sop_checklist_items')
                .select('*')
                .eq('template_id', template.id)
                .order('order_index', { ascending: true });

            return NextResponse.json(
                { success: true, template: { ...template, items: createdItems } },
                { status: 201 }
            );
        }

        return NextResponse.json(
            { success: true, template: { ...template, items: [] } },
            { status: 201 }
        );
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
