'use client';

import { useState, useEffect } from 'react';
import { Plus, Paperclip, Send, Clock, Star, User, ChevronRight, X, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
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
        <div className="min-h-screen bg-[var(--canvas-bg)] p-8 font-body">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-display font-semibold text-text-primary tracking-tight">
                            <span className="text-primary">{propertyName || 'Property'}</span>{' '}
                            {isStaff ? 'Maintenance Portal' : 'Request Manager'}
                        </h1>
                        <p className="text-sm text-text-secondary mt-1 font-medium">Efficiently handle your facility needs</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 premium-panel px-6 py-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-text-primary font-semibold text-sm">{user.full_name}</p>
                                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{isStaff ? 'MST Account' : 'Tenant Account'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Raise New Request */}
                    <div className="space-y-6">
                        <div className="glass-panel p-10">
                            <h2 className="text-xs font-bold text-secondary mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                                <Plus className="w-4 h-4" />
                                Raise a New Request
                            </h2>

                            <div className="relative group">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the issue in your words.&#10;Example: Leaking tap in kitchenette"
                                    className="w-full h-40 bg-text-primary/5 border border-border/10 rounded-2xl p-6 text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-primary/10 transition-smooth font-medium"
                                />
                                <div className="absolute inset-0 rounded-2xl border border-primary/5 pointer-events-none group-focus-within:border-primary/20 transition-smooth"></div>
                            </div>

                            {/* Photo Preview */}
                            {photoPreview && (
                                <div className="relative mt-4">
                                    <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-2xl border border-border/10" />
                                    <button
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                        className="absolute top-3 right-3 bg-error text-text-inverse rounded-full p-2 shadow-xl hover:scale-110 transition-smooth"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-10">
                                <label className="flex items-center gap-3 text-text-secondary hover:text-primary cursor-pointer transition-smooth text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/10">
                                    <Paperclip className="w-5 h-5" />
                                    <span>Attach File</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                                </label>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !description.trim()}
                                    className="px-10 py-4 bg-primary hover:opacity-90 disabled:bg-text-primary/10 disabled:text-text-tertiary disabled:cursor-not-allowed text-text-inverse font-semibold rounded-2xl transition-smooth flex items-center gap-3 shadow-xl shadow-primary/20 uppercase tracking-widest text-[11px]"
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
                                    className="premium-list p-8 border-success/30 bg-success/5"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-success font-bold uppercase tracking-widest text-[11px]">✓ Request Submitted Successfully</h3>
                                        <span className="text-[10px] bg-success text-text-inverse px-3 py-1 rounded-full font-bold tracking-tighter">SUCCESS</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-text-secondary font-medium text-sm">AI Classification:</span>
                                            <span className="text-text-primary font-display font-semibold capitalize">{classification.category?.replace(/_/g, ' ') || 'General Request'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-text-secondary font-medium text-sm">System Priority:</span>
                                            <span className="text-primary font-bold uppercase tracking-widest text-[10px]">Processing</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Panel - My Tickets */}
                    <div className="space-y-8">
                        <div className="glass-panel p-10">
                            <h2 className="text-xs font-bold text-text-tertiary mb-10 uppercase tracking-[0.2em] border-b border-border/5 pb-6">
                                {isStaff ? 'Assigned Operations' : 'Recent Activity'}
                            </h2>

                            {loading ? (
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-text-primary/5 rounded-3xl p-8 border border-border/5 animate-pulse">
                                            <div className="h-5 bg-text-primary/10 rounded-lg w-3/4 mb-4" />
                                            <div className="h-2.5 bg-text-primary/5 rounded-full w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : activeTickets.length === 0 ? (
                                <div className="text-center py-20 px-8">
                                    <div className="w-20 h-20 bg-text-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <MessageSquare className="w-8 h-8 text-text-tertiary/30" />
                                    </div>
                                    <p className="text-text-tertiary font-medium">No active requests currently in progress</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeTickets.map((ticket) => {
                                        const sla = getSLAProgress(ticket);
                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                                                className="group/ticket premium-list p-8 cursor-pointer transition-smooth border-border/5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-6">
                                                        <div className="w-14 h-14 kpi-icon flex items-center justify-center flex-shrink-0">
                                                            <MessageSquare className="w-7 h-7 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-display font-semibold text-text-primary text-xl mb-1.5 group-hover/ticket:text-primary transition-smooth">{ticket.title}</p>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-text-primary/5 px-2.5 py-1 rounded-md">{ticket.category?.name || 'General'}</span>
                                                                {sla && <span className={`text-[10px] font-bold uppercase tracking-widest ${sla.color}`}>{sla.text}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <ChevronRight className="w-6 h-6 text-text-tertiary group-hover/ticket:text-primary group-hover/ticket:translate-x-1 transition-smooth" />
                                                    </div>
                                                </div>
                                                {sla && (
                                                    <div className="mt-8 h-1.5 bg-text-primary/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${sla.progress}%` }}
                                                            className={`h-full rounded-full transition-all duration-1000 ${sla.progress > 80 ? 'bg-error shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-primary shadow-[0_0_12px_rgba(112,143,150,0.2)]'}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* History Panel */}
                        <div className="glass-panel p-10 bg-opacity-40">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-[0.2em]">Recently Resolved</h2>
                                <button
                                    onClick={() => router.push(`/tickets?createdBy=${user.id}`)}
                                    className="text-[10px] font-bold text-primary hover:text-secondary uppercase tracking-widest transition-smooth underline decoration-primary/20 underline-offset-8"
                                >
                                    Full Archive
                                </button>
                            </div>

                            {resolvedTickets.length === 0 ? (
                                <p className="text-center text-text-tertiary/60 py-8 font-medium italic">Your resolution history will appear here</p>
                            ) : (
                                <div className="space-y-4">
                                    {resolvedTickets.map((ticket) => (
                                        <div key={ticket.id} className="premium-list p-6 bg-white/20 border-border/5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 kpi-icon flex items-center justify-center">
                                                        <CheckCircle className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-display font-semibold text-text-primary text-lg mb-1">{ticket.title}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-3.5 h-3.5 transition-smooth ${star <= (ticket.rating || 0) ? 'text-secondary fill-secondary' : 'text-text-tertiary/20 hover:text-secondary/40'}`}
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
                                                        className="text-[10px] text-primary hover:text-text-inverse hover:bg-primary font-bold uppercase tracking-widest border border-primary/30 px-4 py-2 rounded-xl transition-smooth"
                                                    >
                                                        Rate
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
