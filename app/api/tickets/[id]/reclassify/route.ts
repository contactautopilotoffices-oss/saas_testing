import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Classification keywords (same as main tickets route)
const CLASSIFICATION_KEYWORDS: Record<string, string[]> = {
    ac_breakdown: ['ac', 'air conditioning', 'cooling', 'hvac', 'cold', 'hot', 'temperature'],
    power_outage: ['power', 'electricity', 'outage', 'blackout', 'no power', 'electrical'],
    wifi_down: ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'lan'],
    lighting_issue: ['light', 'lighting', 'bulb', 'lamp', 'dark', 'tube light', 'led'],
    water_leakage: ['leak', 'leakage', 'water leak', 'drip', 'seepage'],
    washroom_issue: ['washroom', 'toilet', 'bathroom', 'restroom', 'flush'],
    lift_breakdown: ['lift', 'elevator', 'not working'],
};

function classifyTicket(description: string) {
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
    return { categoryCode: bestMatch.code, confidence, isVague: confidence < 40 };
}

/**
 * POST /api/tickets/[id]/reclassify
 * Re-run classification engine on ticket description
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ticket
        const { data: ticket } = await supabase
            .from('tickets')
            .select('id, description, property_id, category_id, confidence_score')
            .eq('id', ticketId)
            .single();

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Re-classify
        const classification = classifyTicket(ticket.description);

        let categoryId = null;
        let skillGroupId = null;

        if (classification.categoryCode) {
            const { data: category } = await supabase
                .from('issue_categories')
                .select('id, skill_group_id')
                .eq('property_id', ticket.property_id)
                .eq('code', classification.categoryCode)
                .single();

            if (category) {
                categoryId = category.id;
                skillGroupId = category.skill_group_id;
            }
        }

        // Update ticket
        const { data: updated, error } = await supabase
            .from('tickets')
            .update({
                category_id: categoryId,
                skill_group_id: skillGroupId,
                confidence_score: classification.confidence,
                classification_source: 'rules_reeval',
                is_vague: classification.isVague,
                status: classification.isVague ? 'waitlist' : 'open',
                updated_at: new Date().toISOString(),
            })
            .eq('id', ticketId)
            .select(`
        *,
        category:issue_categories(id, code, name)
      `)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to reclassify' }, { status: 500 });
        }

        // Log activity
        await supabase.from('ticket_activity_log').insert({
            ticket_id: ticketId,
            user_id: user.id,
            action: 'reclassified',
            old_value: String(ticket.confidence_score),
            new_value: String(classification.confidence),
        });

        return NextResponse.json({
            success: true,
            ticket: updated,
            classification: {
                category: classification.categoryCode,
                confidence: classification.confidence,
                isVague: classification.isVague,
            },
        });
    } catch (error) {
        console.error('Reclassify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
