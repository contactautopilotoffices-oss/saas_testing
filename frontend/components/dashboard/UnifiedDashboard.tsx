'use client';

import React, { useState } from 'react';
import PropertyAdminDashboard from './PropertyAdminDashboard';
import OrgDashboard from './OrgDashboard';
import MasterAdminDashboard from './MasterAdminDashboard';
import SoftServiceManagerDashboard from './SoftServiceManagerDashboard';
import Loader from '@/frontend/components/ui/Loader';
import { useAppSession } from '@/frontend/hooks/useAppSession';
import PropertySelectionView from './PropertySelectionView';
import { AlertCircle } from 'lucide-react';

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

    const role = session?.role?.toLowerCase();
    const propertyIds = session?.property_ids || [];

    console.log('[UnifiedDashboard] Session Data:', { role, propertyIds, userId: session?.user_id });

    // Master Admin view
    if (role === 'master_admin') {
        return <MasterAdminDashboard />;
    }

    if (role === 'org_super_admin' || role === 'org_admin') {
        const orgId = session?.org_id || '';
        return <OrgDashboard orgId={orgId} />;
    }

    // Soft Service Manager/Supervisor — dedicated dashboard
    if (role === 'soft_service_manager' || role === 'soft_service_supervisor' || role === 'soft_service_staff') {
        const activePropertyId = propertyIds[0] || 'prop-1';
        return <SoftServiceManagerDashboard propertyId={activePropertyId} userRole={role} />;
    }

    // Handle roles that might have multiple properties
    if (role === 'property_admin') {
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

        const activePropertyId = selectedPropertyId || propertyIds[0] || 'prop-1';
        return <PropertyAdminDashboard />;
    }

    // Default Fallback - Avoid TenantDashboard as requested
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
            <p className="text-slate-500 mt-2 max-w-sm">
                You don't have an active role assigned for this property. Please contact your administrator.
            </p>
        </div>
    );
};

export default UnifiedDashboard;
