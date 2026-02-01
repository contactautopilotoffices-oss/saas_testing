import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

// GET: Fetch electricity readings with optional filters
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const meterId = searchParams.get('meterId');
    const period = searchParams.get('period'); // 'today' | 'week' | 'month'

    console.log('[ElectricityReadings] GET request for property:', propertyId, { startDate, endDate, meterId, period });

    let query = supabase
        .from('electricity_readings')
        .select(`
            *,
            meter:electricity_meters(name, meter_number, meter_type, max_load_kw)
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

    if (meterId) query = query.eq('meter_id', meterId);

    const { data, error } = await query;

    if (error) {
        console.error('[ElectricityReadings] Error fetching readings:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[ElectricityReadings] Fetched', data?.length || 0, 'readings');
    return NextResponse.json(data);
}

// POST: Submit a daily electricity reading
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    console.log('[ElectricityReadings] POST request for property:', propertyId, 'body:', JSON.stringify(body).slice(0, 200));

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Handle batch submission (multiple meters)
    if (Array.isArray(body.readings)) {
        console.log('[ElectricityReadings] Batch submission with', body.readings.length, 'readings');

        const readings = body.readings.map((r: any) => ({
            property_id: propertyId,
            meter_id: r.meter_id,
            reading_date: r.reading_date || new Date().toISOString().split('T')[0],
            opening_reading: r.opening_reading,
            closing_reading: r.closing_reading,
            peak_load_kw: r.peak_load_kw || null,
            notes: r.notes || null,
            alert_status: r.alert_status || 'normal',
            created_by: user?.id,
        }));

        const { data, error } = await supabase
            .from('electricity_readings')
            .upsert(readings, {
                onConflict: 'meter_id,reading_date',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error('[ElectricityReadings] Error submitting batch readings:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update last_reading on meters
        for (const r of body.readings) {
            await supabase
                .from('electricity_meters')
                .update({ last_reading: r.closing_reading, updated_at: new Date().toISOString() })
                .eq('id', r.meter_id);
        }

        console.log('[ElectricityReadings] Batch submission successful:', data?.length || 0, 'readings saved');
        return NextResponse.json(data, { status: 201 });
    }

    // Single reading submission
    console.log('[ElectricityReadings] Single reading submission');

    const { data, error } = await supabase
        .from('electricity_readings')
        .upsert({
            property_id: propertyId,
            meter_id: body.meter_id,
            reading_date: body.reading_date || new Date().toISOString().split('T')[0],
            opening_reading: body.opening_reading,
            closing_reading: body.closing_reading,
            peak_load_kw: body.peak_load_kw || null,
            notes: body.notes || null,
            alert_status: body.alert_status || 'normal',
            created_by: user?.id,
        }, {
            onConflict: 'meter_id,reading_date',
            ignoreDuplicates: false
        })
        .select()
        .single();

    if (error) {
        console.error('[ElectricityReadings] Error submitting reading:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update last_reading on meter
    await supabase
        .from('electricity_meters')
        .update({ last_reading: body.closing_reading, updated_at: new Date().toISOString() })
        .eq('id', body.meter_id);

    console.log('[ElectricityReadings] Single reading saved:', data?.id);
    return NextResponse.json(data, { status: 201 });
}
