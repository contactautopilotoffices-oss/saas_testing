import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Organization-wide vendor revenue summary (Super Admin)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') || 'today'; // 'today' | 'month' | 'year'

    // Fetch all properties in the org
    const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name')
        .eq('organization_id', orgId);

    if (propError) {
        return NextResponse.json({ error: propError.message }, { status: 500 });
    }

    const propertyIds = properties?.map((p: any) => p.id) || [];

    // Fetch all vendors for these properties
    const { data: vendors } = await supabase
        .from('vendors')
        .select(`
            id, shop_name, owner_name, commission_rate, property_id,
            vendor_daily_revenue(revenue_amount, revenue_date)
        `)
        .in('property_id', propertyIds);

    // Calculate date filter
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const yearStart = new Date();
    yearStart.setMonth(0, 1);

    // Process data
    let totalRevenue = 0;
    let totalCommission = 0;
    const propertyBreakdown: any[] = [];

    for (const prop of properties || []) {
        const propVendors = vendors?.filter((v: any) => v.property_id === prop.id) || [];
        let propRevenue = 0;
        let propCommission = 0;

        for (const vendor of propVendors) {
            const entries = vendor.vendor_daily_revenue?.filter((e: any) => {
                if (period === 'today') return e.revenue_date === today;
                if (period === 'month') return new Date(e.revenue_date) >= monthStart;
                if (period === 'year') return new Date(e.revenue_date) >= yearStart;
                return true;
            }) || [];

            const vendorRevenue = entries.reduce((sum: number, e: any) => sum + e.revenue_amount, 0);
            const vendorCommission = vendorRevenue * (vendor.commission_rate / 100);

            propRevenue += vendorRevenue;
            propCommission += vendorCommission;
        }

        propertyBreakdown.push({
            property_id: prop.id,
            property_name: prop.name,
            vendor_count: propVendors.length,
            total_revenue: propRevenue,
            total_commission: propCommission,
        });

        totalRevenue += propRevenue;
        totalCommission += propCommission;
    }

    // Sort by revenue descending
    propertyBreakdown.sort((a, b) => b.total_revenue - a.total_revenue);

    return NextResponse.json({
        organization_id: orgId,
        period,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        total_vendors: vendors?.length || 0,
        properties: propertyBreakdown,
    });
}
