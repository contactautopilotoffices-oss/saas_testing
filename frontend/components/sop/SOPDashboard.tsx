'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/frontend/context/AuthContext';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';
import SOPTemplateManager from './SOPTemplateManager';
import SOPCompletionHistory from './SOPCompletionHistory';
import SOPChecklistRunner from './SOPChecklistRunner';

interface SOPDashboardProps {
    propertyId: string;
}

const SOPDashboard: React.FC<SOPDashboardProps> = ({ propertyId }) => {
    const { membership } = useAuth();
    const [activeView, setActiveView] = useState<'list' | 'runner' | 'history'>('list');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        // Determine user role for this property
        const fetchUserRole = async () => {
            try {
                const property = membership?.properties?.find(p => p.id === propertyId);
                setUserRole(property?.role || 'staff');
            } catch (err) {
                console.error('Error fetching user role:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRole();
    }, [propertyId, membership]);

    const isAdmin = ['property_admin', 'org_admin', 'master_admin'].includes(userRole.toLowerCase());

    const handleStartChecklist = (templateId: string) => {
        setSelectedTemplateId(templateId);
        setActiveView('runner');
    };

    const handleChecklistComplete = () => {
        setToast({ message: 'Checklist completed successfully!', type: 'success' });
        setActiveView('history');
        setSelectedTemplateId(null);
    };

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="w-full space-y-6">
            {/* Tabs */}
            <div className="flex gap-3 border-b border-border-primary">
                {isAdmin && (
                    <button
                        onClick={() => setActiveView('list')}
                        className={`px-4 py-3 font-semibold text-sm transition-colors ${activeView === 'list'
                            ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        SOP Templates
                    </button>
                )}
                <button
                    onClick={() => setActiveView('history')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeView === 'history'
                        ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    My Completions
                </button>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeView === 'list' && isAdmin && (
                    <SOPTemplateManager
                        propertyId={propertyId}
                        isAdmin={isAdmin}
                        onSelectTemplate={handleStartChecklist}
                        onRefresh={() => { }}
                    />
                )}

                {activeView === 'history' && (
                    <SOPCompletionHistory
                        propertyId={propertyId}
                        onSelectTemplate={handleStartChecklist}
                    />
                )}

                {activeView === 'runner' && selectedTemplateId && (
                    <SOPChecklistRunner
                        templateId={selectedTemplateId}
                        propertyId={propertyId}
                        onComplete={handleChecklistComplete}
                        onCancel={() => {
                            setActiveView('history');
                            setSelectedTemplateId(null);
                        }}
                    />
                )}
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    visible={true}
                    onClose={() => setToast(null)}
                    duration={3000}
                />
            )}
        </div>
    );
};

export default SOPDashboard;
