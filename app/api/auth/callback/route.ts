import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const propertyCode = requestUrl.searchParams.get('state'); // Optional: for property-scoped signup
    const next = requestUrl.searchParams.get('next'); // For password reset redirect

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
            // 2. COMPULSORY profile storage (always)
            const { data: dbUser, error: profileError } = await supabase.from('users').upsert({
                id: user.id,
                full_name: user.user_metadata.full_name || user.email?.split('@')[0],
                email: user.email!,
                phone: user.phone || user.user_metadata.phone || null,
                metadata: user.user_metadata
            }).select('is_master_admin').single();

            if (profileError) console.error('Profile Error:', profileError.message);

            // --- STRICT 4-STEP ROLE CHECK ---

            // STEP 1: Check if Master Admin
            if (dbUser?.is_master_admin || user.user_metadata?.is_master_admin) {
                return NextResponse.redirect(`${requestUrl.origin}/master`);
            }

            // STEP 2: Check Organization Membership
            const { data: orgMemberships } = await supabase
                .from('organization_memberships')
                .select('organization_id, role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .limit(1);

            const orgMembership = orgMemberships?.[0];

            // SPECIAL CASE: Property-scoped signup (Join flow)
            // If they have a property code, we handle that as registration/onboarding
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

            // STEP 2 (cont): Redirect if Org Membership found
            if (orgMembership) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('code')
                    .eq('id', orgMembership.organization_id)
                    .maybeSingle();

                if (org) {
                    return NextResponse.redirect(`${requestUrl.origin}/${org.code}/dashboard`);
                }
            }

            // STEP 3: Check Property Membership
            const { data: propMemberships } = await supabase
                .from('property_memberships')
                .select('property_id, organization_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .limit(1);

            if (propMemberships && propMemberships.length > 0) {
                const { property_id, organization_id } = propMemberships[0];
                const { data: org } = await supabase
                    .from('organizations')
                    .select('code')
                    .eq('id', organization_id)
                    .maybeSingle();

                if (org) {
                    return NextResponse.redirect(`${requestUrl.origin}/${org.code}/properties/${property_id}/dashboard`);
                }
            }

            // STEP 4: No Membership Found -> Redirect to login with error
            // We don't call signOut here because the session was just created, 
            // the login page will handle the session existence and block further access.
            return NextResponse.redirect(`${requestUrl.origin}/login?error=no_access`);
        }
    }

    // Return to home if failed
    return NextResponse.redirect(`${requestUrl.origin}/`);
}
