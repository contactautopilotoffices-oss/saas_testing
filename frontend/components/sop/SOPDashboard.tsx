'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/frontend/context/AuthContext';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';
import { ClipboardCheck, History, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SOPTemplateManager from './SOPTemplateManager';
import SOPCompletionHistory from './SOPCompletionHistory';
import SOPChecklistRunner from './SOPChecklistRunner';
import SOPCompletionDetail from './SOPCompletionDetail';

interface SOPDashboardProps {
    propertyId: string;
}

const SOPDashboard: React.FC<SOPDashboardProps> = ({ propertyId }) => {
    const { membership } = useAuth();
    const [activeView, setActiveView] = useState<'list' | 'runner' | 'history' | 'detail'>('list');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedCompletionId, setSelectedCompletionId] = useState<string | null>(null);
    const [viewingCompletionId, setViewingCompletionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        // Determine user role for this property
        const fetchUserRole = async () => {
            try {
                const property = membership?.properties?.find(p => p.id === propertyId);
                if (property?.role) {
                    setUserRole(property.role);
                } else if (membership?.org_role) {
                    // Org-level admin viewing a property they don't have direct membership to
                    setUserRole(membership.org_role);
                } else {
                    setUserRole('staff');
                }
            } catch (err) {
                console.error('Error fetching user role:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRole();
    }, [propertyId, membership]);

    const isAdmin = ['property_admin', 'org_admin', 'org_super_admin', 'master_admin'].includes(userRole.toLowerCase());

    // Non-admin users should always land on history view
    useEffect(() => {
        if (!isLoading && !isAdmin) {
            setActiveView('history');
        }
    }, [isLoading, isAdmin]);

    const handleStartChecklist = (templateId: string, completionId?: string) => {
        setSelectedTemplateId(templateId);
        setSelectedCompletionId(completionId || null);
        setActiveView('runner');
    };

    const handleChecklistComplete = () => {
        setToast({ message: 'Checklist completed successfully!', type: 'success' });
        setActiveView('history');
        setSelectedTemplateId(null);
        setSelectedCompletionId(null);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 p-8">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-slate-50/50 rounded-xl md:rounded-[2rem] p-0">

            <div className="max-w-7xl mx-auto space-y-2 md:space-y-3">
                {/* Compact Header */}
                <div className="flex items-center justify-between gap-2 px-3 pt-2 md:px-2 md:pt-0">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                            <ClipboardCheck size={16} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">{isAdmin ? 'Checklist Manager' : 'My Checklist'}</h4>
                    </div>

                    {/* Tab Switcher - Only for admins */}
                    {isAdmin && (
                        <div className="bg-white p-0.5 md:p-1 rounded-lg md:rounded-xl shadow-sm border border-slate-200 flex items-center gap-0.5">
                            <button
                                onClick={() => setActiveView('list')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md md:rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${activeView === 'list'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutGrid size={11} />
                                Templates
                            </button>
                            <button
                                onClick={() => setActiveView('history')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md md:rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${activeView === 'history'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <History size={11} />
                                History
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <motion.div
                    layout
                    className="bg-white border border-slate-200 rounded-xl md:rounded-[2rem] shadow-sm overflow-hidden"
                >
                    <div className="p-2 md:p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeView}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isAdmin && activeView === 'list' && (
                                    <SOPTemplateManager
                                        propertyId={propertyId}
                                        isAdmin={isAdmin}
                                        userRole={userRole}
                                        onSelectTemplate={handleStartChecklist}
                                        onRefresh={() => { }}
                                    />
                                )}

                                {(activeView === 'history' || (!isAdmin && activeView === 'list')) && (
                                    <SOPCompletionHistory
                                        propertyId={propertyId}
                                        isAdmin={isAdmin}
                                        userRole={userRole}
                                        onSelectTemplate={handleStartChecklist}
                                        onViewDetail={(id: string) => {
                                            setViewingCompletionId(id);
                                            setActiveView('detail');
                                        }}
                                    />
                                )}

                                {activeView === 'detail' && viewingCompletionId && (
                                    <SOPCompletionDetail
                                        completionId={viewingCompletionId}
                                        propertyId={propertyId}
                                        isAdmin={isAdmin}
                                        onBack={() => {
                                            setActiveView('history');
                                            setViewingCompletionId(null);
                                        }}
                                    />
                                )}

                                {activeView === 'runner' && selectedTemplateId && (
                                    <div className="max-w-3xl mx-auto py-2 md:py-8">
                                        <SOPChecklistRunner
                                            templateId={selectedTemplateId}
                                            completionId={selectedCompletionId || undefined}
                                            isAdmin={isAdmin}
                                            propertyId={propertyId}
                                            onComplete={handleChecklistComplete}
                                            onCancel={() => {
                                                setActiveView(isAdmin ? 'list' : 'history');
                                                setSelectedTemplateId(null);
                                                setSelectedCompletionId(null);
                                            }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* Toast Notification */}
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
