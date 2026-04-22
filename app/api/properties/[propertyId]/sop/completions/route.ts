import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { supabaseAdmin } from '@/backend/lib/supabase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const templateId = searchParams.get('templateId');
    const completionDate = searchParams.get('completionDate');
    const userId = searchParams.get('userId');
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

    // Validate completionDate format to prevent injection / unexpected query results
    if (completionDate && !/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
        return NextResponse.json({ error: 'completionDate must be YYYY-MM-DD' }, { status: 400 });
    }

    try {
        let query = supabase
            .from('sop_completions')
            .select(`
                *,
                template:sop_templates(title, frequency),
                user:users(id, full_name),
                items:sop_completion_items(*)
            `)
            .eq('property_id', propertyId)
            .order('completion_date', { ascending: false })
            .limit(limit);

        if (templateId) {
            query = query.eq('template_id', templateId);
        }

        if (completionDate) {
            query = query.eq('completion_date', completionDate);
        }

        if (userId) {
            query = query.eq('completed_by', userId);
        }

        const { data: completions, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            completions,
            total: completions?.length || 0,
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { templateId, completionDate, notes } = body;

        // Fetch user role for this property to allow admin bypass
        const { data: membership } = await supabaseAdmin
            .from('memberships')
            .select('role')
            .eq('property_id', propertyId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        const userRole = (membership?.role || '').toLowerCase();
        const isAdmin = ['property_admin', 'org_admin', 'org_super_admin', 'master_admin'].includes(userRole);

        if (!templateId) {
            return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
        }

        // Use admin client to bypass RLS for all data operations
        const { data: property, error: propError } = await supabaseAdmin
            .from('properties')
            .select('organization_id')
            .eq('id', propertyId)
            .single();

        if (propError || !property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // Verify template exists and get its items (admin bypasses RLS)
        const { data: template, error: templateError } = await supabaseAdmin
            .from('sop_templates')
            .select('id, frequency, start_time, end_time, items:sop_checklist_items(*)')
            .eq('id', templateId)
            .eq('property_id', propertyId)
            .single();

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const now = new Date();

        // Robustly get India Standard Time (IST) hours and minutes
        const indiaFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });
        const parts = indiaFormatter.formatToParts(now);
        const indiaH = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const indiaM = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const nowMins = indiaH * 60 + indiaM;

        // India-local date string (YYYY-MM-DD)
        const indiaDateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const indiaDate = indiaDateFormatter.format(now);

        const finalCompletionDate = completionDate || indiaDate;
        const isHistorical = finalCompletionDate !== indiaDate;

        // ── Time Window Enforcement (Global) ──────────────────────────────────
        const startTime = (template as any).start_time;
        const endTime = (template as any).end_time;

        // ── Compute slot_time and due_at ──────────────────────────────────────
        let slotTime: string | null = null;
        let dueAt: string | null = null;
        
        const hourlyMatch = (template as any).frequency?.match(/^every_(\d+)_hours?$/);
        if (hourlyMatch && startTime) {
            const intervalH = parseInt(hourlyMatch[1]);
            const [sH, sM] = startTime.slice(0, 5).split(':').map(Number);
            const startMins = sH * 60 + sM;
            const [eH, eM] = (endTime || '23:59').slice(0, 5).split(':').map(Number);
            const endMins = eH * 60 + eM;

            const isOvernight = endMins < startMins;
            let adjustedNowMins = nowMins;
            if (isOvernight && nowMins < startMins) {
                adjustedNowMins += 1440; // Past midnight in overnight window
            }

            const elapsed = adjustedNowMins - startMins;
            const slotIndex = Math.floor(elapsed / (intervalH * 60));
            const slotStartOffsetMins = slotIndex * intervalH * 60;

            const slotStartTotalMins = startMins + slotStartOffsetMins;
            const slotH = Math.floor(slotStartTotalMins / 60) % 24;
            const slotM = slotStartTotalMins % 60;
            const isNextDay = slotStartTotalMins >= 1440;

            let slotDateStr = finalCompletionDate;
            if (isNextDay) {
                const d = new Date(finalCompletionDate);
                d.setDate(d.getDate() + 1);
                slotDateStr = d.toISOString().split('T')[0];
            }

            slotTime = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}:00`;
            dueAt = `${slotDateStr}T${slotTime}+05:30`;
        } else if (template.frequency === 'daily') {
            slotTime = startTime || '00:00:00';
            dueAt = `${finalCompletionDate}T${slotTime}+05:30`;
        }

        // ── Dedup / Resume existing completion ──────────────────────────────
        let existingCompletion: any = null;

        if (dueAt) {
            const { data } = await supabaseAdmin
                .from('sop_completions')
                .select('*, items:sop_completion_items(*)')
                .eq('template_id', templateId)
                .eq('due_at', dueAt)
                .maybeSingle();
            
            existingCompletion = data;
        } else if (hourlyMatch) {
            const intervalH = parseInt(hourlyMatch[1]);
            const cutoff = new Date(Date.now() - intervalH * 3_600_000).toISOString();
            const { data } = await supabaseAdmin
                .from('sop_completions')
                .select('*, items:sop_completion_items(*)')
                .eq('template_id', templateId)
                .eq('property_id', propertyId)
                .gte('created_at', cutoff)
                .order('created_at', { ascending: false })
                .limit(1);
            existingCompletion = data?.[0] ?? null;
        } else {
            const { data } = await supabaseAdmin
                .from('sop_completions')
                .select('*, items:sop_completion_items(*)')
                .eq('template_id', templateId)
                .eq('property_id', propertyId)
                .eq('completion_date', finalCompletionDate)
                .in('status', ['in_progress', 'pending', 'missed'])
                .order('created_at', { ascending: false })
                .limit(1);
            existingCompletion = data?.[0] ?? null;
        }

        // ── Bypass window check if record already exists (Pending/Missed) ───
        // If the checklist was already scheduled/missed, we allow filling it even if window is closed.
        if ((startTime || endTime) && !isAdmin && !isHistorical) {
            // Only enforce window for FRESH creations (not pre-existing slots)
            if (!existingCompletion) {
                const [sH, sM] = (startTime ?? '00:00').slice(0, 5).split(':').map(Number);
                const [eH, eM] = (endTime ?? '23:59').slice(0, 5).split(':').map(Number);
                const startMins = sH * 60 + sM;
                const endMins = eH * 60 + eM;
                
                const isOvernight = endMins <= startMins;
                const withinWindow = isOvernight
                    ? (nowMins >= startMins || nowMins < endMins)
                    : (nowMins >= startMins && nowMins <= endMins);
                
                if (!withinWindow) {
                    if (!isOvernight && nowMins < startMins) {
                        return NextResponse.json({ error: 'Checklist window has not started yet' }, { status: 400 });
                    }
                    return NextResponse.json({ error: 'Checklist window is currently closed' }, { status: 400 });
                }
            }
        }

        // If PENDING or MISSED, transition to IN_PROGRESS
        if (existingCompletion && (existingCompletion.status === 'pending' || existingCompletion.status === 'missed')) {
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('sop_completions')
                .update({ 
                    status: 'in_progress', 
                    completed_by: user.id,
                    is_late: existingCompletion.status === 'missed' // Set is_late if it was already missed
                })
                .eq('id', existingCompletion.id)
                .select('*, items:sop_completion_items(*)')
                .single();
            
            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
            return NextResponse.json({ success: true, completion: updated });
        }

        if (existingCompletion && existingCompletion.status === 'in_progress') {
            return NextResponse.json({ success: true, completion: existingCompletion });
        }

        // ── Create New Completion (Fallback) ───────────────────────────────
        const { data: completion, error: completionError } = await supabaseAdmin
            .from('sop_completions')
            .insert({
                template_id: templateId,
                property_id: propertyId,
                organization_id: property.organization_id,
                completed_by: user.id,
                completion_date: finalCompletionDate,
                status: 'in_progress',
                notes,
                due_at: dueAt,
                slot_time: slotTime,
            })
            .select()
            .single();

        if (completionError) {
            return NextResponse.json({ error: completionError.message }, { status: 500 });
        }

        // Fetch full completion with items (cloned by trigger)
        const { data: completeCompletion } = await supabaseAdmin
            .from('sop_completions')
            .select('*, items:sop_completion_items(*)')
            .eq('id', completion.id)
            .single();

        return NextResponse.json(
            { success: true, completion: completeCompletion },
            { status: 201 }
        );
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
