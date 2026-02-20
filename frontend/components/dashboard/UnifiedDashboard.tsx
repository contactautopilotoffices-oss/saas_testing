'use client';

import React, { useState } from 'react';
import PropertyDashboard from './PropertyDashboard';
import OrgDashboard from './OrgDashboard';
import TenantDashboard from './TenantDashboard';
import MasterAdminDashboard from './MasterAdminDashboard';
import SoftServiceManagerDashboard from './SoftServiceManagerDashboard';
import Loader from '@/frontend/components/ui/Loader';
import { useAppSession } from '@/frontend/hooks/useAppSession';
import PropertySelectionView from './PropertySelectionView';

const UnifiedDashboard = () => {
    const { session, isLoading } = useAppSession();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader size="lg" />
            </div>
        );
    }

    const role = session?.role;
    const propertyIds = session?.property_ids || [];

    // Master Admin view
    if (role === 'master_admin') {
        return <MasterAdminDashboard />;
    }

    if (role === 'org_super_admin') {
        return <OrgDashboard orgId={session?.org_id || ''} />;
    }

    // Soft Service Manager — dedicated dashboard
    if (role === 'soft_service_manager') {
        const activePropertyId = propertyIds[0] || 'prop-1';
        return <SoftServiceManagerDashboard propertyId={activePropertyId} />;
    }

    // Handle roles that might have multiple properties
    if (role === 'property_admin' || role === 'staff') {
        // If multiple properties and none selected yet, show selection view
        if (propertyIds.length > 1 && !selectedPropertyId) {
            return (
                <div className="min-h-screen bg-background text-foreground">
                    <PropertySelectionView
                        propertyIds={propertyIds}
                        onSelect={setSelectedPropertyId}
                    />
                </div>
            );
        }

        // Default to first property if only one, or use selected property
        const activePropertyId = selectedPropertyId || propertyIds[0] || 'prop-1';
        return <PropertyDashboard propertyId={activePropertyId} />;
    }

    // Default to tenant view (scoped by property from session)
    return <TenantDashboard />;
};

export default UnifiedDashboard;
