import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

/**
 * Electricity Readings API v2
 * PRD: Log raw → derive everything
 * PRD: User must explicitly select multiplier
 * PRD: Cost is computed, never entered
 */

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
            meter:electricity_meters(name, meter_number, meter_type, max_load_kw),
            multiplier:meter_multipliers(id, multiplier_value, ct_ratio_primary, ct_ratio_secondary, pt_ratio_primary, pt_ratio_secondary),
            tariff:grid_tariffs(id, rate_per_unit, utility_provider)
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

// POST: Submit a daily electricity reading with multiplier and cost computation
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    console.log('[ElectricityReadings] POST request for property:', propertyId, 'body:', JSON.stringify(body).slice(0, 300));

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Helper function to compute cost for a single reading
    const computeReadingWithCost = async (reading: any) => {
        const readingDate = reading.reading_date || new Date().toISOString().split('T')[0];
        const rawUnits = reading.closing_reading - reading.opening_reading;

        let multiplierValue = 1;
        let multiplierId = reading.multiplier_id;
        let tariffRate = 0;
        let tariffId = null;

        // Get active multiplier if not explicitly provided
        if (!multiplierId && reading.meter_id) {
            const { data: multiplierData } = await supabase
                .rpc('get_active_multiplier', {
                    p_meter_id: reading.meter_id,
                    p_date: readingDate
                });

            if (multiplierData && multiplierData.length > 0) {
                multiplierId = multiplierData[0].id;
                multiplierValue = multiplierData[0].multiplier_value || 1;
            }
        } else if (multiplierId) {
            // Fetch the multiplier value
            const { data: mult } = await supabase
                .from('meter_multipliers')
                .select('multiplier_value')
                .eq('id', multiplierId)
                .single();

            if (mult) {
                multiplierValue = mult.multiplier_value || 1;
            }
        }

        // Get active tariff for the property
        const { data: tariffData } = await supabase
            .rpc('get_active_grid_tariff', {
                p_property_id: propertyId,
                p_date: readingDate
            });

        if (tariffData && tariffData.length > 0) {
            tariffId = tariffData[0].id;
            tariffRate = tariffData[0].rate_per_unit || 0;
        }

        // Compute final values (PRD: Cost = Units × Tariff × Multiplier)
        const finalUnits = rawUnits * multiplierValue;
        const computedCost = finalUnits * tariffRate;

        return {
            property_id: propertyId,
            meter_id: reading.meter_id,
            reading_date: readingDate,
            opening_reading: reading.opening_reading,
            closing_reading: reading.closing_reading,
            // Removed: peak_load_kw (PRD: Peak load removed)
            notes: reading.notes || null,
            alert_status: reading.alert_status || 'normal',
            created_by: user.id,
            // New v2 fields
            multiplier_id: multiplierId,
            multiplier_value_used: multiplierValue,
            tariff_id: tariffId,
            tariff_rate_used: tariffRate,
            final_units: finalUnits,
            computed_cost: computedCost
        };
    };

    // Handle batch submission (multiple meters)
    if (Array.isArray(body.readings)) {
        console.log('[ElectricityReadings] Batch submission with', body.readings.length, 'readings');

        const processedReadings = await Promise.all(
            body.readings.map((r: any) => computeReadingWithCost(r))
        );

        const { data, error } = await supabase
            .from('electricity_readings')
            .insert(processedReadings)
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

    const processedReading = await computeReadingWithCost(body);

    const { data, error } = await supabase
        .from('electricity_readings')
        .insert(processedReading)
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

    console.log('[ElectricityReadings] Single reading saved:', data?.id, 'Cost:', data?.computed_cost);
    return NextResponse.json(data, { status: 201 });
}

// DELETE: Remove a reading
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const readingId = searchParams.get('id');

    if (!readingId) {
        return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ElectricityReadings] DELETE request for reading:', readingId, 'property:', propertyId);

    // 1. Get the reading details first to know the meter_id and opening_reading
    const { data: readingData, error: fetchError } = await supabase
        .from('electricity_readings')
        .select('meter_id, opening_reading')
        .eq('id', readingId)
        .eq('property_id', propertyId)
        .single();

    if (fetchError || !readingData) {
        console.error('[ElectricityReadings] Error fetching reading before delete:', fetchError?.message);
        return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    const { meter_id, opening_reading } = readingData;

    // 2. Delete the reading record
    const { error: deleteError } = await supabase
        .from('electricity_readings')
        .delete()
        .eq('id', readingId)
        .eq('property_id', propertyId);

    if (deleteError) {
        console.error('[ElectricityReadings] Error deleting reading:', deleteError.message);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 3. Recalibrate meter's last_reading
    // Find the new most recent reading for this meter
    const { data: latestReadings } = await supabase
        .from('electricity_readings')
        .select('closing_reading')
        .eq('meter_id', meter_id)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

    // If no readings left, reset to 0
    const newLastReading = latestReadings && latestReadings.length > 0
        ? latestReadings[0].closing_reading
        : 0;

    console.log('[ElectricityReadings] Recalibrating meter:', meter_id, 'New last_reading:', newLastReading);

    await supabase
        .from('electricity_meters')
        .update({ last_reading: newLastReading, updated_at: new Date().toISOString() })
        .eq('id', meter_id);

    return NextResponse.json({ success: true });
}
