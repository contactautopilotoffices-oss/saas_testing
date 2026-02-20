import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const barcode = searchParams.get('barcode');

    try {
        let query = supabase
            .from('stock_items')
            .select('*')
            .eq('property_id', propertyId)
            .order('name', { ascending: true });

        if (category) {
            query = query.eq('category', category);
        }

        if (barcode) {
            query = query.eq('barcode', barcode);
        }

        const { data: items, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter low stock if requested
        let filteredItems = items || [];
        if (lowStockOnly) {
            filteredItems = filteredItems.filter(item => item.quantity < (item.min_threshold || 10));
        }

        return NextResponse.json({
            success: true,
            items: filteredItems,
            total: filteredItems.length,
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
        const { name, category, unit = 'units', quantity = 0, min_threshold = 10, location, description, item_code } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Generate item_code if not provided
        const finalItemCode = item_code || `ITEM-${Date.now()}`;

        const { data: item, error: insertError } = await supabase
            .from('stock_items')
            .insert({
                property_id: propertyId,
                organization_id: (await supabase.from('properties').select('organization_id').eq('id', propertyId).single()).data?.organization_id,
                item_code: finalItemCode,
                name,
                category,
                unit,
                quantity,
                min_threshold,
                location,
                description,
                created_by: user.id,
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Record initial movement
        if (quantity > 0) {
            await supabase.from('stock_movements').insert({
                item_id: item.id,
                property_id: propertyId,
                organization_id: item.organization_id,
                action: 'initial',
                quantity_change: quantity,
                quantity_before: 0,
                quantity_after: quantity,
                user_id: user.id,
                notes: 'Initial stock entry',
            });
        }

        return NextResponse.json({ success: true, item }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
