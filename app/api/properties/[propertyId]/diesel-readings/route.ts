import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

// GET: Fetch diesel readings with optional filters
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const generatorId = searchParams.get('generatorId');
    const period = searchParams.get('period'); // 'today' | 'week' | 'month'

    let query = supabase
        .from('diesel_readings')
        .select(`
            *,
            generator:generators(name, make, capacity_kva, tank_capacity_litres)
        `)
        .eq('property_id', propertyId)
        .order('reading_date', { ascending: false });

    // Apply date filters
    if (period === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('reading_date', today);
    } else if (period === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query = query.gte('reading_date', weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query = query.gte('reading_date', monthAgo);
    } else {
        if (startDate) query = query.gte('reading_date', startDate);
        if (endDate) query = query.lte('reading_date', endDate);
    }

    if (generatorId) query = query.eq('generator_id', generatorId);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// POST: Submit a daily diesel reading
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Handle batch submission (multiple generators)
    if (Array.isArray(body.readings)) {
        const readings = body.readings.map((r: any) => ({
            property_id: propertyId,
            generator_id: r.generator_id,
            reading_date: r.reading_date || new Date().toISOString().split('T')[0],
            opening_hours: r.opening_hours,
            diesel_added_litres: r.diesel_added_litres || 0,
            closing_hours: r.closing_hours,
            computed_consumed_litres: r.computed_consumed_litres,
            notes: r.notes || null,
            alert_status: r.alert_status || 'normal',
            created_by: user?.id,
        }));

        const { data, error } = await supabase
            .from('diesel_readings')
            .upsert(readings, {
                onConflict: 'generator_id,reading_date',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    }

    // Single reading submission
    const { data, error } = await supabase
        .from('diesel_readings')
        .upsert({
            property_id: propertyId,
            generator_id: body.generator_id,
            reading_date: body.reading_date || new Date().toISOString().split('T')[0],
            opening_hours: body.opening_hours,
            diesel_added_litres: body.diesel_added_litres || 0,
            closing_hours: body.closing_hours,
            computed_consumed_litres: body.computed_consumed_litres,
            notes: body.notes || null,
            alert_status: body.alert_status || 'normal',
            created_by: user?.id,
        }, {
            onConflict: 'generator_id,reading_date',
            ignoreDuplicates: false
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
