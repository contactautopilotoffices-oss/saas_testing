'use client';

import { useState, useEffect } from 'react';
import { Plus, Paperclip, Send, Clock, Star, User, ChevronRight, X } from 'lucide-react';
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
}

export default function TenantTicketingDashboard({
    propertyId,
    organizationId,
    user,
    propertyName,
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
    }, [propertyId]);

    const fetchTickets = async () => {
        try {
            const response = await fetch(`/api/tickets?propertyId=${propertyId}&createdBy=${user.id}`);
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
        open: 'text-blue-400',
        assigned: 'text-purple-400',
        in_progress: 'text-cyan-400',
        waitlist: 'text-yellow-400',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">
                            <span className="text-cyan-400">Ticketic v3.0:</span>{' '}
                            <span className="text-white">Intelligent Request Management</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white/10 rounded-full px-4 py-2">
                            <div className="w-10 h-10 bg-cyan-500/30 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium">{user.full_name}</p>
                                <p className="text-xs text-gray-400">{propertyName || 'Property'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel - Raise New Request */}
                    <div className="space-y-4">
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-cyan-400" />
                                RAISE A NEW REQUEST
                            </h2>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the issue in your words.&#10;Example: Leaking tap in kitchenette"
                                className="w-full h-24 bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-500"
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

                            <div className="flex items-center justify-between mt-4">
                                <label className="flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                                    <Paperclip className="w-5 h-5" />
                                    <span>Attach Photo/File</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                                </label>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !description.trim()}
                                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Submit
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
                                    className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur border border-cyan-500/30 rounded-2xl p-6"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-cyan-400 font-semibold">SYSTEM INTERPRETATION</h3>
                                        <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">(AI-POWERED)</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Category:</span>
                                            <span className="text-white">{classification.category?.replace(/_/g, ' ') || 'Pending Review'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Confidence:</span>
                                            <span className={classification.confidence >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                                                {classification.confidence}%
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Panel - My Tickets */}
                    <div className="space-y-6">
                        {/* Active Requests */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">MY ACTIVE REQUESTS</h2>

                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
                                            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-white/10 rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : activeTickets.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No active requests</p>
                            ) : (
                                <div className="space-y-3">
                                    {activeTickets.map((ticket) => {
                                        const sla = getSLAProgress(ticket);
                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                                                className="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <User className="w-5 h-5 text-orange-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{ticket.title}</p>
                                                            <p className="text-sm text-gray-400">{ticket.category?.name || 'General'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-2">
                                                        {sla && <span className={`text-xs ${sla.color}`}>{sla.text}</span>}
                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                </div>
                                                {sla && (
                                                    <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${sla.progress > 80 ? 'bg-red-500' : 'bg-cyan-500'}`}
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
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">RECENTLY RESOLVED</h2>

                            {resolvedTickets.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">No resolved requests yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {resolvedTickets.map((ticket) => (
                                        <div key={ticket.id} className="bg-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                                        <User className="w-5 h-5 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{ticket.title}</p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-4 h-4 cursor-pointer ${star <= (ticket.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'
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
                                                        className="text-xs text-cyan-400 hover:text-cyan-300"
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
                                className="w-full mt-4 text-center text-cyan-400 hover:text-cyan-300 text-sm"
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
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 max-w-sm w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Rate this request</h3>
                            <p className="text-sm text-gray-400 mb-4">{ratingTicket.title}</p>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-8 h-8 cursor-pointer ${star <= selectedRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'
                                            }`}
                                        onClick={() => setSelectedRating(star)}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRatingTicket(null)}
                                    className="flex-1 py-2 bg-white/10 rounded-lg text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRatingSubmit}
                                    disabled={selectedRating < 1}
                                    className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-white disabled:bg-gray-600"
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
