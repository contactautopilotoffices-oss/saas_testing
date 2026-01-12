import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Classification keywords mapped to category codes
const CLASSIFICATION_KEYWORDS: Record<string, string[]> = {
    ac_breakdown: ['ac', 'air conditioning', 'cooling', 'hvac', 'cold', 'hot', 'temperature'],
    power_outage: ['power', 'electricity', 'outage', 'blackout', 'no power', 'electrical'],
    wifi_down: ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'lan'],
    lighting_issue: ['light', 'lighting', 'bulb', 'lamp', 'dark', 'tube light', 'led'],
    dg_issue: ['dg', 'generator', 'diesel', 'backup power'],
    chair_broken: ['chair', 'seat', 'broken chair', 'seating'],
    desk_alignment: ['desk', 'table', 'workstation', 'furniture'],
    water_leakage: ['leak', 'leakage', 'water leak', 'drip', 'seepage'],
    no_water_supply: ['no water', 'water supply', 'tap not working', 'dry tap'],
    washroom_issue: ['washroom', 'toilet', 'bathroom', 'restroom', 'loo', 'flush'],
    lift_breakdown: ['lift', 'elevator', 'not working'],
    stuck_lift: ['stuck', 'trapped', 'lift stuck'],
    fire_alarm_l2: ['fire', 'alarm', 'smoke', 'fire alarm'],
    deep_cleaning: ['deep clean', 'cleaning', 'sanitize', 'housekeeping'],
    painting: ['paint', 'painting', 'wall', 'repaint'],
};

// Extract floor number from description
function extractFloorNumber(description: string): number | null {
    const floorPatterns = [
        /(\d+)(?:st|nd|rd|th)\s*floor/i,
        /floor\s*(\d+)/i,
        /(\d+)\s*floor/i,
    ];

    for (const pattern of floorPatterns) {
        const match = description.match(pattern);
        if (match) return parseInt(match[1], 10);
    }
    if (description.toLowerCase().includes('ground floor')) return 0;
    if (description.toLowerCase().includes('basement')) return -1;
    return null;
}

// Classification engine
function classifyTicket(description: string): {
    categoryCode: string | null;
    confidence: number;
    isVague: boolean;
} {
    const lowerDesc = description.toLowerCase();
    let bestMatch: { code: string; score: number } | null = null;

    for (const [code, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lowerDesc.includes(keyword)) {
                score += keyword.split(' ').length * 10;
            }
        }
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { code, score };
        }
    }

    if (!bestMatch) {
        return { categoryCode: null, confidence: 0, isVague: true };
    }

    const confidence = Math.min(100, bestMatch.score + (description.length > 20 ? 20 : 0));
    const isVague = confidence < 40 || description.length < 10;

    return { categoryCode: bestMatch.code, confidence, isVague };
}

/**
 * GET /api/tickets
 * Fetch tickets with filters
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const propertyId = searchParams.get('propertyId') || searchParams.get('property_id');
        const organizationId = searchParams.get('organizationId') || searchParams.get('organization_id');
        const status = searchParams.get('status');
        const isInternal = searchParams.get('isInternal');
        const assignedTo = searchParams.get('assignedTo');
        const raisedBy = searchParams.get('raisedBy') || searchParams.get('raised_by');

        let query = supabase
            .from('tickets')
            .select(`
        *,
        category:issue_categories(id, code, name, icon),
        skill_group:skill_groups(id, code, name),
        creator:users!raised_by(id, full_name, email),
        assignee:users!assigned_to(id, full_name, email),
        organization:organizations(id, name, code),
        property:properties(id, name, code)
      `)
            .order('created_at', { ascending: false });

        if (propertyId) query = query.eq('property_id', propertyId);
        if (organizationId) query = query.eq('organization_id', organizationId);
        if (status) query = query.eq('status', status);
        if (isInternal !== null && isInternal !== undefined) {
            query = query.eq('is_internal', isInternal === 'true');
        }
        if (assignedTo) query = query.eq('assigned_to', assignedTo);
        if (raisedBy) query = query.eq('raised_by', raisedBy);

        const { data: tickets, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching tickets:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
        }

        return NextResponse.json({ tickets: tickets || [] });
    } catch (error) {
        console.error('Tickets API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/tickets
 * Create a new ticket with plain-language classification
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            description,
            property_id,
            propertyId,
            organization_id,
            organizationId,
            is_internal,
            isInternal,
            title,
        } = body;

        const propId = property_id || propertyId;
        const orgId = organization_id || organizationId;
        const internal = is_internal ?? isInternal ?? false;

        if (!description || !propId || !orgId) {
            return NextResponse.json(
                { error: 'Missing required fields: description, propertyId, organizationId' },
                { status: 400 }
            );
        }

        // Simple ticket number generation
        const ticketNumber = `TKT-${Date.now()}`;

        // Create the ticket with minimal fields that match the basic schema
        const { data: ticket, error: insertError } = await supabase
            .from('tickets')
            .insert({
                ticket_number: ticketNumber,
                property_id: propId,
                organization_id: orgId,
                title: title || description.slice(0, 100),
                description,
                category: 'other', // Simple text category
                priority: 'medium',
                status: 'open', // Always open, no waitlist
                raised_by: user.id,
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('Error creating ticket:', insertError);
            return NextResponse.json({
                error: 'Failed to create ticket',
                details: insertError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            ticket,
            classification: {
                category: 'general',
                confidence: 100,
                isVague: false,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create ticket API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
