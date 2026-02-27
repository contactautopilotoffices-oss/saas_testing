'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Edit3, ClipboardList, Calendar, Users, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';
import SOPTemplateFormModal from './SOPTemplateFormModal';

interface SOPTemplateManagerProps {
    propertyId: string;
    isAdmin?: boolean;
    userRole?: string;
    onSelectTemplate: (templateId: string) => void;
    onRefresh?: () => void;
}

const SOPTemplateManager: React.FC<SOPTemplateManagerProps> = ({ propertyId, isAdmin = false, userRole, onSelectTemplate, onRefresh }) => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            let query = supabase
                .from('sop_templates')
                .select(`
                    *,
                    items:sop_checklist_items(*),
                    completions:sop_completions(
                        id,
                        status,
                        completion_date,
                        items:sop_completion_items(is_checked, value)
                    )
                `)
                .eq('property_id', propertyId)
                .eq('is_active', true);

            // Filter by user ID if not admin
            if (!isAdmin) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    query = query.contains('assigned_to', [user.id]);
                }

            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            // Process data to get latest completion only
            const processedTemplates = (data || []).map(t => {
                const sortedCompletions = (t.completions || []).sort((a: any, b: any) =>
                    new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
                );
                return { ...t, latest_completion: sortedCompletions[0] };
            });

            setTemplates(processedTemplates);
        } catch (err) {
            setToast({ message: 'Error loading templates', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [propertyId]);

    const handleStop = async (templateId: string) => {
        if (!confirm('Deactivate this checklist template? It will no longer appear in the active list.')) return;

        try {
            const { error } = await supabase
                .from('sop_templates')
                .update({ is_active: false })
                .eq('id', templateId);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== templateId));
            setToast({ message: 'Checklist stopped/deactivated', type: 'success' });
            onRefresh?.();
        } catch (err) {
            setToast({ message: 'Error stopping checklist', type: 'error' });
        }
    };

    const handleDelete = async (templateId: string) => {
        if (!confirm('Permanently delete this template? This will also remove all historical audit logs for this template.')) return;

        try {
            const { error } = await supabase
                .from('sop_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== templateId));
            setToast({ message: 'Template deleted', type: 'success' });
        } catch (err) {
            setToast({ message: 'Error deleting template', type: 'error' });
        }
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setEditingTemplate(null);
        fetchTemplates();
        setToast({ message: editingTemplate ? 'Template updated' : 'Template created', type: 'success' });
        onRefresh?.();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-2 md:space-y-3">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
                        <ClipboardList size={14} />
                    </div>
                    <div>
                        <h3 className="text-xs md:text-sm font-black text-slate-900 tracking-tight">{isAdmin ? 'Active Templates' : 'My Checklists'}</h3>
                        <p className="text-[7px] md:text-[8px] text-slate-500 font-bold uppercase tracking-widest">{templates.length} {isAdmin ? 'Checklists' : 'Templates'}</p>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingTemplate(null);
                            setShowFormModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-sm font-black uppercase tracking-widest text-[8px] md:text-[9px] flex-shrink-0"
                    >
                        <Plus size={11} />
                        New Checklist
                    </button>
                )}
            </div>

            {/* Templates List */}
            <AnimatePresence mode='wait'>
                {templates.length > 0 ? (
                    <div className="flex flex-col gap-2 md:gap-3">
                        {templates.map((template, index) => {
                            const latestComp = template.latest_completion;
                            const compItems = latestComp?.items || [];
                            const checkedCount = compItems.filter((i: any) => i.is_checked || i.value).length;
                            const totalPoints = template.items?.length || 0;
                            const progress = totalPoints > 0 ? (checkedCount / totalPoints) * 100 : 0;

                            return (
                                <motion.div
                                    key={template.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`group relative bg-white border border-slate-200 rounded-lg md:rounded-xl px-2.5 md:px-4 py-2.5 md:py-3 hover:border-primary/30 transition-all duration-300 ${isAdmin ? 'cursor-pointer' : ''}`}
                                    {...(isAdmin ? {
                                        onClick: () => {
                                            setEditingTemplate(template);
                                            setShowFormModal(true);
                                        }
                                    } : {})}
                                >
                                    <div className="flex items-center gap-2.5 md:gap-4">
                                        {/* Compact Donut Chart */}
                                        <div className="relative w-9 h-9 md:w-10 md:h-10 flex-shrink-0">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                                                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                                                <motion.circle
                                                    cx="20" cy="20" r="16" fill="transparent"
                                                    stroke={progress === 100 ? '#10b981' : '#3b82f6'}
                                                    strokeWidth="4"
                                                    strokeDasharray={100.5}
                                                    initial={{ strokeDashoffset: 100.5 }}
                                                    animate={{ strokeDashoffset: 100.5 - (100.5 * progress) / 100 }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[7px] md:text-[8px] font-black text-slate-900 leading-none">{Math.round(progress)}%</span>
                                            </div>
                                        </div>

                                        {/* Title & Meta */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-xs md:text-sm text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{template.title}</h4>
                                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-0.5">
                                                <p className="text-slate-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest">
                                                    {latestComp ? `Last: ${new Date(latestComp.completion_date).toLocaleDateString()}` : 'No audit'}
                                                </p>
                                                {isAdmin && (
                                                    <>
                                                        <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest ${template.category?.toLowerCase() === 'security' ? 'bg-rose-50 text-rose-500' :
                                                            template.category?.toLowerCase() === 'cleaning' ? 'bg-emerald-50 text-emerald-500' :
                                                                'bg-blue-50 text-blue-500'
                                                            }`}>
                                                            {template.category || 'General'}
                                                        </span>
                                                        <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest hidden md:inline">
                                                            {template.frequency} · {totalPoints} pts
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onSelectTemplate(template.id); }}
                                                className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-slate-900 text-white rounded-md md:rounded-lg hover:bg-primary transition-all font-black uppercase tracking-widest text-[8px] md:text-[9px]"
                                            >
                                                <Play size={10} />
                                                Start
                                            </button>

                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStop(template.id); }}
                                                    className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-rose-600 text-white rounded-md md:rounded-lg hover:bg-rose-700 transition-all font-black uppercase tracking-widest text-[8px] md:text-[9px]"
                                                >
                                                    <Square size={10} />
                                                    Stop
                                                </button>
                                            )}

                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); setShowFormModal(true); }}
                                                        className="p-1 md:p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all hidden md:block"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                                                        className="p-1 md:p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-14 md:py-24 px-4 md:px-8 bg-slate-50 rounded-2xl md:rounded-[3rem] border-2 border-dashed border-slate-200"
                    >
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 mx-auto mb-4 md:mb-6">
                            <ClipboardList size={32} />
                        </div>
                        <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight mb-1.5 md:mb-2">
                            {isAdmin ? 'No Templates Found' : 'No Checklists Assigned'}
                        </h3>
                        <p className="text-slate-500 font-medium text-xs md:text-base max-w-sm mx-auto mb-6 md:mb-8">
                            {isAdmin ? 'Get started by creating your first standard operating procedure.' : 'No checklists have been assigned to your profile yet.'}
                        </p>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setEditingTemplate(null);
                                    setShowFormModal(true);
                                }}
                                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] md:text-xs mx-auto"
                            >
                                <Plus size={16} />
                                Create First Template
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <SOPTemplateFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingTemplate(null);
                }}
                propertyId={propertyId}
                template={editingTemplate}
                onSuccess={handleFormSuccess}
            />

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

export default SOPTemplateManager;
