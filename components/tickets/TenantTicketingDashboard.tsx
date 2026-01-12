'use client';

import { useState, useEffect } from 'react';
import { Plus, Paperclip, Send, Clock, Star, User, ChevronRight, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
                setResolvedTickets(tickets.filter((t: Ticket) => ['resolved', 'closed'].includes(t.status)).slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        setPhotoFile(new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }));
                        setPhotoPreview(canvas.toDataURL('image/webp', 0.8));
                    }
                }, 'image/webp', 0.8); // WebP: ~30% smaller than JPEG
            };
            img.src = URL.createObjectURL(file);
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

    return (
        <div className="min-h-screen bg-[#0f1419] p-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white">
                            <span className="text-emerald-500">{propertyName || 'Property'}</span>{' '}
                            {isStaff ? 'Maintenance Portal' : 'Request Management'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-[#161b22] border border-[#21262d] rounded-full px-5 py-2 shadow-xl">
                            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold">{user.full_name}</p>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{isStaff ? 'MST Account' : 'Tenant Account'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel - Raise New Request */}
                    <div className="space-y-4">
                        <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-sm font-black text-emerald-500 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                <Plus className="w-4 h-4" />
                                Raise a New Request
                            </h2>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the issue in your words.&#10;Example: Leaking tap in kitchenette"
                                className="w-full h-32 bg-[#0d1117] border border-[#21262d] rounded-2xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                            />

                            {/* Photo Preview */}
                            {photoPreview && (
                                <div className="relative mt-3">
                                    <img src={photoPreview} alt="Preview" className="w-full h-24 object-cover rounded-xl" />
                                    <button
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                        className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-6">
                                <label className="flex items-center gap-2 text-slate-400 hover:text-emerald-500 cursor-pointer transition-colors text-sm font-bold uppercase tracking-widest">
                                    <Paperclip className="w-5 h-5" />
                                    <span>Attach File</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                                </label>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !description.trim()}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#21262d] disabled:text-slate-600 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-900/10 uppercase tracking-widest text-xs"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Submit Request
                                </button>
                            </div>
                        </div>

                        {/* Server Classification Result (not fake) */}
                        <AnimatePresence>
                            {showSuccess && classification && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-sm"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-emerald-400 font-black uppercase tracking-widest text-sm">✓ Request Submitted</h3>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black tracking-tighter">SUCCESS</span>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground font-medium">Category:</span>
                                            <span className="text-foreground font-bold">{classification.category?.replace(/_/g, ' ') || 'General Request'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground font-medium">Status:</span>
                                            <span className="text-emerald-500 font-black uppercase tracking-widest text-xs">Ticket Created</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Panel - My Tickets */}
                    <div className="space-y-6">
                        <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-sm font-black text-muted-foreground mb-6 uppercase tracking-widest">
                                {isStaff ? 'My Assigned Requests' : 'My Active Requests'}
                            </h2>

                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-slate-950/30 rounded-2xl p-6 border border-slate-800/50 animate-pulse">
                                            <div className="h-4 bg-slate-800 rounded w-3/4 mb-4" />
                                            <div className="h-2 bg-slate-800 rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : activeTickets.length === 0 ? (
                                <p className="text-center text-slate-500 py-12 font-medium">No active requests found</p>
                            ) : (
                                <div className="space-y-3">
                                    {activeTickets.map((ticket) => {
                                        const sla = getSLAProgress(ticket);
                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                                                className="bg-[#0d1117] hover:border-emerald-500/50 border border-[#21262d] rounded-2xl p-6 cursor-pointer transition-all duration-300 group/ticket"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover/ticket:scale-110 transition-transform border border-emerald-500/20">
                                                            <MessageSquare className="w-6 h-6 text-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-lg mb-1">{ticket.title}</p>
                                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{ticket.category?.name || 'General'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-3">
                                                        {sla && <span className={`text-[10px] font-black uppercase tracking-tighter ${sla.color}`}>{sla.text}</span>}
                                                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover/ticket:text-emerald-500 transition-colors" />
                                                    </div>
                                                </div>
                                                {sla && (
                                                    <div className="mt-5 h-1.5 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${sla.progress > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                                                            style={{ width: `${sla.progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Recently Resolved */}
                        <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-sm font-black text-muted-foreground mb-6 uppercase tracking-widest">Recently Resolved</h2>

                            {resolvedTickets.length === 0 ? (
                                <p className="text-center text-slate-400 py-4">No resolved requests yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {resolvedTickets.map((ticket) => (
                                        <div key={ticket.id} className="bg-[#0d1117] border border-[#21262d] rounded-2xl p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                                        <MessageSquare className="w-6 h-6 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg mb-1">{ticket.title}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-4 h-4 cursor-pointer transition-colors ${star <= (ticket.rating || 0) ? 'text-emerald-500 fill-emerald-500' : 'text-slate-700 hover:text-emerald-400'
                                                                        }`}
                                                                    onClick={() => {
                                                                        if (!ticket.rating) {
                                                                            setRatingTicket(ticket);
                                                                            setSelectedRating(star);
                                                                        }
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!ticket.rating && (
                                                    <button
                                                        onClick={() => setRatingTicket(ticket)}
                                                        className="text-xs text-emerald-500 hover:text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-all"
                                                    >
                                                        Rate
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => router.push(`/tickets?createdBy=${user.id}`)}
                                className="w-full mt-6 text-center text-emerald-500 hover:text-white hover:bg-emerald-600 text-xs font-black uppercase tracking-widest transition-all py-3 border border-[#21262d] rounded-xl"
                            >
                                View All History
                            </button>
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
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                        onClick={() => setRatingTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#161b22] border border-[#21262d] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Rate Request</h3>
                            <p className="text-sm text-slate-400 mb-8">{ratingTicket.title}</p>
                            <div className="flex justify-center gap-3 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-8 h-8 cursor-pointer transition-all hover:scale-120 ${star <= selectedRating ? 'text-emerald-500 fill-emerald-500' : 'text-[#21262d]'
                                            }`}
                                        onClick={() => setSelectedRating(star)}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setRatingTicket(null)}
                                    className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRatingSubmit}
                                    disabled={selectedRating < 1}
                                    className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-emerald-700 disabled:bg-[#21262d] disabled:text-slate-600 transition-all shadow-lg shadow-emerald-900/40"
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
