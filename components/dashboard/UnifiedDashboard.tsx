'use client';

import React from 'react';
import PropertyDashboard from './PropertyDashboard';
import OrgDashboard from './OrgDashboard';
import TenantDashboard from './TenantDashboard';
import MasterAdminDashboard from './MasterAdminDashboard';
import { Loader2 } from 'lucide-react';
import { useAppSession } from '@/hooks/useAppSession';

const UnifiedDashboard = () => {
    const { session, isLoading } = useAppSession();

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
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
        return <OrgDashboard orgId={session?.org_id} />;
    }

    // Default to tenant view (scoped by property from session)
    return <TenantDashboard />;
};

export default UnifiedDashboard;
