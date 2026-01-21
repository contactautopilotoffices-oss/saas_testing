import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Fetch vendor revenue entries with optional filters
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period'); // 'today' | 'month' | 'year'

    let query = supabase
        .from('vendor_daily_revenue')
        .select(`
            *,
            vendor:vendors(shop_name, owner_name, commission_rate)
        `)
        .eq('property_id', propertyId)
        .order('revenue_date', { ascending: false });

    // Apply vendor filter
    if (vendorId) {
        query = query.eq('vendor_id', vendorId);
    }

    // Apply date filters
    if (period === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('revenue_date', today);
    } else if (period === 'month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        query = query.gte('revenue_date', monthStart.toISOString().split('T')[0]);
    } else if (period === 'year') {
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        query = query.gte('revenue_date', yearStart.toISOString().split('T')[0]);
    } else {
        if (startDate) query = query.gte('revenue_date', startDate);
        if (endDate) query = query.lte('revenue_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// POST: Submit daily revenue entry
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const today = new Date().toISOString().split('T')[0];
    const revenueDate = body.revenue_date || today;

    // Check for existing entry
    const { data: existing } = await supabase
        .from('vendor_daily_revenue')
        .select('id')
        .eq('vendor_id', body.vendor_id)
        .eq('revenue_date', revenueDate)
        .maybeSingle();

    if (existing) {
        return NextResponse.json(
            { error: 'Revenue for this date already recorded', alreadySubmitted: true },
            { status: 409 }
        );
    }

    // Insert revenue entry
    const { data: revenue, error: revenueError } = await supabase
        .from('vendor_daily_revenue')
        .insert({
            vendor_id: body.vendor_id,
            property_id: propertyId,
            revenue_amount: body.revenue_amount,
            revenue_date: revenueDate,
        })
        .select()
        .single();

    if (revenueError) {
        return NextResponse.json({ error: revenueError.message }, { status: 500 });
    }

    // Update current commission cycle's total revenue
    const { data: activeCycle } = await supabase
        .from('commission_cycles')
        .select('id, total_revenue, commission_rate')
        .eq('vendor_id', body.vendor_id)
        .eq('status', 'in_progress')
        .single();

    if (activeCycle) {
        const newTotal = (activeCycle.total_revenue || 0) + body.revenue_amount;
        const newCommission = newTotal * (activeCycle.commission_rate / 100);

        await supabase
            .from('commission_cycles')
            .update({
                total_revenue: newTotal,
                commission_due: newCommission,
                updated_at: new Date().toISOString(),
            })
            .eq('id', activeCycle.id);
    }

    return NextResponse.json(revenue, { status: 201 });
}
