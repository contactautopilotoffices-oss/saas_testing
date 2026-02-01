'use client';

import { useState, useEffect } from 'react';
import { Plus, Paperclip, Send, Clock, Star, User, ChevronRight, X, MessageSquare, Loader2, CheckCircle, Camera, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/frontend/utils/image-compression';
import { useTheme } from '@/frontend/context/ThemeContext';
import { playTickleSound } from '@/frontend/utils/sounds';

interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    assigned_at: string | null;
    sla_deadline: string | null;
    sla_paused: boolean;
    total_paused_minutes: number;
    category?: { name: string; code: string };
    assignee?: { full_name: string };
    rating?: number;
    photo_before_url?: string;
    photo_after_url?: string;
}

interface Classification {
    category: string | null;
    confidence: number;
    isVague: boolean;
}

interface TenantTicketingDashboardProps {
    propertyId: string;
    organizationId: string;
    user: { id: string; full_name: string };
    propertyName?: string;
    isStaff?: boolean;
}

export default function TenantTicketingDashboard({
    propertyId,
    organizationId,
    user,
    propertyName,
    isStaff = false
}: TenantTicketingDashboardProps) {
    const router = useRouter();
    const { theme } = useTheme();
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classification, setClassification] = useState<Classification | null>(null);
    const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
    const [resolvedTickets, setResolvedTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [ratingTicket, setRatingTicket] = useState<Ticket | null>(null);
    const [selectedRating, setSelectedRating] = useState(0);
    const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

    useEffect(() => {
        fetchTickets();
    }, [propertyId, user.id]);

    const fetchTickets = async () => {
        try {
            // If staff/MST, view assigned tickets. If tenant, view raised tickets.
            const queryParam = isStaff ? `assignedTo=${user.id}` : `raisedBy=${user.id}`;
            const response = await fetch(`/api/tickets?propertyId=${propertyId}&${queryParam}`);
            const data = await response.json();

            if (response.ok) {
                const tickets = data.tickets || [];
                setActiveTickets(tickets.filter((t: Ticket) => !['resolved', 'closed'].includes(t.status)));
                setResolvedTickets(tickets.filter((t: Ticket) => ['resolved', 'closed'].includes(t.status)));
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedFile = await compressImage(file, { maxWidth: 1280, maxHeight: 1280 });
                setPhotoFile(compressedFile);

                // Create preview URL
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoPreview(reader.result as string);
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error('Compression failed:', error);
            }
        }
    };

    const handleSubmit = async () => {
        if (!description.trim()) return;

        setIsSubmitting(true);
        try {
            // Create ticket (classification happens server-side)
            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description,
                    propertyId,
                    organizationId,
                    isInternal: false,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Play tickle sound on success
                playTickleSound();

                // Show server classification result (not fake)
                setClassification(data.classification);
                setShowSuccess(true);

                // Upload photo if exists
                if (photoFile && data.ticket?.id) {
                    const formData = new FormData();
                    formData.append('file', photoFile);
                    formData.append('type', 'before');

                    await fetch(`/api/tickets/${data.ticket.id}/photos`, {
                        method: 'POST',
                        body: formData,
                    });
                }

                setDescription('');
                setPhotoFile(null);
                setPhotoPreview(null);
                fetchTickets();
                setTimeout(() => {
                    setShowSuccess(false);
                    setClassification(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Error submitting ticket:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRatingSubmit = async () => {
        if (!ratingTicket || selectedRating < 1) return;

        try {
            await fetch(`/api/tickets/${ratingTicket.id}/rating`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: selectedRating }),
            });

            fetchTickets();
            setRatingTicket(null);
            setSelectedRating(0);
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    };

    // Real SLA progress calculation
    const getSLAProgress = (ticket: Ticket) => {
        if (!ticket.assigned_at || !ticket.sla_deadline) return null;
        if (ticket.sla_paused) return { progress: 0, text: 'Paused', color: 'text-yellow-400' };

        const start = new Date(ticket.assigned_at).getTime();
        const end = new Date(ticket.sla_deadline).getTime();
        const now = Date.now();
        const pausedMs = (ticket.total_paused_minutes || 0) * 60000;

        const totalDuration = end - start;
        const elapsed = now - start - pausedMs;
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        const remaining = end - now;
        const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));

        if (remaining < 0) return { progress: 100, text: 'Breached', color: 'text-red-500' };
        if (hoursLeft < 2) return { progress, text: `${hoursLeft}h left`, color: 'text-red-400' };
        if (hoursLeft < 8) return { progress, text: `${hoursLeft}h left`, color: 'text-orange-400' };
        return { progress, text: `~${hoursLeft}h`, color: 'text-gray-400' };
    };

    const STATUS_COLORS: Record<string, string> = {
        open: 'text-orange-400',
        assigned: 'text-amber-500',
        in_progress: 'text-[#f28c33]',
        waitlist: 'text-slate-400',
    };

    const isDark = theme === 'dark';

    return (
        <div className="min-h-screen bg-background text-text-primary p-8 font-body transition-colors duration-300">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className={`text-4xl font-display font-semibold ${isDark ? 'text-white' : 'text-text-primary'} tracking-tight`}>
                            <span className="text-primary">{propertyName || 'Property'}</span>{' '}
                            {isStaff ? 'Maintenance Portal' : 'Request Manager'}
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-text-secondary'} mt-1 font-medium`}>Efficiently handle your facility needs</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-surface border-border px-6 py-3 rounded-2xl border">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                <User className={`w-5 h-5 ${isDark ? 'text-emerald-500' : 'text-primary'}`} />
                            </div>
                            <div>
                                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-text-primary'}`}>{user.full_name}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-text-tertiary'} font-bold uppercase tracking-widest`}>{isStaff ? 'MST Account' : 'Tenant Account'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Raise New Request */}
                    <div className="space-y-6">
                        <div className="bg-surface border-border shadow-2xl p-10 rounded-3xl border transition-all">
                            <h2 className="text-xs font-bold text-secondary mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                                <Plus className="w-4 h-4" />
                                Raise a New Request
                            </h2>

                            <div className="relative group">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the issue in your words.&#10;Example: Leaking tap in kitchenette"
                                    className="w-full h-40 bg-surface-elevated text-text-primary border-border border rounded-2xl p-6 placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                                />
                                {!isDark && <div className="absolute inset-0 rounded-2xl border border-primary/5 pointer-events-none group-focus-within:border-primary/20 transition-smooth"></div>}
                            </div>

                            {/* Photo Preview */}
                            {photoPreview && (
                                <div className="relative mt-4">
                                    <img src={photoPreview} alt="Preview" className={`w-full h-32 object-cover rounded-2xl border ${isDark ? 'border-[#30363d]' : 'border-border/10'}`} />
                                    <button
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                        className="absolute top-3 right-3 bg-rose-500 text-white rounded-full p-2 shadow-xl hover:scale-110 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-10">
                                <label className={`flex items-center gap-3 ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#21262d]' : 'text-text-secondary hover:text-primary hover:bg-primary/5'} cursor-pointer transition-all text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-transparent hover:border-primary/10`}>
                                    <Paperclip className="w-5 h-5" />
                                    <span>Attach File</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                                </label>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !description.trim()}
                                    className={`px-10 py-4 ${isDark ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-primary shadow-primary/20'} hover:opacity-90 disabled:bg-text-primary/10 disabled:text-text-tertiary disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all flex items-center gap-3 shadow-xl uppercase tracking-widest text-[11px]`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Submit Request
                                </button>
                            </div>
                        </div>

                        {/* Server Classification Result */}
                        <AnimatePresence>
                            {showSuccess && classification && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'premium-list border-success/30 bg-success/5'} p-8 border rounded-3xl`}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className={`${isDark ? 'text-emerald-400' : 'text-success'} font-bold uppercase tracking-widest text-[11px]`}>✓ Request Submitted Successfully</h3>
                                        <span className={`text-[10px] ${isDark ? 'bg-emerald-600' : 'bg-success'} text-white px-3 py-1 rounded-full font-bold tracking-tighter`}>SUCCESS</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className={`${isDark ? 'text-slate-400' : 'text-text-secondary'} font-medium text-sm`}>AI Classification:</span>
                                            <span className={`${isDark ? 'text-white' : 'text-text-primary'} font-display font-semibold capitalize`}>{(classification as any).categoryCode?.replace(/_/g, ' ') || 'General Request'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`${isDark ? 'text-slate-400' : 'text-text-secondary'} font-medium text-sm`}>System Priority:</span>
                                            <span className={`${isDark ? 'text-emerald-400' : 'text-primary'} font-bold uppercase tracking-widest text-[10px]`}>Processing</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Panel - My Tickets */}
                    <div className="space-y-8">
                        <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'glass-panel'} p-10 rounded-3xl border transition-all`}>
                            <div className="flex items-center justify-between mb-10 border-b pb-6">
                                <h2 className={`text-xs font-bold ${isDark ? 'text-slate-500 border-[#21262d]' : 'text-text-tertiary border-border/5'} uppercase tracking-[0.2em]`}>
                                    {isStaff ? 'Assigned Operations' : 'Recent Activity'}
                                </h2>

                                <div className={`flex items-center gap-2 ${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-slate-100'} border px-3 py-1.5 rounded-xl shadow-sm`}>
                                    <Filter className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-text-tertiary'}`} />
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value as any)}
                                        className={`bg-transparent text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-primary'} focus:outline-none cursor-pointer`}
                                    >
                                        <option value="all">All</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-text-primary/5 border-border/5'} rounded-3xl p-8 border animate-pulse`}>
                                            <div className="h-5 bg-text-primary/10 rounded-lg w-3/4 mb-4" />
                                            <div className="h-2.5 bg-text-primary/5 rounded-full w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : (() => {
                                const filteredTickets = filter === 'all'
                                    ? [...activeTickets, ...resolvedTickets]
                                    : filter === 'in_progress'
                                        ? activeTickets
                                        : resolvedTickets;

                                if (filteredTickets.length === 0) {
                                    return (
                                        <div className="text-center py-20 px-8">
                                            <div className={`w-20 h-20 ${isDark ? 'bg-[#0d1117]' : 'bg-text-primary/5'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                                                <MessageSquare className={`w-8 h-8 ${isDark ? 'text-slate-800' : 'text-text-tertiary/30'}`} />
                                            </div>
                                            <p className={`${isDark ? 'text-slate-600' : 'text-text-tertiary'} font-medium`}>
                                                {filter === 'completed' ? 'No completed requests found' : 'No active requests currently in progress'}
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredTickets
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((ticket) => {
                                                const isFinal = ['resolved', 'closed'].includes(ticket.status);
                                                const sla = getSLAProgress(ticket);
                                                return (
                                                    <div
                                                        key={ticket.id}
                                                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                                                        className={`group/ticket ${isDark ? 'bg-[#0d1117] border-[#21262d] hover:border-emerald-500/30' : 'premium-list border-border/5 hover:border-primary/20'} p-8 cursor-pointer transition-all rounded-2xl border hover:shadow-2xl ${isFinal ? 'opacity-80' : ''}`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start gap-6">
                                                                <div className={`w-14 h-14 ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'kpi-icon'} flex items-center justify-center flex-shrink-0 rounded-xl border`}>
                                                                    {isFinal ? (
                                                                        <CheckCircle className={`w-7 h-7 ${isDark ? 'text-emerald-500' : 'text-success'}`} />
                                                                    ) : (
                                                                        <MessageSquare className={`w-7 h-7 ${isDark ? 'text-emerald-500' : 'text-primary'}`} />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className={`font-display font-semibold ${isDark ? 'text-white group-hover/ticket:text-emerald-400' : 'text-text-primary group-hover/ticket:text-primary'} text-xl transition-all`}>{ticket.title}</p>
                                                                        {isFinal && <span className="text-[9px] bg-success/10 text-success px-2 py-0.5 rounded font-black uppercase tracking-tighter">Resolved</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500 bg-[#161b22]' : 'text-text-tertiary bg-text-primary/5'} uppercase tracking-widest px-2.5 py-1 rounded-md`}>
                                                                            {((ticket as any).category && typeof (ticket as any).category === 'string')
                                                                                ? (ticket as any).category.replace(/_/g, ' ')
                                                                                : (ticket.category?.name || 'General')}
                                                                        </span>
                                                                        {!isFinal && sla && <span className={`text-[10px] font-bold uppercase tracking-widest ${sla.color}`}>{sla.text}</span>}
                                                                        {isFinal && ticket.rating && (
                                                                            <div className="flex gap-0.5">
                                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                                    <Star key={s} className={`w-2.5 h-2.5 ${s <= ticket.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2">
                                                                <ChevronRight className={`w-6 h-6 ${isDark ? 'text-slate-800' : 'text-text-tertiary'} group-hover/ticket:text-primary group-hover/ticket:translate-x-1 transition-all`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })()}
                        </div>


                    </div>
                </div>
            </div>

            {/* Rating Modal */}
            <AnimatePresence>
                {ratingTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setRatingTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100'} border rounded-[2.5rem] p-8 max-w-sm w-full mx-4 shadow-2xl`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-2 uppercase tracking-tight`}>Rate Request</h3>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-8`}>{ratingTicket.title}</p>
                            <div className="flex justify-center gap-3 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-8 h-8 cursor-pointer transition-all hover:scale-120 ${star <= selectedRating ? (isDark ? 'text-emerald-500 fill-emerald-500' : 'text-yellow-400 fill-yellow-400') : (isDark ? 'text-[#21262d]' : 'text-slate-100')
                                            }`}
                                        onClick={() => setSelectedRating(star)}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setRatingTicket(null)}
                                    className={`flex-1 py-3 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} font-bold uppercase tracking-widest text-xs transition-colors`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRatingSubmit}
                                    disabled={selectedRating < 1}
                                    className={`flex-1 py-4 ${isDark ? 'bg-emerald-600 shadow-emerald-900/40 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-black'} text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg disabled:opacity-30`}
                                >
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
