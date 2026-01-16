import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { classifyTicket } from '@/lib/ticketing';

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

        // 1. Deterministic Classification using centralized engine
        const classification = classifyTicket(title || description);
        const { issue_code, skill_group, confidence } = classification;
        const isVague = confidence === 'low';
        console.log('[TICKET API] Classification result:', { issue_code, skill_group, confidence });

        // 2. Resolve Database IDs (Category & Skill Group)
        let categoryId = null;
        let skillGroupId = null;
        let priority = 'medium';
        let slaHours = 24;

        if (issue_code) {
            console.log('[TICKET API] Looking up category in issue_categories...', { issue_code });

            // GLOBAL lookup - no property_id filter
            const { data: catData, error: catError } = await supabase
                .from('issue_categories')
                .select('id, skill_group_id, priority, sla_hours')
                .eq('code', issue_code)
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
                console.warn('[TICKET API] ⚠️ Issue code not found in issue_categories:', issue_code);
            }
        }

        // Fallback: If no skill group found from category, use classification skill_group directly
        if (!skillGroupId) {
            console.log('[TICKET API] Falling back to skill_groups lookup with classified skill_group:', skill_group);

            // GLOBAL lookup - no property_id filter
            const { data: defaultSkill, error: skillError } = await supabase
                .from('skill_groups')
                .select('id, code, is_manual_assign')
                .eq('code', skill_group)
                .limit(1)
                .maybeSingle();

            if (skillError) {
                console.error('[TICKET API] Error fetching skill group:', skillError);
            }

            if (defaultSkill) {
                skillGroupId = defaultSkill.id;
                console.log('[TICKET API] Fallback skill_group_id:', skillGroupId, 'code:', skill_group);
            } else {
                console.error('[TICKET API] ❌ NO SKILL GROUP FOUND for code:', skill_group);
            }
        }

        console.log('[TICKET API] Final IDs:', { categoryId, skillGroupId });

        // 3. CREATE TICKET
        // Note: Assignment is now handled by the PostgreSQL trigger 'trigger_auto_assign_ticket'
        // which utilizes the 'find_best_resolver' function for load-balanced, shift-aware assignment.
        
        const ticketNumber = `TKT-${Date.now()}`;

        const { data: ticket, error: insertError } = await supabase
            .from('tickets')
            .insert({
                ticket_number: ticketNumber,
                property_id: propId,
                organization_id: orgId,
                title: title || description.slice(0, 100),
                description,
                category: issue_code || 'general',
                category_id: categoryId,
                skill_group_id: skillGroupId,
                priority: priority,
                status: 'open', // Trigger will update to 'assigned' if resolver found
                raised_by: user.id,
                is_internal: internal,
                is_vague: isVague,
                sla_hours: slaHours,
                work_paused: false,
                floor_number: extractFloorNumber(title || description) ?? undefined,
                location: extractLocation(title || description) ?? undefined,
                // New tracking fields
                issue_code: issue_code,
                skill_group_code: skill_group,
                confidence: confidence
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
                issue_code,
                skill_group,
                confidence,
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
