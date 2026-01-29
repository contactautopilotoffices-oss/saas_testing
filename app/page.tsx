'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import HeroSection from '@/components/landing/HeroSection';
import BuildingStory from '@/components/landing/BuildingStory';
import Loader from '@/components/ui/Loader';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        const handleAuthRedirect = async () => {
            if (isLoading || !user) return;

            setIsRedirecting(true);
            const supabase = createClient();

            try {
                // Check if master admin
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('is_master_admin')
                    .eq('id', user.id)
                    .single();

                if (userProfile?.is_master_admin) {
                    router.replace('/master');
                    return;
                }

                // Check org membership
                const { data: orgMembership } = await supabase
                    .from('organization_memberships')
                    .select('organization_id, role')
                    .eq('user_id', user.id)
                    .eq('role', 'org_super_admin')
                    .eq('is_active', true)
                    .maybeSingle();

                if (orgMembership) {
                    router.replace(`/org/${orgMembership.organization_id}/dashboard`);
                    return;
                }

                // Check property membership
                const { data: propMembership } = await supabase
                    .from('property_memberships')
                    .select('property_id, role')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (propMembership) {
                    const { property_id, role } = propMembership;

                    if (role === 'property_admin') {
                        router.replace(`/property/${property_id}/dashboard`);
                    } else if (role === 'tenant') {
                        router.replace(`/property/${property_id}/tenant`);
                    } else if (role === 'security') {
                        router.replace(`/property/${property_id}/security`);
                    } else if (role === 'staff') {
                        router.replace(`/property/${property_id}/staff`);
                    } else if (role === 'mst') {
                        router.replace(`/property/${property_id}/mst`);
                    } else if (role === 'vendor') {
                        router.replace(`/property/${property_id}/vendor`);
                    } else {
                        router.replace(`/property/${property_id}/dashboard`);
                    }
                    return;
                }

                // No membership found - redirect to login
                setIsRedirecting(false);
            } catch (error) {
                console.error('Error during auth redirect:', error);
                setIsRedirecting(false);
            }
        };

        handleAuthRedirect();
    }, [user, isLoading, router]);

    // Show loader while checking auth or redirecting
    if (isLoading || isRedirecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader size="lg" text="Loading..." />
            </div>
        );
    }

    // Show landing page for unauthenticated users
    return (
        <main className="flex flex-col min-h-screen bg-black overflow-x-hidden">
            <HeroSection />
            <BuildingStory />
        </main>
    );
}

