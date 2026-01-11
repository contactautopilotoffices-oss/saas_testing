'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, MapPin, Send, CheckCircle, Circle, Camera, AlertTriangle, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface TicketDetailProps {
    ticketId: string;
    onBack?: () => void;
    isAdmin?: boolean;
}

interface TimelineStep {
    step: string;
    completed: boolean;
    time: string | null;
}

interface Comment {
    id: string;
    comment: string;
    created_at: string;
    is_internal: boolean;
    user?: { full_name: string; avatar_url?: string };
}

export default function TicketDetail({ ticketId, onBack, isAdmin = false }: TicketDetailProps) {
    const [ticket, setTicket] = useState<Record<string, unknown> | null>(null);
    const [timeline, setTimeline] = useState<TimelineStep[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    useEffect(() => {
        fetchTicketDetail();
    }, [ticketId]);

    const fetchTicketDetail = async () => {
        try {
            const response = await fetch(`/api/tickets/${ticketId}`);
            const data = await response.json();

            if (response.ok) {
                setTicket(data.ticket);
                setTimeline(data.timeline || []);
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;

        setSendingComment(true);
        try {
            const response = await fetch(`/api/tickets/${ticketId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment }),
            });

            if (response.ok) {
                const data = await response.json();
                setComments([...comments, data.comment]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error sending comment:', error);
        } finally {
            setSendingComment(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                fetchTicketDetail();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-400">
                Ticket not found
            </div>
        );
    }

    const category = ticket.category as { name?: string } | undefined;
    const creator = ticket.creator as { full_name?: string } | undefined;
    const assignee = ticket.assignee as { full_name?: string } | undefined;

    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Header */}
            <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur border-b border-[#21262d] p-4">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Requests
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Title & Badges */}
                <div>
                    <h1 className="text-2xl font-bold mb-3">{ticket.title as string}</h1>
                    <div className="flex flex-wrap gap-2">
                        {category?.name && (
                            <span className="px-3 py-1 bg-[#21262d] rounded-full text-sm">{category.name}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm ${ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-blue-500/20 text-blue-400'
                            }`}>
                            {(ticket.priority as string)?.charAt(0).toUpperCase() + (ticket.priority as string)?.slice(1)} Priority
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm ${ticket.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                ticket.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-400' :
                                    'bg-gray-500/20 text-gray-400'
                            }`}>
                            {(ticket.status as string)?.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>

                {/* Issue Description */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-3">Issue Description</h2>
                    <p className="text-gray-300 mb-4">{ticket.description as string}</p>

                    <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Created: {new Date(ticket.created_at as string).toLocaleString()}
                        </div>
                        {creator?.full_name && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Reported by: {creator.full_name}
                            </div>
                        )}
                        {ticket.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {ticket.location as string}
                            </div>
                        )}
                    </div>
                </div>

                {/* Request Progress Timeline */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-6">Request Progress</h2>

                    <div className="flex items-center justify-between">
                        {timeline.map((step, index) => (
                            <div key={step.step} className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500' : 'bg-[#30363d]'
                                    }`}>
                                    {step.completed ? (
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-gray-500" />
                                    )}
                                </div>
                                <span className={`text-xs mt-2 ${step.completed ? 'text-green-400' : 'text-gray-500'}`}>
                                    {step.step}
                                </span>
                                {index < timeline.length - 1 && (
                                    <div className={`absolute h-1 w-full ${step.completed ? 'bg-green-500' : 'bg-[#30363d]'}`}
                                        style={{ left: '50%', top: '20px', width: 'calc(100% - 40px)' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action badges */}
                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-[#30363d]">
                        {timeline.map((step) => (
                            <span
                                key={step.step}
                                className={`px-3 py-1 rounded text-xs ${step.completed ? 'bg-green-500/20 text-green-400' : 'bg-[#21262d] text-gray-500'
                                    }`}
                            >
                                {step.step} {step.completed && '✓'}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Photos Section */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Photos</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Before</p>
                            <div className="aspect-video bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl flex items-center justify-center">
                                {ticket.photo_before_url ? (
                                    <img src={ticket.photo_before_url as string} alt="Before" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <span className="text-xs">No photo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-2">After</p>
                            <div className="aspect-video bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl flex items-center justify-center">
                                {ticket.photo_after_url ? (
                                    <img src={ticket.photo_after_url as string} alt="After" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <span className="text-xs">No photo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assigned Technician */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                    {assignee?.full_name ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Assigned Technician</p>
                                <p className="font-medium">{assignee.full_name}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-4">No technician assigned yet</p>
                    )}
                </div>

                {/* Communication Thread */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Communication Thread</h2>

                    <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                        {comments.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No comments yet. Be the first to start the conversation.</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 bg-[#21262d] rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{comment.user?.full_name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{comment.comment}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Comment Input */}
                    <div className="flex gap-3 pt-4 border-t border-[#30363d]">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your message here..."
                            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                        />
                        <button
                            onClick={handleSendComment}
                            disabled={sendingComment || !newComment.trim()}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 rounded-lg flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Send Comment
                        </button>
                    </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Admin Actions</h2>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleUpdateStatus('in_progress')}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm"
                            >
                                Start Work
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('resolved')}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm"
                            >
                                Mark Resolved
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('closed')}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm"
                            >
                                Close Ticket
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
