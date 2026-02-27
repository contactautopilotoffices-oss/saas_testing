'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { History, User, Calendar, CheckCircle2, Clock, Trash2, Play, Eye, AlertCircle, Square } from 'lucide-react';

interface SOPCompletionHistoryProps {
    propertyId: string;
    onSelectTemplate: (templateId: string, completionId?: string) => void;
    onViewDetail: (completionId: string) => void;
    isAdmin?: boolean;
    userRole?: string;
}

// Helper: check if a template is due based on frequency and last completion
function isDue(frequency: string, lastCompletionDate: string | null): { due: boolean; label: string } {
    if (frequency === 'on_demand') return { due: false, label: '' };
    if (!lastCompletionDate) return { due: true, label: 'Not started' };

    const now = new Date();
    const last = new Date(lastCompletionDate);
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Reset time parts for same-day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const isSameDay = today.getTime() === lastDay.getTime();

    if (frequency === 'daily') {
        if (isSameDay) return { due: false, label: 'Done today' };
        if (diffDays === 1) return { due: true, label: 'Due today' };
        return { due: true, label: `Overdue by ${diffDays - 1}d` };
    }

    if (frequency === 'weekly') {
        if (diffDays < 7) return { due: false, label: `Due in ${7 - diffDays}d` };
        if (diffDays === 7) return { due: true, label: 'Due today' };
        return { due: true, label: `Overdue by ${diffDays - 7}d` };
    }

    if (frequency === 'monthly') {
        if (diffDays < 30) return { due: false, label: `Due in ${30 - diffDays}d` };
        if (diffDays === 30) return { due: true, label: 'Due today' };
        return { due: true, label: `Overdue by ${diffDays - 30}d` };
    }

    return { due: false, label: '' };
}

const SOPCompletionHistory: React.FC<SOPCompletionHistoryProps> = ({ propertyId, onSelectTemplate, onViewDetail, isAdmin = false, userRole }) => {
    const [completions, setCompletions] = useState<any[]>([]);
    const [dueTemplates, setDueTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, due: 0 });
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const { data: { user } } = await supabase.auth.getUser();

                // Fetch completions
                let completionQuery = supabase
                    .from('sop_completions')
                    .select(`
                        *,
                        template:sop_templates(title, frequency, category),
                        user:users(full_name),
                        items:sop_completion_items(is_checked, value)
                    `)
                    .eq('property_id', propertyId)
                    .order('completion_date', { ascending: false })
                    .limit(50);

                if (!isAdmin) {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser) {
                        completionQuery = completionQuery.eq('completed_by', authUser.id);
                    }
                }

                const { data: completionData, error: completionError } = await completionQuery;


                if (completionError) throw completionError;
                const results = completionData || [];
                setCompletions(results);

                // Fetch all active templates to determine due SOPs
                let templateQuery = supabase
                    .from('sop_templates')
                    .select('id, title, frequency, category, assigned_to')
                    .eq('property_id', propertyId)
                    .eq('is_active', true)
                    .neq('frequency', 'on_demand');


                const { data: templates, error: templateError } = await templateQuery;
                if (templateError) throw templateError;

                let applicableTemplates = templates || [];
                if (!isAdmin) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        applicableTemplates = applicableTemplates.filter(t =>
                            t.assigned_to && t.assigned_to.includes(user.id)
                        );


                    } else {
                        applicableTemplates = [];
                    }
                }


                // For each template, find the latest completed completion and check if due
                const due: any[] = [];
                for (const template of applicableTemplates) {
                    // Find the latest completed completion for this template
                    const templateCompletions = results.filter(
                        (c: any) => c.template_id === template.id && c.status === 'completed'
                    );
                    const latestCompletion = templateCompletions[0]; // already sorted desc
                    const lastDate = latestCompletion?.completion_date || null;

                    const dueStatus = isDue(template.frequency, lastDate);
                    if (dueStatus.due) {
                        // Check if there's already an in-progress completion
                        const inProgress = results.find(
                            (c: any) => c.template_id === template.id && c.status === 'in_progress'
                        );
                        due.push({
                            ...template,
                            dueLabel: dueStatus.label,
                            inProgressId: inProgress?.id || null,
                        });
                    }
                }

                setDueTemplates(due);

                setStats({
                    total: results.length,
                    completed: results.filter(c => c.status === 'completed').length,
                    pending: results.filter(c => c.status === 'in_progress').length,
                    due: due.length,
                });
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [propertyId, supabase, isAdmin, userRole]);

    const handleCancelSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to stop/cancel this active session? Information entered will be lost.')) return;

        try {
            const { error } = await supabase
                .from('sop_completions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCompletions(prev => prev.filter(c => c.id !== id));
            setDueTemplates(prev => {
                const affectedTemplateId = completions.find(c => c.id === id)?.template_id;
                if (!affectedTemplateId) return prev;
                return prev.map(t => t.id === affectedTemplateId ? { ...t, inProgressId: null } : t);
            });
            setStats(prev => ({
                ...prev,
                pending: prev.pending - 1,
                total: prev.total - 1
            }));
        } catch (err) {
            console.error('Error canceling session:', err);
            alert('Failed to stop the session.');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this audit record? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('sop_completions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCompletions(prev => prev.filter(c => c.id !== id));
            setStats(prev => ({
                ...prev,
                total: prev.total - 1
            }));
        } catch (err) {
            console.error('Error deleting completion:', err);
            alert('Failed to delete the audit record.');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-3 md:space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-3">
                <div className="bg-white p-2 md:p-3 rounded-lg md:rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-base md:text-lg font-black">{stats.total}</p>
                    </div>
                    <History size={12} className="text-slate-200 hidden md:block" />
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-2 md:p-3 rounded-lg md:rounded-xl border border-emerald-100 flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                        <p className="text-[7px] md:text-[8px] font-black text-emerald-400 uppercase tracking-widest">Done</p>
                        <p className="text-base md:text-lg font-black">{stats.completed}</p>
                    </div>
                    <CheckCircle2 size={12} className="text-emerald-200 hidden md:block" />
                </div>
                <div className="bg-amber-50 text-amber-600 p-2 md:p-3 rounded-lg md:rounded-xl border border-amber-100 flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                        <p className="text-[7px] md:text-[8px] font-black text-amber-400 uppercase tracking-widest">Active</p>
                        <p className="text-base md:text-lg font-black">{stats.pending}</p>
                    </div>
                    <Clock size={12} className="text-amber-200 hidden md:block" />
                </div>
                <div className={`p-2 md:p-3 rounded-lg md:rounded-xl border flex flex-col md:flex-row md:justify-between md:items-center ${stats.due > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    <div>
                        <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest ${stats.due > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Due</p>
                        <p className="text-base md:text-lg font-black">{stats.due}</p>
                    </div>
                    <AlertCircle size={12} className={`hidden md:block ${stats.due > 0 ? 'text-rose-200' : 'text-slate-200'}`} />
                </div>
            </div>

            {/* Due Checklists Section */}
            {dueTemplates.length > 0 && (
                <div className="space-y-1.5 md:space-y-2">
                    <h3 className="text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest px-1">Due Checklists</h3>
                    {dueTemplates.map((template, index) => (
                        <motion.div
                            key={`due-${template.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="bg-rose-50/50 border border-rose-200 rounded-lg md:rounded-xl p-2.5 md:p-3 hover:border-rose-300 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-rose-100 text-rose-500">
                                        <AlertCircle size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight truncate">
                                            {template.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-rose-500">
                                                {template.dueLabel}
                                            </span>
                                            <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                {template.frequency}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onSelectTemplate(template.id, template.inProgressId || undefined)}
                                    className="flex items-center gap-1 px-2.5 md:px-3 py-1 bg-slate-900 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-sm flex-shrink-0"
                                >
                                    <Play size={9} />
                                    {template.inProgressId ? 'Resume' : 'Start'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* History List */}
            <div className="space-y-1.5 md:space-y-2">
                {completions.length > 0 && (
                    <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">History</h3>
                )}
                <AnimatePresence>
                    {completions.map((completion, index) => {
                        const items = completion.items || [];
                        const checkedItems = items.filter((i: any) => i.is_checked || i.value).length;
                        const totalItems = items.length;
                        const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

                        return (
                            <motion.div
                                key={completion.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="group bg-white border border-slate-100 rounded-lg md:rounded-xl p-2.5 md:p-3 hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
                            >
                                {/* Top row: icon + title + meta */}
                                <div className="flex items-start gap-2 md:gap-3">
                                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${completion.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                        {completion.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight truncate">
                                            {completion.template?.title || 'Unknown Checklist'}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <Calendar size={9} />
                                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider">
                                                    {new Date(completion.completion_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <User size={9} />
                                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider truncate max-w-[80px] md:max-w-[100px]">{completion.user?.full_name || 'System User'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-2 md:mt-2.5">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion</span>
                                        <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">{checkedItems}/{totalItems} Points</span>
                                    </div>
                                    <div className="w-full h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                        />
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-1.5 md:gap-2 mt-2 md:mt-2.5">
                                    <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest ${completion.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : completion.status === 'in_progress'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {completion.status.replace('_', ' ')}
                                    </div>

                                    {completion.status !== 'completed' && (
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectTemplate(completion.template_id, completion.id);
                                                }}
                                                className="flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 bg-slate-900 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-sm relative z-10"
                                            >
                                                <Play size={8} />
                                                {completion.status === 'in_progress' ? 'Resume' : 'Start'}
                                            </button>
                                            {completion.status === 'in_progress' && (
                                                <button
                                                    onClick={(e) => handleCancelSession(completion.id, e)}
                                                    className="flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 bg-rose-600 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm relative z-10"
                                                >
                                                    <Square size={8} />
                                                    Stop
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDetail(completion.id);
                                        }}
                                        className="flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 bg-white text-slate-600 border border-slate-200 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all relative z-10"
                                    >
                                        <Eye size={8} />
                                        Details
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleDelete(completion.id, e)}
                                            className="p-1 md:p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all relative z-10 ml-auto"
                                            title="Delete Audit Record"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {completions.length === 0 && dueTemplates.length === 0 && (
                    <div className="text-center py-12 md:py-20 px-4 md:px-6 bg-slate-50 rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 mx-auto mb-4 md:mb-5">
                            <History size={24} />
                        </div>
                        <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight mb-1">No History Record Found</h3>
                        <p className="text-slate-500 text-xs md:text-sm font-medium max-w-sm mx-auto">Completing checklist items will populate this history log with audit records.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SOPCompletionHistory;
