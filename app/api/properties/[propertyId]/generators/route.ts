import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

// GET: Fetch all generators for a property
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('generators')
        .select('*')
        .eq('property_id', propertyId)
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// POST: Create a new generator
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('generators')
        .insert({
            property_id: propertyId,
            name: body.name,
            make: body.make || null,
            capacity_kva: body.capacity_kva || null,
            tank_capacity_litres: body.tank_capacity_litres || 1000,
            fuel_efficiency_lphr: body.fuel_efficiency_lphr || 15,
            status: body.status || 'active',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

// DELETE: Remove a generator
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const generatorId = searchParams.get('id');

    if (!generatorId) {
        return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('generators')
        .delete()
        .eq('id', generatorId)
        .eq('property_id', propertyId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
