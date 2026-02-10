'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/frontend/utils/supabase/client';
import {
    ArrowLeft,
    Clock,
    Calendar,
    MapPin,
    User,
    CheckCircle2,
    AlertCircle,
    Camera,
    Paperclip,
    Send,
    PauseCircle,
    PlayCircle,
    Forward,
    XCircle,
    ShieldAlert,
    History,
    Activity,
    ChevronRight,
    MessageSquare,
    Tag,
    Navigation2,
    Building2,
    Plus,
    MoreHorizontal,
    Share2,
    AlertTriangle,
    Sparkles,
    Brain,
    Pencil,
    X,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/frontend/utils/image-compression';
import { useTheme } from '@/frontend/context/ThemeContext';

// Types
interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: 'open' | 'assigned' | 'in_progress' | 'blocked' | 'resolved' | 'closed' | 'waitlist';
    priority: string;
    category?: { name: string; code: string };
    skill_group?: { name: string; code: string };
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
    raised_by: string;
    created_by?: string; // Support both for safety
    assigned_to?: string;
    property_id: string;
    property?: { name: string };
    creator?: { id: string; full_name: string; email: string };
    assignee?: { id: string; full_name: string; email: string };
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
    comment: string;
    created_at: string;
    user_id: string;
    is_internal: boolean;
    user?: { full_name: string; avatar_url?: string };
}

export default function TicketDetailPage() {
    const { ticketId } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const { theme } = useTheme();
    const supabase = createClient();

    // State
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [userRole, setUserRole] = useState<'admin' | 'staff' | 'tenant' | 'mst' | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Reassign State
    const [resolvers, setResolvers] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedResolver, setSelectedResolver] = useState('');

    // Creator Role State
    const [creatorRole, setCreatorRole] = useState<string>('Tenant');
    const [assigneeRole, setAssigneeRole] = useState<string>('MST');

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Edit Modal State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isUpdatingContent, setIsUpdatingContent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userSkills, setUserSkills] = useState<string[]>([]);

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
                    skill_group:skill_groups(name, code),
                    property:properties(name),
                    creator:users!raised_by(id, full_name, email),
                    assignee:users!assigned_to(id, full_name, email)
                `)
                .eq('id', ticketId)
                .single();

            if (error) throw error;
            setTicket(t);

            if (t.property_id) fetchResolvers(t.property_id);

            // Fetch creator's role from property_memberships
            if (t.raised_by && t.property_id) {
                const { data: creatorMembership } = await supabase
                    .from('property_memberships')
                    .select('role')
                    .eq('user_id', t.raised_by)
                    .eq('property_id', t.property_id)
                    .maybeSingle();

                if (creatorMembership?.role) {
                    const formattedRole = creatorMembership.role === 'mst' ? 'MST' : creatorMembership.role
                        .split('_')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    setCreatorRole(formattedRole);
                } else {
                    setCreatorRole('Tenant');
                }
            }

            // Fetch assignee's role from property_memberships
            if (t.assigned_to && t.property_id) {
                const { data: assigneeMembership } = await supabase
                    .from('property_memberships')
                    .select('role')
                    .eq('user_id', t.assigned_to)
                    .eq('property_id', t.property_id)
                    .maybeSingle();

                if (assigneeMembership?.role) {
                    const formattedRole = assigneeMembership.role === 'mst' ? 'MST' : assigneeMembership.role
                        .split('_')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    setAssigneeRole(formattedRole);
                } else {
                    setAssigneeRole('MST');
                }
            }

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
        } else if (propMember?.role === 'mst' || propMember?.role === 'staff') {
            const role = propMember.role === 'mst' ? 'mst' : 'staff';
            setUserRole(role);
            // Fetch skills for specialized permissions
            const { data: skills } = await supabase
                .from('mst_skills')
                .select('skill_code')
                .eq('user_id', uid);
            if (skills) {
                setUserSkills(skills.map(s => s.skill_code));
            }
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
            .select('*, user:user_id(full_name)')
            .eq('property_id', propId)
            .eq('is_available', true);

        if (data) {
            const unique = [];
            const seen = new Set();
            for (const r of data) {
                if (!seen.has(r.user_id)) {
                    seen.add(r.user_id);
                    unique.push(r);
                }
            }
            setResolvers(unique);
        } else {
            setResolvers([]);
        }
    };

    // Actions
    const handleStatusChange = async (newStatus: string) => {
        if (!ticket) return;

        // MST Close Validation - Photos are now optional per user request
        /*
        if (newStatus === 'closed' && userRole === 'staff') {
            if (!ticket.photo_before_url || !ticket.photo_after_url) {
                const proceed = window.confirm('⚠️ You haven’t attached before/after photos. Do you want to proceed?');
                if (!proceed) return;
            }
        }
        */

        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update status');
            }

            // Refresh ticket data
            fetchTicketDetails(userId, true);
            showToast(`Ticket ${newStatus.replace('_', ' ')}`, 'success');
        } catch (err: any) {
            console.error('Status Change Error:', err);
            showToast(err.message || 'Failed to update status', 'error');
        }
    };

    const handleClaim = async () => {
        if (!userId || !ticket) return;

        // ✅ Check 1: Ticket is assignable (WAITLIST/OPEN)
        if (ticket.status !== 'waitlist' && ticket.status !== 'open') {
            showToast('This request is not available for self-assignment.', 'error');
            return;
        }

        // ✅ Check 2: Ticket is NOT vendor-manual
        // skill_group is joined in the fetch, so we check the flag if available,
        // but typically we need to query the skill_group definition to see 'is_manual_assign'.
        // Let's do a quick robust check.
        if (ticket.skill_group) {
            const { data: sgData } = await supabase
                .from('skill_groups')
                .select('is_manual_assign')
                .eq('code', ticket.skill_group.code)
                .eq('property_id', ticket.property_id)
                .single();

            if (sgData?.is_manual_assign) {
                showToast('This request requires manual / vendor coordination.', 'error');
                return;
            }
        }

        // ✅ Check 3: User has matching skill
        // We look for a row in resolver_stats for this user + this property + this skill
        // We need the ID of the skill group.
        // The ticket object has `skill_group` { name, code }, but we need the ID or check via code.
        // It's safer to fetch the ticket's skill_group_id directly or use the one we fetched.

        // Let's re-fetch the raw ticket to get ID if needed, or rely on join
        // Actually, let's query resolver_stats joining skill_groups
        const { data: userStats } = await supabase
            .from('resolver_stats')
            .select('id')
            .eq('user_id', userId)
            .eq('property_id', ticket.property_id)
            .eq('is_available', true)
            .eq('skill_group_id', (ticket as any).skill_group_id || (ticket as any).skill_group?.id); // fallback

        // If we don't have the ID handy on the frontend object correctly, we might need to find it by code.
        // However, looking at the strict requirement:
        // resolver_stats.skill_group_id == ticket.skill_group_id

        // Let's ensure we have ticket.skill_group_id available.
        // The fetchTicketDetails uses `*, skill_group:skill_groups(...)`. 
        // Supabase returns the foreign key column `skill_group_id` as well on the base object typically.


        if (!userStats || userStats.length === 0) {
            // To be absolutely sure, let's try one more check by code if ID failed (resilience)
            if (ticket.skill_group?.code) {
                const { data: statsByCode } = await supabase
                    .from('resolver_stats')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('property_id', ticket.property_id)
                    .eq('skill_group.code', ticket.skill_group.code) // simplified check
                    .maybeSingle(); // this join syntax might depend on setup

                // If standard check fails:
                // We do: resolver_stats -> skill_group_id
                // We need to match ticket.skill_group_id

                // Let's stick to the strict check requested by user:
                // "User must have at least one row in resolver_stats where..."

                // If we didn't find it above, we fail.
                showToast('You are not assigned to this skill category.', 'error');
                return;
            }
            showToast('You are not assigned to this skill category.', 'error');
            return;
        }

        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: userId }) // API handles status change to 'assigned'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to claim request');
            }

            showToast('Request Claimed', 'success');
            fetchTicketDetails(userId, true);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to claim request', 'error');
        }
    };

    const handleReassign = async () => {
        if (!selectedResolver) return;
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: selectedResolver })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reassign');
            }

            showToast('Ticket Reassigned', 'success');
            setShowAssignModal(false);
            fetchTicketDetails(userId, true);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to reassign', 'error');
        }
    };

    const handleEditSubmit = async () => {
        if (!editTitle.trim()) return;
        setIsUpdatingContent(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle.trim(),
                    description: editDescription.trim()
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update request');
            }

            showToast('Request Updated', 'success');
            setIsEditing(false);
            fetchTicketDetails(userId, true);
        } catch (err: any) {
            console.error(err);
            showToast(err instanceof Error ? err.message : 'Failed to update request', 'error');
        } finally {
            setIsUpdatingContent(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];

        setUploading(true);
        try {
            // COMPRESSION STEP: Max 1280px, WebP, < 500KB
            const compressedFile = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 });

            const fileName = `${ticketId}/${type}_${Date.now()}.webp`;
            const { error: uploadError } = await supabase.storage
                .from('ticket_photos')
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('ticket_photos')
                .getPublicUrl(fileName);

            const updateField = type === 'before' ? 'photo_before_url' : 'photo_after_url';
            const { error: dbError } = await supabase
                .from('tickets')
                .update({ [updateField]: publicUrl })
                .eq('id', ticketId);

            if (dbError) {
                console.error('DB Update Error:', dbError);
                throw dbError;
            }

            // Log Activity
            await logActivity('photo_upload', null, `Uploaded ${type} photo`);

            // Update local state
            setTicket(prev => prev ? { ...prev, [updateField]: publicUrl } : null);

            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} photo uploaded`, 'success');
        } catch (err: any) {
            console.error('Photo Upload Process Error:', err);
            showToast(err.message || 'Failed to upload photo', 'error');
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
                    comment: commentText,
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
            fetchTicketDetails(userId, true);
        } catch (err) {
            showToast('Failed to update SLA', 'error');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this request? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete request');
            }

            showToast('Request Deleted Successfully', 'success');
            setTimeout(() => {
                router.push(from || `/property/${ticket?.property_id}/${userRole === 'admin' ? 'dashboard' : userRole === 'mst' ? 'mst' : userRole === 'staff' ? 'staff' : 'tenant'}?tab=requests`);
            }, 1000);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to delete request', 'error');
            setIsDeleting(false);
        }
    };

    const handleBack = () => {
        const via = searchParams.get('via');
        const hasHistory = typeof window !== 'undefined' && window.history.length > 1;

        if (from) {
            window.history.back();
        } else if (via === 'notification' || !hasHistory) {
            // Smart redirect based on role and property context
            const pId = ticket?.property_id;
            if (!pId) {
                router.push('/');
                return;
            }

            if (userRole === 'admin') {
                router.push(`/property/${pId}/dashboard?tab=requests`);
            } else if (userRole === 'mst') {
                router.push(`/property/${pId}/mst?tab=requests`);
            } else if (userRole === 'staff') {
                router.push(`/property/${pId}/staff?tab=requests`);
            } else {
                router.push(`/property/${pId}/tenant?tab=requests`);
            }
        } else {
            router.back();
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
    if (!ticket) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Ticket not found</div>;

    const isAssignedToMe = userId === ticket.assigned_to;
    const isOwner = userId === ticket.raised_by;
    const canManage = userRole === 'admin';
    const canWork = (userRole === 'staff' || userRole === 'mst') && isAssignedToMe;
    const isSpecializedStaff = userRole === 'staff' && (userSkills.includes('soft_service') || userSkills.includes('technical') || userSkills.includes('bms'));
    const canEditContent = isOwner || canManage;
    const canDelete = (isOwner && (userRole === 'mst' || userRole === 'staff')) || canManage;
    const canManagePhotos = canManage || userRole === 'mst' || isSpecializedStaff || (userRole === 'staff' && isAssignedToMe) || (userRole === 'tenant' && isOwner);
    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#0f1419] text-white' : 'bg-white text-slate-900'} font-inter pb-12 transition-colors duration-300`}>
            {/* Toast Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-2xl z-50 font-bold text-sm text-white ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} border-b sticky top-0 z-30 shadow-xl backdrop-blur-md bg-opacity-80`}>
                <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={handleBack} className={`p-2 -ml-2 ${isDark ? 'hover:bg-[#21262d] text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'} rounded-lg transition-all`}>
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                {(ticket as any).property?.name && (
                                    <span className={`text-[10px] font-black ${isDark ? 'text-primary bg-primary/10 border-primary/20' : 'text-primary bg-primary/10 border-primary-light/20'} px-2 py-0.5 rounded border uppercase tracking-widest`}>
                                        {(ticket as any).property.name}
                                    </span>
                                )}
                                <span className={`font-mono text-[10px] font-black ${isDark ? 'text-slate-500 bg-[#21262d] border-[#30363d]' : 'text-slate-500 bg-slate-100 border-slate-200'} px-2 py-0.5 rounded border`}>{ticket.ticket_number}</span>
                                {((ticket as any).category && typeof (ticket as any).category === 'string') ? (
                                    <span className={`px-2 py-0.5 ${isDark ? 'bg-info/10 border-info/20 text-info' : 'bg-info/10 border-info/20 text-info'} border rounded text-[9px] font-black uppercase tracking-widest`}>
                                        {((ticket as any).category as string).replace(/_/g, ' ')}
                                    </span>
                                ) : ticket.category?.name && (
                                    <span className={`px-2 py-0.5 ${isDark ? 'bg-info/10 border-info/20 text-info' : 'bg-info/10 border-info/20 text-info'} border rounded text-[9px] font-black uppercase tracking-widest`}>
                                        {ticket.category.name}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${ticket.priority === 'urgent' ? (isDark ? 'bg-error/10 border-error/20 text-error' : 'bg-error/5 border-error/20 text-error') :
                                    ticket.priority === 'high' ? (isDark ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-warning/5 border-warning/20 text-warning') :
                                        (isDark ? 'bg-info/10 border-info/20 text-info' : 'bg-info/5 border-info/20 text-info')
                                    }`}>
                                    {ticket.priority} Priority
                                </span>

                                {(ticket as any).classification_source === 'llm' && (
                                    <span className={`flex items-center gap-1 px-2 py-0.5 ${isDark ? 'bg-primary/20 border-primary/30 text-primary-light' : 'bg-primary/10 border-primary/20 text-primary'} border rounded text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse`}>
                                        <Sparkles className="w-2.5 h-2.5" />
                                        AI-Assisted
                                    </span>
                                )}

                                {(ticket as any).secondary_category_code && (
                                    <span className={`px-2 py-0.5 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border rounded text-[9px] font-black uppercase tracking-widest`}>
                                        + {(ticket as any).secondary_category_code.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>

                            {(ticket as any).risk_flag && (
                                <div className={`mt-2 flex items-center gap-2 px-3 py-2 ${isDark ? 'bg-error/20 border-error/30 text-error' : 'bg-error/5 border-error/20 text-error'} border rounded-xl text-xs font-bold animate-bounce-slow`}>
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="uppercase tracking-wide">Critical Risk Detected: {(ticket as any).risk_flag}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight ${(ticket as any).risk_flag ? 'mt-3' : ''}`}>{ticket.title}</h1>
                                {canEditContent && (
                                    <button
                                        onClick={() => {
                                            setEditTitle(ticket.title);
                                            setEditDescription(ticket.description);
                                            setIsEditing(true);
                                        }}
                                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-[#21262d] text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                        title="Edit Request"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-[#21262d] text-rose-500/50 hover:text-rose-500' : 'hover:bg-rose-50 text-rose-400 hover:text-rose-600'}`}
                                        title="Delete Request"
                                    >
                                        {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {(ticket as any).llm_reasoning && (
                                <p className={`mt-2 text-[11px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'} italic flex items-start gap-2`}>
                                    <Brain className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                                    "{(ticket as any).llm_reasoning}"
                                </p>
                            )}
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 px-3 py-1 rounded-full border inline-block ${ticket.status === 'closed' || ticket.status === 'resolved' ? (isDark ? 'bg-success/10 border-success/20 text-success' : 'bg-success/5 border-success/20 text-success') :
                                ticket.status === 'in_progress' ? (isDark ? 'bg-info/10 border-info/20 text-info' : 'bg-info/5 border-info/20 text-info') :
                                    ticket.status === 'assigned' ? (isDark ? 'bg-primary/10 border-primary/20 text-primary-light' : 'bg-primary/5 border-primary/20 text-primary') :
                                        (isDark ? 'bg-[#21262d] border-[#30363d] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                                }`}>
                                {ticket.status === 'closed' || ticket.status === 'resolved' ? 'COMPLETE' : ticket.status.replace('_', ' ')}
                            </div>
                            {ticket.sla_deadline && ticket.status !== 'closed' && (
                                <div className={`flex items-center justify-end gap-1 text-xs font-bold ${ticket.sla_breached ? 'text-error' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                    {ticket.sla_paused ? (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg w-fit animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">SLA Paused</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Clock className="w-3 h-3" />
                                            {ticket.sla_breached ? 'Breached' :
                                                `Due ${new Date(ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {/* MST Actions */}
                        {/* Claim button: Only show if NOT assigned to anyone */}
                        {userRole === 'staff' && (ticket.status === 'open' || ticket.status === 'waitlist') && !ticket.assigned_to && (
                            <button
                                onClick={() => handleClaim()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                            >
                                <User className="w-4 h-4" /> Claim Request
                            </button>
                        )}
                        {/* Start Work button: Show if assigned to me and awaiting start */}
                        {isAssignedToMe && ['assigned', 'open', 'waitlist'].includes(ticket.status) && (
                            <button
                                onClick={() => handleStatusChange('in_progress')}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                            >
                                <PlayCircle className="w-4 h-4" /> Start Work
                            </button>
                        )}
                        {/* Complete Task button: ONLY show if work is IN PROGRESS */}
                        {isAssignedToMe && ticket.status === 'in_progress' && (
                            <button
                                onClick={() => handleStatusChange('closed')}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Complete Task
                            </button>
                        )}

                        {/* Admin Actions */}
                        {canManage && (
                            <>
                                <button
                                    onClick={() => handleSLAAction(!ticket.sla_paused)}
                                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-[#21262d] border-[#30363d] text-slate-300 hover:bg-[#30363d]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'} border rounded-xl text-xs font-black uppercase tracking-widest transition-all`}
                                >
                                    {ticket.sla_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                    {ticket.sla_paused ? 'Resume SLA' : 'Pause SLA'}
                                </button>
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-[#21262d] border-[#30363d] text-slate-300 hover:bg-[#30363d]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'} border rounded-xl text-xs font-black uppercase tracking-widest transition-all`}
                                >
                                    <User className="w-4 h-4" /> Reassign
                                </button>
                                {ticket.status !== 'closed' && (
                                    <button
                                        onClick={() => handleStatusChange('closed')}
                                        className="flex items-center gap-2 px-4 py-2 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-black uppercase tracking-widest hover:bg-error/20 transition-all"
                                    >
                                        <XCircle className="w-4 h-4" /> Force Close
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push(`/property/${ticket.property_id}/flow-map`)}
                                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' : 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/10'} border rounded-xl text-xs font-black uppercase tracking-widest transition-all`}
                                >
                                    <Activity className="w-4 h-4" /> Flow Map
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Context & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Request Description */}
                        <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm`}>
                            <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4 flex items-center gap-2`}>
                                <Paperclip className="w-4 h-4 text-primary" />
                                Description
                            </h3>
                            <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-sm leading-relaxed whitespace-pre-wrap`}>
                                {ticket.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* 1. Context Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Requestor Card */}
                            <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} p-5 rounded-2xl border shadow-sm relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-info/5 rounded-full -mr-12 -mt-12 group-hover:bg-info/10 transition-all" />
                                <h3 className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10`}>
                                    <User className="w-3 h-3" /> Who Raised
                                </h3>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                        {ticket.creator?.full_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm leading-tight`}>{ticket.creator?.full_name || 'Unknown User'}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`px-1.5 py-0.5 ${isDark ? 'bg-info/10 text-info' : 'bg-info/5 text-info'} text-[9px] font-black uppercase tracking-wider rounded`}>
                                                {creatorRole}
                                            </span>
                                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-medium whitespace-nowrap`}>Raised {new Date(ticket.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#30363d]' : 'border-slate-50'} relative z-10`}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[9px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>Floor</span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {ticket.floor_number === 0 ? 'Ground Floor' :
                                                    ticket.floor_number === -1 ? 'Basement' :
                                                        ticket.floor_number ? `Level ${ticket.floor_number}` : '-'}
                                            </span>
                                        </div>
                                        <div className={`w-px h-6 ${isDark ? 'bg-[#30363d]' : 'bg-slate-100'}`} />
                                        <div className="flex flex-col">
                                            <span className={`text-[9px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>Location</span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{ticket.location || 'General Area'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resolver Card */}
                            <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} p-5 rounded-2xl border shadow-sm relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-all" />
                                <h3 className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10`}>
                                    <ShieldAlert className="w-3 h-3" /> Who Is Servicing
                                </h3>
                                {ticket.assignee ? (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                            {ticket.assignee.full_name[0]}
                                        </div>
                                        <div>
                                            <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm leading-tight`}>{ticket.assignee.full_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 ${isDark ? 'bg-primary/10 text-primary-light' : 'bg-primary/5 text-primary'} text-[9px] font-black uppercase tracking-wider rounded`}>
                                                    {assigneeRole}
                                                </span>
                                                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-medium uppercase tracking-tighter`}>Assigned {new Date(ticket.assigned_at!).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex items-center justify-center h-16 ${isDark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200'} rounded-xl border border-dashed relative z-10`}>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Awaiting Assignment</p>
                                    </div>
                                )}
                                {ticket.assignee && (
                                    <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#30363d]' : 'border-slate-50'} relative z-10`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>Resolver ID</span>
                                            <span className={`text-[10px] font-bold ${isDark ? 'text-primary bg-primary/10 border-primary/20' : 'text-primary bg-primary/10 border-primary-light'}`}>RSLV-{ticket.assigned_to?.slice(0, 4).toUpperCase()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Before / After Photos */}
                        <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm`}>
                            <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-6 flex items-center gap-2`}>
                                <Camera className="w-4 h-4 text-primary" />
                                Site Documentation
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-4">
                                {/* Before Photo */}
                                <div className="space-y-3">
                                    <div className={`text-[10px] sm:text-xs font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest flex items-center justify-between gap-4 flex-wrap`}>
                                        <span className="whitespace-nowrap">Before Work</span>
                                        {ticket.photo_before_url && canManagePhotos && (
                                            <span className="text-[9px] sm:text-[10px] text-primary/60 italic font-medium whitespace-nowrap">Click to change</span>
                                        )}
                                    </div>
                                    {ticket.photo_before_url ? (
                                        <div className={`relative aspect-video rounded-xl overflow-hidden ${isDark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-100'} border group`}>
                                            <img src={ticket.photo_before_url} alt="Before" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-2">
                                                <a href={ticket.photo_before_url} target="_blank" rel="noreferrer" className={`text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 ${isDark ? 'bg-[#161b22]' : 'bg-white/10 backdrop-blur-md'} rounded-lg hover:bg-primary transition-colors`}>
                                                    View Full
                                                </a>
                                                {canManagePhotos && (
                                                    <label className={`text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 ${isDark ? 'bg-[#21262d]' : 'bg-white/20 backdrop-blur-md'} rounded-lg cursor-pointer hover:bg-primary transition-colors flex items-center gap-2`}>
                                                        <Camera className="w-3 h-3" />
                                                        Change Photo
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'before')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <label className={`flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed ${isDark ? 'border-[#30363d] bg-[#0d1117] hover:bg-[#161b22]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} cursor-pointer transition-all group`}>
                                            <Camera className={`w-8 h-8 ${isDark ? 'text-slate-700' : 'text-slate-300'} group-hover:text-primary mb-2`} />
                                            <span className={`text-[10px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-widest`}>Add Attachment</span>
                                            <input type="file" accept="image/*" className="hidden" disabled={!canManagePhotos} onChange={(e) => handleFileUpload(e, 'before')} />
                                        </label>
                                    )}
                                </div>

                                {/* After Photo */}
                                <div className="space-y-3">
                                    <div className={`text-[10px] sm:text-xs font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest flex items-center justify-between gap-4 flex-wrap`}>
                                        <span className="whitespace-nowrap">After Work</span>
                                        {ticket.photo_after_url && canManagePhotos && (
                                            <span className="text-[9px] sm:text-[10px] text-emerald-500/60 italic font-medium whitespace-nowrap">Click to change</span>
                                        )}
                                    </div>
                                    {ticket.photo_after_url ? (
                                        <div className={`relative aspect-video rounded-xl overflow-hidden ${isDark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-100'} border group`}>
                                            <img src={ticket.photo_after_url} alt="After" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-2">
                                                <a href={ticket.photo_after_url} target="_blank" rel="noreferrer" className={`text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 ${isDark ? 'bg-[#161b22]' : 'bg-white/10 backdrop-blur-md'} rounded-lg hover:bg-emerald-500 transition-colors`}>
                                                    View Full
                                                </a>
                                                {canManagePhotos && (
                                                    <label className={`text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 ${isDark ? 'bg-[#21262d]' : 'bg-white/20 backdrop-blur-md'} rounded-lg cursor-pointer hover:bg-emerald-500 transition-colors flex items-center gap-2`}>
                                                        <Camera className="w-3 h-3" />
                                                        Change Photo
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'after')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <label className={`flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed ${isDark ? 'border-[#30363d] bg-[#0d1117] hover:bg-[#161b22]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} cursor-pointer transition-all group`}>
                                            <Camera className={`w-8 h-8 ${isDark ? 'text-slate-700' : 'text-slate-300'} group-hover:text-emerald-500 mb-2`} />
                                            <span className={`text-[10px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-widest`}>Add Attachment</span>
                                            <input type="file" accept="image/*" className="hidden" disabled={!canManagePhotos} onChange={(e) => handleFileUpload(e, 'after')} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Activity Timeline (Progress) */}
                        <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm`}>
                            <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-8 flex items-center gap-2`}>
                                <History className="w-4 h-4 text-primary" />
                                Sequence of Events
                            </h3>
                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-slate-500/20 before:to-transparent">
                                {/* 1. Ticket Created */}
                                <div className="relative pl-12">
                                    <div className={`absolute left-0 top-0 mt-0.5 z-10 w-8 h-8 rounded-full bg-success flex items-center justify-center text-white ring-4 ${isDark ? 'ring-[#161b22]' : 'ring-white'} shadow-success/20 shadow-lg`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{new Date(ticket.created_at).toLocaleString()}</p>
                                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ticket Created</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>System generated unique ID: {ticket.ticket_number}</p>
                                </div>

                                {/* 2. Assigned */}
                                <div className="relative pl-12">
                                    <div className={`absolute left-0 top-0 mt-0.5 z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ${isDark ? 'ring-[#161b22]' : 'ring-white'} shadow-lg ${ticket.assigned_at ? 'bg-success text-white shadow-success/20' : (isDark ? 'bg-[#21262d] text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                                        {ticket.assigned_at ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{ticket.assigned_at ? new Date(ticket.assigned_at).toLocaleString() : 'PENDING'}</p>
                                    <p className={`text-sm font-bold ${ticket.assigned_at ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-700' : 'text-slate-300')}`}>Assigned</p>
                                    {ticket.assignee && (
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Assigned to {ticket.assignee.full_name}</p>
                                    )}
                                </div>

                                {/* 3. Work Started */}
                                <div className="relative pl-12">
                                    <div className={`absolute left-0 top-0 mt-0.5 z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ${isDark ? 'ring-[#161b22]' : 'ring-white'} shadow-lg ${ticket.work_started_at ? 'bg-success text-white shadow-success/20' : (isDark ? 'bg-[#21262d] text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                                        {ticket.work_started_at ? <CheckCircle2 className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{ticket.work_started_at ? new Date(ticket.work_started_at).toLocaleString() : 'AWAITING START'}</p>
                                    <p className={`text-sm font-bold ${ticket.work_started_at ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-700' : 'text-slate-300')}`}>In Progress</p>
                                    {ticket.work_started_at && (
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Resolver is currently working on the issue</p>
                                    )}
                                </div>

                                {/* 4. Resolved */}
                                <div className="relative pl-12">
                                    <div className={`absolute left-0 top-0 mt-0.5 z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ${isDark ? 'ring-[#161b22]' : 'ring-white'} shadow-lg ${(ticket.resolved_at || ticket.status === 'closed' || ticket.status === 'resolved') ? 'bg-success text-white shadow-success/20' : (isDark ? 'bg-[#21262d] text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                                        {(ticket.resolved_at || ticket.status === 'closed' || ticket.status === 'resolved') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{(ticket.resolved_at || ticket.status === 'closed' || ticket.status === 'resolved') ? new Date(ticket.resolved_at || ticket.created_at).toLocaleString() : 'RESOLUTION TARGET'}</p>
                                    <p className={`text-sm font-bold ${(ticket.resolved_at || ticket.status === 'closed' || ticket.status === 'resolved') ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-700' : 'text-slate-300')}`}>Completed</p>
                                </div>
                            </div>

                            <div className={`mt-8 pt-6 border-t ${isDark ? 'border-[#21262d]' : 'border-slate-50'}`}>
                                <h4 className={`text-[10px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-widest mb-4 italic`}>Internal Trace Log</h4>
                                <div className="space-y-4">
                                    {activities.slice(0, 5).map((act) => (
                                        <div key={act.id} className="flex justify-between items-start gap-4 opacity-75">
                                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{act.user?.full_name || 'System'}:</span> {act.action.replace(/_/g, ' ')}
                                                    {act.new_value && <span className="text-success font-bold ml-1">→ {act.new_value}</span>}
                                                </p>
                                            </div>
                                            <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'} font-bold uppercase whitespace-nowrap`}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Comments & Chat */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} border rounded-3xl shadow-xl flex flex-col h-[600px] sticky top-24`}>
                            <div className={`p-4 border-b ${isDark ? 'border-[#21262d]' : 'border-slate-50'}`}>
                                <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Communication</h3>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-tighter`}>Encrypted Thread</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {comments.length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <p className="text-xs font-bold text-slate-400">No signals found</p>
                                    </div>
                                )}
                                {comments.map(comment => {
                                    if (comment.is_internal && userRole === 'tenant') return null;
                                    const isMe = comment.user_id === userId;
                                    return (
                                        <div key={comment.id} className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`relative max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${isMe ?
                                                `bg-primary text-white rounded-tr-none` :
                                                comment.is_internal ?
                                                    (isDark ? 'bg-warning/10 text-warning border border-warning/20 rounded-tl-none' : 'bg-warning/5 text-warning-dark border border-warning/10 rounded-tl-none') :
                                                    (isDark ? 'bg-[#21262d] text-slate-200 rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tl-none')
                                                }`}>
                                                <div className={`text-[8px] font-black uppercase tracking-widest ${isMe ? 'text-primary-light' : (isDark ? 'text-warning' : 'text-warning-dark')} mb-1 flex items-center gap-1`}>
                                                    {comment.is_internal && <ShieldAlert className="w-2.5 h-2.5" />}
                                                    {comment.user?.full_name || 'System'} • {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {comment.is_internal && <span className="ml-1 opacity-60">(Internal)</span>}
                                                </div>
                                                <p className="leading-relaxed font-medium">{comment.comment}</p>
                                            </div>
                                            <div className={`flex items-center gap-2 mt-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span className={`text-[9px] font-bold tracking-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {isMe ? 'You' : comment.user?.full_name}
                                                </span>
                                                <span className={`text-[9px] font-medium ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
                                                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className={`p-4 ${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100'} border-t rounded-b-3xl`}>
                                {canManage && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isInternalComment}
                                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                                className={`rounded ${isDark ? 'border-[#30363d] bg-[#161b22]' : 'border-slate-300 bg-white'} text-primary focus:ring-primary`}
                                            />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isInternalComment ? 'text-warning' : (isDark ? 'text-slate-500' : 'text-slate-400')} group-hover:text-primary transition-colors`}>
                                                Internal Note
                                            </span>
                                        </label>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                        placeholder="Transmit signal to thread..."
                                        className={`flex-1 ${isDark ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-all`}
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!commentText.trim()}
                                        className={`p-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20`}
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* MODALS */}
                <AnimatePresence>
                    {showAssignModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAssignModal(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`${isDark ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-[2.5rem] w-full max-w-md p-8 relative z-10 shadow-2xl`}
                            >
                                <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} italic mb-2`}>Reassign Force</h2>
                                <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-sm mb-8 italic`}>Redirect signal to another available technician.</p>

                                <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {resolvers.map((r: any) => (
                                        <div
                                            key={r.id}
                                            onClick={() => setSelectedResolver(r.user_id)}
                                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedResolver === r.user_id ? 'bg-primary/10 border-primary text-white' : (isDark ? 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold">{r.user?.full_name || 'Unknown Technician'}</span>
                                                {selectedResolver === r.user_id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                            </div>
                                        </div>
                                    ))}
                                    {resolvers.length === 0 && <p className={`text-center py-4 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'} italic`}>No available technicians detected in vicinity.</p>}
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setShowAssignModal(false)} className={`flex-1 py-4 ${isDark ? 'bg-[#21262d] text-slate-400' : 'bg-slate-100 text-slate-500'} rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all`}>Abort</button>
                                    <button
                                        onClick={handleReassign}
                                        disabled={!selectedResolver}
                                        className={`flex-1 py-4 ${isDark ? 'bg-white text-black hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl`}
                                    >
                                        Execute Transfer
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {isEditing && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEditing(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`${isDark ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-[2.5rem] w-full max-w-lg p-8 relative z-10 shadow-2xl overflow-hidden`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} italic`}>Edit Request</h2>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-[#21262d] text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-sm mb-8 italic`}>Modify the transmission data for this ticket.</p>

                                <div className="space-y-6 mb-8">
                                    <div>
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-2 block`}>Mission Title</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="Mission name..."
                                            className={`w-full ${isDark ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} px-4 py-4 rounded-2xl border-2 focus:border-primary focus:outline-none transition-all font-bold`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-2 block`}>Detailed Intelligence</label>
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Intelligence briefing..."
                                            rows={5}
                                            className={`w-full ${isDark ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} px-4 py-4 rounded-2xl border-2 focus:border-primary focus:outline-none transition-all font-medium resize-none`}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setIsEditing(false)} className={`flex-1 py-4 ${isDark ? 'bg-[#21262d] text-slate-400' : 'bg-slate-100 text-slate-500'} rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all`}>Cancel</button>
                                    <button
                                        onClick={handleEditSubmit}
                                        disabled={isUpdatingContent || !editTitle.trim()}
                                        className={`flex-1 py-4 ${isDark ? 'bg-white text-black hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl flex items-center justify-center gap-2`}
                                    >
                                        {isUpdatingContent ? (
                                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        {isUpdatingContent ? 'Updating...' : 'Save Intel'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
