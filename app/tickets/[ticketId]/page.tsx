'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Clock, Calendar, MapPin, User, CheckCircle2,
    AlertCircle, Camera, Paperclip, Send, PauseCircle, PlayCircle,
    Forward, XCircle, ShieldAlert, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: 'open' | 'assigned' | 'in_progress' | 'blocked' | 'resolved' | 'closed' | 'waitlist';
    priority: string;
    category?: { name: string; code: string };
    created_at: string;
    assigned_at?: string;
    work_started_at?: string;
    resolved_at?: string;
    closed_at?: string;
    sla_deadline?: string;
    sla_breached: boolean;
    sla_paused: boolean;
    location?: string;
    floor_number?: number;
    photo_before_url?: string;
    photo_after_url?: string;
    created_by: string;
    assigned_to?: string;
    property_id: string;
    creator?: { full_name: string; email: string; role?: string };
    assignee?: { full_name: string; email: string; role?: string };
}

interface Activity {
    id: string;
    action: string;
    created_at: string;
    user?: { full_name: string };
    old_value?: string;
    new_value?: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    is_internal: boolean;
    user?: { full_name: string; avatar_url?: string };
}

export default function TicketDetailPage() {
    const { ticketId } = useParams();
    const router = useRouter();
    const supabase = createClient();

    // State
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [userRole, setUserRole] = useState<'admin' | 'staff' | 'tenant' | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Reassign State
    const [resolvers, setResolvers] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedResolver, setSelectedResolver] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Initial Fetch
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserId(user.id);
            await fetchTicketDetails(user.id);
        };
        init();

        // Realtime Subscription
        const channel = supabase
            .channel('ticket_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` },
                () => fetchTicketDetails(userId, true))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_comments', filter: `ticket_id=eq.${ticketId}` },
                (payload) => {
                    fetchComments(); // Refetch to get user details
                })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_activity_log', filter: `ticket_id=eq.${ticketId}` },
                () => fetchActivities())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketId]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchTicketDetails = async (currentUserId: string | null = userId, skipRoleCheck = false) => {
        try {
            // Fetch Ticket
            const { data: t, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    category:issue_categories(name, code),
                    creator:created_by(full_name, email),
                    assignee:assigned_to(full_name, email)
                `)
                .eq('id', ticketId)
                .single();

            if (error) throw error;
            setTicket(t);

            if (t.property_id) fetchResolvers(t.property_id);

            if (!skipRoleCheck && currentUserId) {
                await determineUserRole(currentUserId, t.property_id);
            }

            // Fetch Related Data
            await Promise.all([fetchActivities(), fetchComments()]);
        } catch (err) {
            console.error('Error loading ticket:', err);
            // handle error
        } finally {
            setLoading(false);
        }
    };

    const determineUserRole = async (uid: string, propertyId: string) => {
        // Check Admin (Org or Property)
        const { data: orgMember } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('user_id', uid)
            .in('role', ['master_admin', 'org_super_admin'])
            .maybeSingle();

        if (orgMember) {
            setUserRole('admin');
            return;
        }

        const { data: propMember } = await supabase
            .from('property_memberships')
            .select('role')
            .eq('user_id', uid)
            .eq('property_id', propertyId)
            .maybeSingle();

        if (propMember?.role === 'property_admin') {
            setUserRole('admin');
        } else if (propMember?.role === 'staff' || propMember?.role === 'mst') {
            setUserRole('staff');
        } else {
            setUserRole('tenant');
        }
    };

    const fetchActivities = async () => {
        const { data } = await supabase
            .from('ticket_activity_log')
            .select('*, user:user_id(full_name)')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });
        setActivities(data || []);
    };

    const fetchComments = async () => {
        const { data } = await supabase
            .from('ticket_comments')
            .select('*, user:user_id(full_name)')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        setComments(data || []);
    };

    const fetchResolvers = async (propId: string) => {
        const { data } = await supabase
            .from('resolver_stats')
            .select('*, user:users(full_name)')
            .eq('property_id', propId)
            .eq('is_available', true);
        setResolvers(data || []);
    };

    // Actions
    const handleStatusChange = async (newStatus: string) => {
        if (!ticket) return;

        // MST Close Validation
        if (newStatus === 'closed' && userRole === 'staff') {
            if (!ticket.photo_before_url || !ticket.photo_after_url) {
                const proceed = window.confirm('⚠️ You haven’t attached before/after photos. Do you want to proceed?');
                if (!proceed) return;
            }
        }

        try {
            const updates: any = { status: newStatus };
            if (newStatus === 'in_progress') updates.work_started_at = new Date().toISOString();
            if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
            if (newStatus === 'closed') updates.closed_at = new Date().toISOString();

            const { error } = await supabase
                .from('tickets')
                .update(updates)
                .eq('id', ticketId);

            if (error) throw error;

            // Log Activity
            await logActivity(newStatus === 'closed' ? 'closed_ticket' : 'status_update', ticket.status, newStatus);

            showToast(`Ticket ${newStatus.replace('_', ' ')}`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleClaim = async () => {
        if (!userId) return;
        try {
            await supabase
                .from('tickets')
                .update({
                    assigned_to: userId,
                    assigned_at: new Date().toISOString(),
                    status: 'assigned'
                })
                .eq('id', ticketId);

            await logActivity('claimed', null, 'Self-assigned by MST');
            showToast('Request Claimed', 'success');
            fetchTicketDetails(userId, true);
        } catch (err) {
            showToast('Failed to claim request', 'error');
        }
    };

    const handleReassign = async () => {
        if (!selectedResolver) return;
        try {
            await supabase
                .from('tickets')
                .update({
                    assigned_to: selectedResolver,
                    assigned_at: new Date().toISOString(),
                    status: 'assigned'
                })
                .eq('id', ticketId);

            await logActivity('reassigned', ticket?.assigned_to, selectedResolver);
            showToast('Ticket Reassigned', 'success');
            setShowAssignModal(false);
            fetchTicketDetails(userId, true);
        } catch (err) {
            showToast('Failed to reassign', 'error');
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${ticketId}/${type}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('ticket_photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('ticket_photos')
                .getPublicUrl(fileName);

            const updateField = type === 'before' ? 'photo_before_url' : 'photo_after_url';
            await supabase
                .from('tickets')
                .update({ [updateField]: publicUrl })
                .eq('id', ticketId);

            await logActivity('photo_upload', null, `Uploaded ${type} photo`);
            showToast(`${type} photo uploaded`, 'success');
        } catch (err) {
            showToast('Failed to upload photo', 'error');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        try {
            const { error } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: ticketId,
                    user_id: userId,
                    content: commentText,
                    is_internal: isInternalComment
                });

            if (error) throw error;
            setCommentText('');
            await logActivity('comment_added', null, isInternalComment ? 'Internal Note' : 'Comment');
        } catch (err) {
            showToast('Failed to post comment', 'error');
        }
    };

    const logActivity = async (action: string, oldVal?: string | null, newVal?: string | null) => {
        await supabase.from('ticket_activity_log').insert({
            ticket_id: ticketId,
            user_id: userId,
            action,
            old_value: oldVal,
            new_value: newVal
        });
    };

    const handleSLAAction = async (pause: boolean) => {
        try {
            await fetch(`/api/tickets/${ticketId}/pause-sla`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pause, reason: pause ? 'Paused by admin' : undefined }),
            });
            showToast(pause ? 'SLA Paused' : 'SLA Resumed', 'success');
        } catch (err) {
            showToast('Failed to update SLA', 'error');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
    if (!ticket) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Ticket not found</div>;

    const isAssignedToMe = userId === ticket.assigned_to;
    const canManage = userRole === 'admin';
    const canWork = userRole === 'staff' && isAssignedToMe;

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-inter text-slate-900 pb-12">
            {/* Toast Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 font-bold text-sm text-white ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_number}</span>
                                {ticket.category && (
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black uppercase tracking-wider text-slate-600">
                                        {ticket.category.name}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-600' :
                                    ticket.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    {ticket.priority} Priority
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-slate-900">{ticket.title}</h1>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className={`text-sm font-black uppercase tracking-wide mb-1 ${ticket.status === 'closed' ? 'text-emerald-600' :
                                ticket.status === 'in_progress' ? 'text-blue-600' : 'text-slate-600'
                                }`}>
                                {ticket.status.replace('_', ' ')}
                            </div>
                            {ticket.sla_deadline && ticket.status !== 'closed' && (
                                <div className={`flex items-center justify-end gap-1 text-xs font-bold ${ticket.sla_breached ? 'text-rose-500' : 'text-slate-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    {ticket.sla_paused ? 'SLA Paused' :
                                        ticket.sla_breached ? 'Breached' :
                                            `Due ${new Date(ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {/* MST Actions */}
                        {userRole === 'staff' && ticket.status === 'open' && !ticket.assigned_to && (
                            <button
                                onClick={() => handleClaim()}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                <User className="w-4 h-4" /> Claim Request
                            </button>
                        )}
                        {canWork && ticket.status === 'assigned' && (
                            <button
                                onClick={() => handleStatusChange('in_progress')}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                            >
                                <PlayCircle className="w-4 h-4" /> Start Work
                            </button>
                        )}
                        {canWork && (ticket.status === 'in_progress' || ticket.status === 'assigned') && (
                            <button
                                onClick={() => handleStatusChange('closed')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Close Ticket
                            </button>
                        )}

                        {/* Admin Actions */}
                        {canManage && (
                            <>
                                <button
                                    onClick={() => handleSLAAction(!ticket.sla_paused)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                    {ticket.sla_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                    {ticket.sla_paused ? 'Resume SLA' : 'Pause SLA'}
                                </button>
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                    <User className="w-4 h-4" /> Reassign
                                </button>
                                {ticket.status !== 'closed' && (
                                    <button
                                        onClick={() => handleStatusChange('closed')}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" /> Force Close
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Context & Details */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Context Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Requestor
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold">
                                        {ticket.creator?.full_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{ticket.creator?.full_name || 'Unknown User'}</p>
                                        <p className="text-xs text-slate-500">{ticket.creator?.email}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Floor {ticket.floor_number || '-'} • {ticket.location || 'General Area'}</span>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> Resolver
                                </h3>
                                {ticket.assignee ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold">
                                            {ticket.assignee.full_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{ticket.assignee.full_name}</p>
                                            <p className="text-xs text-slate-500">Assigned {new Date(ticket.assigned_at!).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-400">Unassigned</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Before / After Photos */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-slate-400" />
                                Site Documentation
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Before Photo */}
                                <div className="space-y-3">
                                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Before Work</div>
                                    {ticket.photo_before_url ? (
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                            <img src={ticket.photo_before_url} alt="Before" className="w-full h-full object-cover" />
                                            <a href={ticket.photo_before_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold">View Full</span>
                                            </a>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
                                            <Camera className="w-8 h-8 text-slate-300 group-hover:text-slate-400 mb-2" />
                                            <span className="text-xs font-bold text-slate-400">Upload Before Photo</span>
                                            <input type="file" accept="image/*" className="hidden" disabled={!canWork && !canManage && userRole !== 'tenant'} onChange={(e) => handleFileUpload(e, 'before')} />
                                        </label>
                                    )}
                                </div>

                                {/* After Photo */}
                                <div className="space-y-3">
                                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">After Work</div>
                                    {ticket.photo_after_url ? (
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                            <img src={ticket.photo_after_url} alt="After" className="w-full h-full object-cover" />
                                            <a href={ticket.photo_after_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold">View Full</span>
                                            </a>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
                                            <Camera className="w-8 h-8 text-slate-300 group-hover:text-slate-400 mb-2" />
                                            <span className="text-xs font-bold text-slate-400">Upload After Photo</span>
                                            <input type="file" accept="image/*" className="hidden" disabled={!canWork && !canManage} onChange={(e) => handleFileUpload(e, 'after')} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Activity Timeline (Progress) */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-400" />
                                Activity Timeline
                            </h3>
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                                {activities.map((act, idx) => (
                                    <div key={act.id} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    {act.action.replace(/_/g, ' ')}
                                                    <span className="text-slate-400 font-medium mx-1">by</span>
                                                    <span className="text-indigo-600">{act.user?.full_name || 'System'}</span>
                                                </p>
                                                {act.new_value && (
                                                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 inline-block px-2 py-1 rounded">
                                                        Changed to <span className="font-bold">{act.new_value}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {new Date(act.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Comments & Chat */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col h-[600px] sticky top-24">
                            <div className="p-4 border-b border-slate-100">
                                <h3 className="text-sm font-black text-slate-900">Communication</h3>
                                <p className="text-xs text-slate-500">Discussion thread for this ticket</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {comments.length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <p className="text-xs font-bold text-slate-400">No comments yet</p>
                                    </div>
                                )}
                                {comments.map(comment => {
                                    if (comment.is_internal && userRole === 'tenant') return null;
                                    const isMe = comment.user_id === userId;
                                    return (
                                        <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${isMe ? 'bg-slate-900 text-white rounded-tr-sm' :
                                                comment.is_internal ? 'bg-amber-50 text-amber-900 border border-amber-100 rounded-tl-sm' :
                                                    'bg-slate-100 text-slate-800 rounded-tl-sm'
                                                }`}>
                                                {comment.is_internal && (
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" /> Internal Note
                                                    </div>
                                                )}
                                                <p>{comment.content}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1 font-medium mx-1">
                                                {comment.user?.full_name} • {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                                {canManage && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id="internal"
                                            checked={isInternalComment}
                                            onChange={(e) => setIsInternalComment(e.target.checked)}
                                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                        <label htmlFor="internal" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Internal Note (Hidden from Tenant)</label>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!commentText.trim()}
                                        className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Reassign Modal */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="font-black text-slate-900 mb-4">Reassign Ticket</h3>
                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {resolvers.length === 0 ? <p className="text-slate-500 text-sm">No available resolvers</p> : resolvers.map(r => (
                                    <button
                                        key={r.user_id}
                                        onClick={() => setSelectedResolver(r.user_id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border ${selectedResolver === r.user_id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <span className="font-bold text-sm text-slate-700">{r.user?.full_name}</span>
                                        <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded">
                                            {r.active_tickets || 0} tasks
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleReassign}
                                disabled={!selectedResolver}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Confirm Reassignment
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
