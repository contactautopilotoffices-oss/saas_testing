import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/frontend/utils/supabase/server'
import { createAdminClient } from '@/frontend/utils/supabase/admin'

interface UpdateRoleRequest {
    userId: string
    newRole: string
    propertyId?: string
    organizationId?: string
    skills?: string[]
}

/**
 * POST /api/users/update-role
 * 
 * Update a user's role and synchronize resolver stats.
 */
export async function POST(request: NextRequest) {
    try {
        const body: UpdateRoleRequest = await request.json()
        const { userId, newRole, propertyId, organizationId, skills = [] } = body

        if (!userId || !newRole) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, newRole' },
                { status: 400 }
            )
        }

        // Get the current user's session to verify permissions
        const supabase = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            )
        }

        // Use admin client for updates
        const adminClient = createAdminClient()

        // 1. Get old role to detect transitions
        let oldRole = '';
        if (propertyId) {
            const { data } = await adminClient
                .from('property_memberships')
                .select('role')
                .eq('user_id', userId)
                .eq('property_id', propertyId)
                .maybeSingle();
            oldRole = data?.role || '';
        } else if (organizationId) {
            const { data } = await adminClient
                .from('organization_memberships')
                .select('role')
                .eq('user_id', userId)
                .eq('organization_id', organizationId)
                .maybeSingle();
            oldRole = data?.role || '';
        }

        // 2. Perform the role update
        if (propertyId) {
            const { error: propUpdateError } = await adminClient
                .from('property_memberships')
                .update({ role: newRole })
                .eq('user_id', userId)
                .eq('property_id', propertyId);

            if (propUpdateError) throw propUpdateError;
        } else if (organizationId) {
            const { error: orgUpdateError } = await adminClient
                .from('organization_memberships')
                .update({ role: newRole })
                .eq('user_id', userId)
                .eq('organization_id', organizationId);

            if (orgUpdateError) throw orgUpdateError;

            // If updating org role, we might want to sync property roles too if they exist
            // but for now we follow the existing dashboard behavior which is independent.
        }

        const RESOLVER_ROLES = ['mst', 'staff'];
        const isNewResolver = RESOLVER_ROLES.includes(newRole);
        const isOldResolver = RESOLVER_ROLES.includes(oldRole);

        // 3. Synchronize resolver_stats and mst_skills
        if (isOldResolver && !isNewResolver) {
            // Role changed from resolver to non-resolver -> Remove entries
            console.log(`User ${userId} changed role from ${oldRole} to ${newRole}. Removing resolver stats.`);

            if (propertyId) {
                await adminClient.from('resolver_stats').delete().eq('user_id', userId).eq('property_id', propertyId);
            } else {
                // If org level, remove from all properties (safe bet)
                await adminClient.from('resolver_stats').delete().eq('user_id', userId);
            }

            // Remove general skill mapping
            await adminClient.from('mst_skills').delete().eq('user_id', userId);

        } else if (isNewResolver) {
            // Role is now a resolver -> Add or Update skills/stats
            console.log(`Synchronizing resolver skills for user ${userId} with role ${newRole}. Skills: ${skills.join(', ')}`);

            // Clear existing skills to overwrite
            await adminClient.from('mst_skills').delete().eq('user_id', userId);

            if (skills.length > 0) {
                // Insert new skill mapping
                const skillsToInsert = skills.map(code => ({
                    user_id: userId,
                    skill_code: code
                }));
                await adminClient.from('mst_skills').insert(skillsToInsert);

                // Sync resolver_stats for specific property
                if (propertyId) {
                    // Strict Filter based on User Request:
                    // MST -> technical, plumbing, vendor
                    // Staff -> soft_services
                    const VALID_MST_SKILLS = ['technical', 'plumbing', 'vendor'];
                    const VALID_STAFF_SKILLS = ['soft_services'];

                    const skillsForResolverPool = newRole === 'mst'
                        ? skills.filter(s => VALID_MST_SKILLS.includes(s))
                        : (newRole === 'staff' ? skills.filter(s => VALID_STAFF_SKILLS.includes(s)) : []);

                    // Clear existing stats for this property
                    await adminClient.from('resolver_stats').delete().eq('user_id', userId).eq('property_id', propertyId);

                    if (skillsForResolverPool.length > 0) {
                        const { data: skillGroups } = await adminClient
                            .from('skill_groups')
                            .select('id, code')
                            .eq('is_active', true)
                            .in('code', skillsForResolverPool);

                        if (skillGroups && skillGroups.length > 0) {
                            const statsToInsert = skillGroups.map(sg => ({
                                user_id: userId,
                                property_id: propertyId,
                                skill_group_id: sg.id,
                                current_floor: 1,
                                avg_resolution_minutes: 60,
                                total_resolved: 0,
                                is_available: true
                            }));
                            const { error: statsError } = await adminClient.from('resolver_stats').insert(statsToInsert);
                            if (statsError) console.error('Failed to insert resolver stats:', statsError);
                        }
                    } else {
                        console.log(`User ${userId} (Role: ${newRole}) does not have any resolver-eligible skills. Entry in resolver_stats removed/not created.`);
                    }
                }
            } else if (!isOldResolver) {
                // Moved from non-resolver to resolver role BUT NO SKILLS provided?
                // Usually we expect skills from the UI, but let's at least ensure they are in stats if it's new.
                // Actually, the user specifically asked for checkboxes, so we'll rely on those.
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Update role API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
