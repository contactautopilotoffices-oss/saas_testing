'use client';

import React from 'react';
import PropertyDashboard from './PropertyDashboard';
import OrgDashboard from './OrgDashboard';
import TenantDashboard from './TenantDashboard';
import MasterAdminDashboard from './MasterAdminDashboard';
import Loader from '@/frontend/components/ui/Loader';
import { useAppSession } from '@/frontend/hooks/useAppSession';

const UnifiedDashboard = () => {
    const { session, isLoading } = useAppSession();

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader size="lg" />
            </div>
        );
    }

    const role = session?.role;

    // Master Admin view
    if (role === 'master_admin') {
        return <MasterAdminDashboard />;
    }

    if (role === 'property_admin') {
        return <PropertyDashboard propertyId={session?.property_ids[0] || 'prop-1'} />;
    }

    if (role === 'org_super_admin') {
        return <OrgDashboard orgId={session?.org_id || ''} />;
    }

    // Default to tenant view (scoped by property from session)
    return <TenantDashboard />;
};

export default UnifiedDashboard;
