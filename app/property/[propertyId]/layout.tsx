'use client';

import { useAuth } from "@/frontend/context/AuthContext";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/frontend/utils/supabase/client";
import Loader from "@/frontend/components/ui/Loader";

interface PropertyMembership {
    property_id: string;
    organization_id: string;
    role: string;
}

export default function PropertyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const propertyId = params.propertyId as string;

    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    useEffect(() => {
        const checkPropertyAccess = async () => {
            // Wait for auth to finish loading
            if (authLoading) return;

            // Redirect to login if not authenticated
            if (!user) {
                router.replace('/login');
                return;
            }

            try {
                const supabase = createClient();

                // Check if user has property membership for this property
                const { data: membership, error } = await supabase
                    .from('property_memberships')
                    .select('property_id, organization_id, role')
                    .eq('user_id', user.id)
                    .eq('property_id', propertyId)
                    .eq('is_active', true)
                    .maybeSingle();

                if (error) {
                    console.error('Property access check error:', error);
                    setIsAuthorized(false);
                    setIsCheckingAccess(false);
                    return;
                }

                if (membership) {
                    // User has property membership
                    setIsAuthorized(true);
                    setUserRole(membership.role);

                    // Validate role-based route access
                    const allowedPaths = getRoleAllowedPaths(membership.role, propertyId);
                    const currentPath = pathname || '';

                    // Check if current path is allowed for this role
                    const isPathAllowed = allowedPaths.some(allowed =>
                        currentPath.startsWith(allowed) || currentPath === allowed
                    );

                    if (!isPathAllowed) {
                        // Redirect to the appropriate dashboard for their role
                        const redirectPath = getRoleDefaultPath(membership.role, propertyId);
                        router.replace(redirectPath);
                        return;
                    }
                } else {
                    // No property membership - check org admin access
                    const { data: orgMembership } = await supabase
                        .from('organization_memberships')
                        .select('organization_id, role')
                        .eq('user_id', user.id)
                        .eq('is_active', true);

                    // Check if user is org admin for the property's org
                    if (orgMembership && orgMembership.length > 0) {
                        const { data: property } = await supabase
                            .from('properties')
                            .select('organization_id')
                            .eq('id', propertyId)
                            .single();

                        if (property && orgMembership.some(m => m.organization_id === property.organization_id)) {
                            // Org admin can access all properties in their org
                            setIsAuthorized(true);
                            setUserRole('org_admin');
                            setIsCheckingAccess(false);
                            return;
                        }
                    }

                    // No access
                    setIsAuthorized(false);
                }
            } catch (err) {
                console.error('Access check failed:', err);
                setIsAuthorized(false);
            } finally {
                setIsCheckingAccess(false);
            }
        };

        checkPropertyAccess();
    }, [user, authLoading, propertyId, pathname, router]);

    // Loading state
    if (authLoading || isCheckingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader size="lg" text="Verifying access..." />
            </div>
        );
    }

    // Not authenticated - will redirect
    if (!user) {
        return null;
    }

    // Not authorized for this property
    if (isAuthorized === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
                    <p className="text-text-secondary mb-6">
                        You don't have permission to access this property. Please contact your administrator if you believe this is an error.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Get allowed paths based on user role
 */
function getRoleAllowedPaths(role: string, propertyId: string): string[] {
    const basePath = `/property/${propertyId}`;

    switch (role) {
        case 'property_admin':
        case 'org_admin':
            // Full access
            return [basePath];
        case 'tenant':
            return [
                `${basePath}/tenant`,
                `${basePath}/dashboard`, // Some dashboards may be shared
            ];
        case 'security':
            return [
                `${basePath}/security`,
                `${basePath}/dashboard`,
            ];
        case 'staff':
            return [
                `${basePath}/staff`,
                `${basePath}/dashboard`,
            ];
        case 'mst':
            return [
                `${basePath}/mst`,
                `${basePath}/dashboard`,
            ];
        case 'vendor':
            return [
                `${basePath}/vendor`,
                `${basePath}/dashboard`,
            ];
        default:
            return [`${basePath}/dashboard`];
    }
}

/**
 * Get default redirect path based on user role
 */
function getRoleDefaultPath(role: string, propertyId: string): string {
    const basePath = `/property/${propertyId}`;

    switch (role) {
        case 'property_admin':
            return `${basePath}/dashboard`;
        case 'tenant':
            return `${basePath}/tenant`;
        case 'security':
            return `${basePath}/security`;
        case 'staff':
            return `${basePath}/staff`;
        case 'mst':
            return `${basePath}/mst`;
        case 'vendor':
            return `${basePath}/vendor`;
        default:
            return `${basePath}/dashboard`;
    }
}
