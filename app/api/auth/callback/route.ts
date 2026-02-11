import { createClient } from '@/frontend/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const propertyCode = requestUrl.searchParams.get('state'); // Optional: for property-scoped signup
    const next = requestUrl.searchParams.get('next'); // For password reset redirect
    const redirect = requestUrl.searchParams.get('redirect');

    if (code) {
        const supabase = await createClient();

        // 1. Exchange code for session
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth Error:', error.message);
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
        }

        // 2. If 'next' parameter exists (e.g., password reset), redirect there immediately
        if (next) {
            console.log('Password reset flow detected, redirecting to:', next);
            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }

        if (user) {
            // 3. COMPULSORY profile storage (always)
            const { data: dbUser, error: profileError } = await supabase.from('users').upsert({
                id: user.id,
                full_name: user.user_metadata.full_name || user.email?.split('@')[0],
                email: user.email!,
                phone: user.phone || user.user_metadata.phone || null,
                metadata: user.user_metadata
            }).select('is_master_admin').single();

            if (profileError) console.error('Profile Error:', profileError.message);

            // --- STRICT ROLE CHECK ---

            // STEP 1: Check if Master Admin
            if (dbUser?.is_master_admin || user.user_metadata?.is_master_admin) {
                if (redirect && redirect !== '/') {
                    return NextResponse.redirect(`${requestUrl.origin}${redirect}`);
                }
                return NextResponse.redirect(`${requestUrl.origin}/master`);
            }

            // STEP 2: Check Organization Membership (Org Super Admin)
            const { data: orgMembership } = await supabase
                .from('organization_memberships')
                .select('organization_id, role')
                .eq('user_id', user.id)
                .eq('role', 'org_super_admin')
                .eq('is_active', true)
                .maybeSingle();

            if (orgMembership) {
                if (redirect && redirect !== '/') {
                    return NextResponse.redirect(`${requestUrl.origin}${redirect}`);
                }
                return NextResponse.redirect(`${requestUrl.origin}/org/${orgMembership.organization_id}/dashboard`);
            }

            // SPECIAL CASE: Property-scoped signup (Join flow)
            if (propertyCode) {
                const { data: property } = await supabase
                    .from('properties')
                    .select('id, organization_id')
                    .eq('code', propertyCode)
                    .maybeSingle();

                if (property) {
                    await supabase.from('property_memberships').insert({
                        user_id: user.id,
                        organization_id: property.organization_id,
                        property_id: property.id,
                        role: 'tenant'
                    });

                    return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
                }
            }

            // STEP 3: Check Property Membership with Role-based routing
            const { data: propMembership } = await supabase
                .from('property_memberships')
                .select('property_id, organization_id, role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (propMembership) {
                if (redirect && redirect !== '/') {
                    return NextResponse.redirect(`${requestUrl.origin}${redirect}`);
                }

                const role = propMembership.role;
                const pId = propMembership.property_id;

                // Role-based routing (matching login page logic)
                if (role === 'property_admin') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/dashboard`);
                } else if (role === 'tenant') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/tenant`);
                } else if (role === 'security') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/security`);
                } else if (role === 'staff') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/staff`);
                } else if (role === 'mst') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/mst`);
                } else if (role === 'vendor') {
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/vendor`);
                } else {
                    // Fallback for unknown roles
                    return NextResponse.redirect(`${requestUrl.origin}/property/${pId}/dashboard`);
                }
            }

            // STEP 4: No Membership Found -> Redirect to login with error
            return NextResponse.redirect(`${requestUrl.origin}/login?error=no_access`);
        }
    }

    // Return to home if failed
    return NextResponse.redirect(`${requestUrl.origin}/`);
}

