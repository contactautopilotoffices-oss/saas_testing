'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    AlertCircle, MessageSquare, User, Building2, Clock, CheckCircle2,
    XCircle, RefreshCw, Filter, Send, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    organization: { id: string; name: string; code: string };
    property: { id: string; name: string; code: string } | null;
    raised_by_user: { id: string; full_name: string; email: string };
    assigned_to_user: { id: string; full_name: string; email: string } | null;
    ticket_comments: { count: number }[];
}

interface Comment {
    id: string;
    comment: string;
    is_internal: boolean;
    created_at: string;
    user: { id: string; full_name: string; email: string };
}

const TicketsView: React.FC = () => {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchTickets();
    }, [statusFilter]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const url = statusFilter === 'all'
                ? '/api/tickets'
                : `/api/tickets?status=${statusFilter}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                fetchTickets();
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'open': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'closed': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-slate-900">Support Tickets</h3>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={fetchTickets}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                </button>
            </div>

            {/* Tickets List */}
            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No tickets found</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="p-6 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-black text-slate-900">{ticket.title}</h4>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusColor(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {ticket.organization.name}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {ticket.raised_by_user.full_name}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ticket.status === 'open' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(ticket.id, 'in_progress');
                                                }}
                                                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600"
                                            >
                                                Start
                                            </button>
                                        )}
                                        {ticket.status === 'in_progress' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(ticket.id, 'resolved');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsView;
