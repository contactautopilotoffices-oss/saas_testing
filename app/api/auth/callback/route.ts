import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const propertyCode = requestUrl.searchParams.get('state'); // Optional: for property-scoped signup

    if (code) {
        const supabase = await createClient();

        // 1. Exchange code for session
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth Error:', error.message);
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
        }

        if (user) {
            // 2. COMPULSORY profile storage (always)
            const { error: profileError } = await supabase.from('users').upsert({
                id: user.id,
                full_name: user.user_metadata.full_name || user.email?.split('@')[0],
                email: user.email!,
                phone: user.phone || user.user_metadata.phone || null,
                metadata: user.user_metadata
            });

            if (profileError) console.error('Profile Error:', profileError.message);

            // 3. Check if user already has memberships (returning user)
            const { data: existingMembership } = await supabase
                .from('organization_memberships')
                .select('organization_id, role')
                .eq('user_id', user.id)
                .limit(1)
                .single();

            // CASE A: Property-scoped signup (new tenant via /join/[propertyCode])
            if (propertyCode) {
                const { data: property } = await supabase
                    .from('properties')
                    .select('id, organization_id')
                    .eq('code', propertyCode)
                    .single();

                if (!property) {
                    console.error('Invalid property code:', propertyCode);
                    return NextResponse.redirect(`${requestUrl.origin}/error?message=Property not found`);
                }

                // Auto-assign memberships
                await supabase.from('organization_memberships').upsert({
                    user_id: user.id,
                    organization_id: property.organization_id,
                    role: 'tenant'
                });

                await supabase.from('property_memberships').upsert({
                    user_id: user.id,
                    organization_id: property.organization_id,
                    property_id: property.id,
                    role: 'tenant'
                });

                // Redirect to onboarding for new tenants
                return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
            }

            // CASE B: Admin login (no property code)
            if (existingMembership) {
                // Returning user - route based on role
                const role = existingMembership.role;

                if (role === 'master_admin') {
                    return NextResponse.redirect(`${requestUrl.origin}/master`);
                } else if (role === 'org_super_admin') {
                    return NextResponse.redirect(`${requestUrl.origin}/organizations`);
                } else {
                    return NextResponse.redirect(`${requestUrl.origin}/organizations`);
                }
            }

            // CASE C: New user with no property code - redirect to contact page
            // (B2B only: they should have been invited via a property link)
            return NextResponse.redirect(`${requestUrl.origin}/?message=no_access`);
        }
    }

    // Return to home if failed
    return NextResponse.redirect(`${requestUrl.origin}/`);
}
