import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { resolveClassification, logClassification } from '@/backend/lib/ticketing';

// Extract floor number from description
function extractFloorNumber(description: string): number | null {
    const lowerDesc = description.toLowerCase();

    // Check for ground floor first (including common misspellings)
    if (lowerDesc.includes('ground floor') ||
        lowerDesc.includes('grourd floor') ||
        lowerDesc.includes('groud floor') ||
        lowerDesc.includes('floor 0') ||
        lowerDesc.includes('level 0')) {
        return 0;
    }

    // Check for basement
    if (lowerDesc.includes('basement') || lowerDesc.includes('b1')) return -1;
    if (lowerDesc.includes('b2')) return -2;

    const floorPatterns = [
        /(\d+)(?:st|nd|rd|th)\s*floor/i,
        /floor\s*(\d+)/i,
        /(\d+)\s*floor/i,
        /level\s*(\d+)/i,
    ];

    for (const pattern of floorPatterns) {
        const match = description.match(pattern);
        if (match) return parseInt(match[1], 10);
    }

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
        for (const keyword of keywords) {
            // Use word boundaries to avoid matching keywords inside other words
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(lowerDesc)) return loc;
        }
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
        category:issue_categories(id, code, name),
        skill_group:skill_groups(id, code, name),
        creator:users!raised_by(id, full_name, email),
        assignee:users!assigned_to(id, full_name, email),
        organization:organizations(id, name, code),
        property:properties(id, name, code)
      `)
            .order('created_at', { ascending: false });

        if (propertyId) query = query.eq('property_id', propertyId);
        if (organizationId) query = query.eq('organization_id', organizationId);
        if (status) {
            if (status.includes(',')) {
                query = query.in('status', status.split(',').map(s => s.trim()));
            } else {
                query = query.eq('status', status);
            }
        }
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

        // 1. Hybrid Classification using enhanced resolver
        const resolution = await resolveClassification(title || description);
        const { issue_code, skill_group, confidence, enhancedClassification, zone, decisionSource } = resolution;
        const isVague = confidence === 'low';

        // 2. Resolve Database IDs (Category & Skill Group)
        let categoryId = null;
        let skillGroupId = null;
        let priority = 'medium';
        let slaHours = 24;

        if (issue_code) {
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
            } else {
                console.warn('[TICKET API] \u26a0\ufe0f Issue code not found in issue_categories:', issue_code);
            }
        }

        // Fallback: If no skill group found from category, use classification skill_group directly
        if (!skillGroupId) {
            // GLOBAL lookup
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
            } else {
                console.error('[TICKET API] \u274c NO SKILL GROUP FOUND for code:', skill_group);
            }
        }

        // 3. CREATE TICKET
        const ticketNumber = `TKT-${Date.now()}`;

        const { data: ticket, error: insertError } = await supabase
            .from('tickets')
            .insert({
                ticket_number: ticketNumber,
                property_id: propId,
                organization_id: orgId,
                title: title || description.slice(0, 100),
                description,
                category_id: categoryId,
                skill_group_id: skillGroupId,
                priority: resolution.priority?.toLowerCase() || priority,
                status: 'open',
                raised_by: user.id,
                is_internal: internal,
                is_vague: isVague,
                sla_hours: slaHours,
                floor_number: extractFloorNumber(title || description) ?? undefined,
                location: extractLocation(title || description) ?? undefined,
                // Tracking fields
                issue_code: issue_code,
                skill_group_code: skill_group,
                confidence: confidence,
                // AI-Assisted Enrichment
                secondary_category_code: resolution.secondary_category_code,
                risk_flag: resolution.risk_flag,
                llm_reasoning: resolution.llm_reasoning,
                classification_source: decisionSource,
                confidence_score: resolution.llmResult ? 90 : 100
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('[TICKET API] Insert Error:', insertError);
            return NextResponse.json({
                error: `Failed to create ticket: ${insertError.message}`
            }, { status: 500 });
        }

        // Re-fetch the ticket for trigger updates
        const { data: updatedTicket } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticket.id)
            .single();

        const finalTicket = updatedTicket || ticket;

        // Log classification decision asynchronously
        logClassification(finalTicket.id, resolution).catch(err => {
            console.error('[Ticket API] Classification logging error:', err);
        });

        // Trigger Web Push Notifications asynchronously
        try {
            console.log('>>>>>>>>>> [NOTIFICATION TEST] Ticket API Notifications for:', finalTicket.id);
            const { NotificationService } = await import('@/backend/services/NotificationService');

            // 1. Always notify that a ticket was created
            console.log('>>>>>>>>>> [NOTIFICATION TEST] Sending creation notification to all relevant staff.');
            NotificationService.afterTicketCreated(finalTicket.id).catch(err => {
                console.error('>>>>>>>>>> [NOTIFICATION TEST] Notification error (Creation):', err);
            });

            // 2. If it was auto-assigned, ALSO notify the assignee specifically
            if (finalTicket.assigned_to) {
                console.log('>>>>>>>>>> [NOTIFICATION TEST] Ticket AUTO-ASSIGNED. Sending assignment notification.');
                NotificationService.afterTicketAssigned(finalTicket.id, true).catch(err => {
                    console.error('>>>>>>>>>> [NOTIFICATION TEST] Notification error (Auto-Assign):', err);
                });
            }
        } catch (err) {
            console.error('>>>>>>>>>> [NOTIFICATION TEST] Failed to load NotificationService:', err);
        }

        return NextResponse.json({
            success: true,
            ticket: finalTicket,
            classification: {
                issue_code,
                skill_group,
                confidence,
                isAutoClassified: !explicitDepartment,
                enhancedClassification,
                zone,
                decisionSource,
                status: finalTicket.status,
                assigned_to: finalTicket.assigned_to,
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
