import { createClient } from './supabase/client';

/**
 * Ensures a user (MST/Staff) has an entry in resolver_stats
 * and marks them as available.
 */
export async function checkInResolver(userId: string, propertyId: string) {
    const supabase = createClient();

    // Check if entry exists
    const { data: existing } = await supabase
        .from('resolver_stats')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!existing) {
        // Create entry
        await supabase.from('resolver_stats').insert({
            user_id: userId,
            property_id: propertyId,
            is_available: true,
            current_floor: 1,
            total_resolved: 0,
            avg_resolution_minutes: 60
        });
    } else {
        // Update entry
        await supabase.from('resolver_stats').update({
            is_available: true
        }).eq('user_id', userId);
    }
}
