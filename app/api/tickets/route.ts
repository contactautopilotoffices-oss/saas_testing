import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { classifyTicketDepartment } from '@/lib/ticket-classifier';
import { TicketDepartment } from '@/types/ticketing';

// Classification keywords mapped to category codes
const CLASSIFICATION_KEYWORDS: Record<string, string[]> = {
    ac_breakdown: ['ac', 'air conditioning', 'cooling', 'hvac', 'cold', 'hot', 'temperature'],
    power_outage: ['power', 'electricity', 'outage', 'blackout', 'no power', 'electrical'],
    wifi_down: ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'lan'],
    lighting_issue: ['light', 'lighting', 'bulb', 'lamp', 'dark', 'tube light', 'led'],
    dg_issue: ['dg', 'generator', 'diesel', 'backup power'],
    chair_broken: ['chair', 'seat', 'broken chair', 'seating'],
    desk_alignment: ['desk', 'table', 'furniture', 'desk broken', 'table repair'],
    water_leakage: ['leak', 'leakage', 'water leak', 'drip', 'seepage'],
    no_water_supply: ['no water', 'water supply', 'tap not working', 'dry tap'],
    washroom_issue: ['washroom', 'toilet', 'bathroom', 'restroom', 'loo', 'flush'],
    lift_breakdown: ['lift', 'elevator'],
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

// Extract location from description
function extractLocation(description: string): string | null {
    const locations: Record<string, string[]> = {
        'Cafeteria': ['cafeteria', 'canteen', 'pantry', 'kitchen', 'mess'],
        'Reception': ['lobby', 'reception', 'front desk', 'entrance'],
        'Parking': ['parking', 'basement', 'garage'],
        'Terrace': ['terrace', 'roof', 'rooftop'],
        'Washroom': ['washroom', 'restroom', 'toilet', 'bathroom', 'loo'],
        'Conference Room': ['conference', 'meeting room', 'board room'],
        'Cabin': ['cabin', 'cubicle', 'desk', 'workstation'],
        'Server Room': ['server room', 'data center', 'hub room'],
        'Electrical Room': ['electrical room', 'ups room', 'dg room']
    };

    const lowerDesc = description.toLowerCase();
    for (const [loc, keywords] of Object.entries(locations)) {
        if (keywords.some(k => lowerDesc.includes(k))) return loc;
    }
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
 * Create a new ticket with automatic department classification
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
            department: explicitDepartment, // Allow explicit department override
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

        // 1. Granular Classification
        const { categoryCode, isVague } = classifyTicket(title || description);
        console.log('[TICKET API] Classification result:', { categoryCode, isVague });

        // 2. Resolve Database IDs (Category & Skill Group)
        let categoryId = null;
        let skillGroupId = null;
        let priority = 'medium';
        let slaHours = 24;

        if (categoryCode) {
            console.log('[TICKET API] Looking up category in issue_categories...', { categoryCode });

            // GLOBAL lookup - no property_id filter
            const { data: catData, error: catError } = await supabase
                .from('issue_categories')
                .select('id, skill_group_id, priority, sla_hours')
                .eq('code', categoryCode)
                .limit(1)
                .maybeSingle();

            if (catError) {
                console.error('[TICKET API] Error fetching category:', catError);
            }

            if (catData) {
                categoryId = catData.id;
                skillGroupId = catData.skill_group_id;
                priority = catData.priority || 'medium';
                slaHours = catData.sla_hours || 24;
                console.log('[TICKET API] ✅ Found category!', { categoryId, skillGroupId, priority });
            } else {
                console.warn('[TICKET API] ⚠️ Category code not found in issue_categories:', categoryCode);
            }
        }

        // Fallback: If no skill group found, try direct skill_groups lookup
        if (!skillGroupId) {
            console.log('[TICKET API] Falling back to skill_groups lookup...');
            const classification = classifyTicketDepartment(description, title);
            const skillCode = classification.department === 'soft_services' ? 'soft_services' : 'technical';

            // GLOBAL lookup - no property_id filter
            const { data: defaultSkill, error: skillError } = await supabase
                .from('skill_groups')
                .select('id, code, is_manual_assign')
                .eq('code', skillCode)
                .limit(1)
                .maybeSingle();

            if (skillError) {
                console.error('[TICKET API] Error fetching skill group:', skillError);
            }

            if (defaultSkill) {
                skillGroupId = defaultSkill.id;
                console.log('[TICKET API] Fallback skill_group_id:', skillGroupId, 'code:', skillCode);
            } else {
                console.error('[TICKET API] ❌ NO SKILL GROUP FOUND for code:', skillCode);
            }
        }

        console.log('[TICKET API] Final IDs:', { categoryId, skillGroupId });

        // 3. FIND RESOLVER - Direct API assignment
        let assignedTo: string | null = null;
        let ticketStatus = 'open';
        let assignedAt: string | null = null;
        let slaDeadline: string | null = null;

        if (skillGroupId) {
            console.log('[TICKET API] Looking for resolver with skill_group_id:', skillGroupId, 'property_id:', propId);

            // Step 1: Find resolver in resolver_stats matching skill + property + available
            const { data: resolverStats, error: resolverError } = await supabase
                .from('resolver_stats')
                .select('user_id, is_available')
                .eq('skill_group_id', skillGroupId)
                .eq('property_id', propId)
                .eq('is_available', true)
                .limit(1)
                .maybeSingle();

            if (resolverError) {
                console.error('[TICKET API] Error finding resolver:', resolverError);
            }

            if (resolverStats?.user_id) {
                console.log('[TICKET API] Found resolver in resolver_stats:', resolverStats.user_id);

                // Step 2: Verify user is active member of this property
                const { data: membership } = await supabase
                    .from('property_memberships')
                    .select('user_id, role')
                    .eq('user_id', resolverStats.user_id)
                    .eq('property_id', propId)
                    .eq('is_active', true)
                    .maybeSingle();

                if (membership) {
                    assignedTo = resolverStats.user_id;
                    ticketStatus = 'assigned';
                    assignedAt = new Date().toISOString();
                    const deadline = new Date();
                    deadline.setHours(deadline.getHours() + slaHours);
                    slaDeadline = deadline.toISOString();
                    console.log('[TICKET API] ✅ Assigned to user_id:', assignedTo, '| Role:', membership.role);
                } else {
                    console.warn('[TICKET API] ⚠️ Resolver found but not active member. Ticket goes to WAITLIST.');
                    ticketStatus = 'waitlist';
                }
            } else {
                console.warn('[TICKET API] ⚠️ No resolver found in resolver_stats. Ticket goes to WAITLIST.');
                ticketStatus = 'waitlist';
            }
        } else {
            console.warn('[TICKET API] ⚠️ No skill_group_id. Ticket goes to WAITLIST.');
            ticketStatus = 'waitlist';
        }

        // Simple ticket number generation
        const ticketNumber = `TKT-${Date.now()}`;

        // Create the ticket WITH assignment
        const { data: ticket, error: insertError } = await supabase
            .from('tickets')
            .insert({
                ticket_number: ticketNumber,
                property_id: propId,
                organization_id: orgId,
                title: title || description.slice(0, 100),
                description,
                category: categoryCode || 'general',
                category_id: categoryId,
                skill_group_id: skillGroupId,
                priority: priority,
                status: ticketStatus,
                raised_by: user.id,
                assigned_to: assignedTo,
                assigned_at: assignedAt,
                sla_deadline: slaDeadline,
                sla_started: assignedTo ? true : false,
                is_internal: internal,
                is_vague: isVague,
                sla_hours: slaHours,
                work_paused: false,
                floor_number: extractFloorNumber(title || description) ?? undefined,
                location: extractLocation(title || description) ?? undefined,
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
                categoryCode: categoryCode,
                isAutoClassified: !explicitDepartment,
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
