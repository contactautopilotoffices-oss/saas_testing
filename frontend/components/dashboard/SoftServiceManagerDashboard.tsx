'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Sparkles, CheckCircle2, Clock, Users, TrendingUp,
    RefreshCw, Clipboard, BarChart3, ArrowRight, Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { createClient } from '@/frontend/utils/supabase/client';
import TicketCard from '@/frontend/components/shared/TicketCard';
import Skeleton from '@/frontend/components/ui/Skeleton';

const StockDashboard = dynamic(
    () => import('@/frontend/components/stock/StockDashboard'),
    { ssr: false, loading: () => <div className="p-8"><Skeleton className="h-96" /></div> }
);

type TopTab = 'requests' | 'stocks';

interface SoftServiceManagerDashboardProps {
    propertyId: string;
}

interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    ticket_number: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    raised_by?: string;
    assigned_to?: string;
    assignee: { id: string; full_name: string; email: string } | null;
    photo_before_url?: string;
    sla_paused?: boolean;
}

interface Stats {
    active: number;
    completedToday: number;
    pending: number;
    slaCompliance: number;
}

const SoftServiceManagerDashboard: React.FC<SoftServiceManagerDashboardProps> = ({ propertyId }) => {
    const router = useRouter();
    const supabase = createClient();

    const [topTab, setTopTab] = useState<TopTab>('requests');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [stats, setStats] = useState<Stats>({ active: 0, completedToday: 0, pending: 0, slaCompliance: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [propertyName, setPropertyName] = useState('');
    const [userName, setUserName] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('full_name')
                    .eq('id', user.id)
                    .maybeSingle();
                setUserName(dbUser?.full_name?.split(' ')[0] || 'Manager');
            }

            const { data: prop } = await supabase
                .from('properties')
                .select('name')
                .eq('id', propertyId)
                .maybeSingle();
            setPropertyName(prop?.name || 'Property');
        };
        init();
    }, [propertyId, supabase]);

    useEffect(() => {
        if (topTab === 'requests') fetchTickets();
    }, [propertyId, statusFilter, topTab]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const statusParam = statusFilter === 'active'
                ? 'status=open,assigned,in_progress'
                : 'status=resolved,closed';

            const response = await fetch(`/api/tickets?propertyId=${propertyId}&${statusParam}`);
            if (response.ok) {
                const data = await response.json();
                const fetched: Ticket[] = data.tickets || [];

                const sorted = [...fetched].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setTickets(sorted);

                if (statusFilter === 'active') {
                    setStats({
                        active: sorted.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status)).length,
                        completedToday: 0,
                        pending: sorted.filter(t => t.status === 'open').length,
                        slaCompliance: sorted.length > 0
                            ? Math.round((sorted.filter(t => !t.sla_paused).length / sorted.length) * 100)
                            : 100,
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchCompletedToday = async () => {
            try {
                const response = await fetch(`/api/tickets?propertyId=${propertyId}&status=resolved,closed`);
                if (response.ok) {
                    const data = await response.json();
                    const today = new Date().toDateString();
                    const completedToday = (data.tickets || []).filter(
                        (t: Ticket) => t.resolved_at && new Date(t.resolved_at).toDateString() === today
                    ).length;
                    setStats(prev => ({ ...prev, completedToday }));
                }
            } catch (err) {
                // Silent fail
            }
        };
        fetchCompletedToday();
    }, [propertyId]);

    const STAT_CARDS = [
        { label: 'Active Requests', value: stats.active, icon: Clipboard, color: 'from-blue-500 to-indigo-600', bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
        { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle2, color: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
        { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-50', textColor: 'text-amber-600' },
        { label: 'SLA Compliance', value: `${stats.slaCompliance}%`, icon: TrendingUp, color: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50', textColor: 'text-violet-600' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                Soft Services
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">
                                {propertyName} • Welcome, {userName}
                            </p>
                        </div>
                    </div>
                </div>
                {topTab === 'requests' && (
                    <button
                        onClick={fetchTickets}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                )}
            </div>

            {/* Top-level Tabs: Requests | Stocks */}
            <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                <button
                    onClick={() => setTopTab('requests')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${topTab === 'requests'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Clipboard size={16} />
                    Service Requests
                </button>
                <button
                    onClick={() => setTopTab('stocks')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${topTab === 'stocks'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Package size={16} />
                    Stocks
                </button>
            </div>

            {/* Requests Tab Content */}
            {topTab === 'requests' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {STAT_CARDS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-9 h-9 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                                        <stat.icon className={`w-4.5 h-4.5 ${stat.textColor}`} />
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{stat.value}</h3>
                            </motion.div>
                        ))}
                    </div>

                    {/* Ticket List Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Service Requests</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'active'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setStatusFilter('completed')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'completed'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>

                        <div className="p-3 sm:p-6">
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-52 bg-slate-50 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-7 h-7 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-semibold">No {statusFilter} requests</p>
                                    <p className="text-sm text-slate-300 mt-1">All caught up! ✨</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {tickets.map((ticket) => (
                                        <TicketCard
                                            key={ticket.id}
                                            id={ticket.id}
                                            title={ticket.title}
                                            priority={ticket.priority?.toUpperCase() as any || 'MEDIUM'}
                                            status={
                                                ['closed', 'resolved'].includes(ticket.status) ? 'COMPLETED' :
                                                    ticket.status === 'in_progress' ? 'IN_PROGRESS' :
                                                        ticket.assigned_to ? 'ASSIGNED' : 'OPEN'
                                            }
                                            ticketNumber={ticket.ticket_number}
                                            createdAt={ticket.created_at}
                                            assignedTo={ticket.assignee?.full_name}
                                            photoUrl={ticket.photo_before_url}
                                            isSlaPaused={ticket.sla_paused}
                                            onClick={() => router.push(`/tickets/${ticket.id}?from=requests`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Stocks Tab Content */}
            {topTab === 'stocks' && (
                <StockDashboard propertyId={propertyId} />
            )}
        </div>
    );
};

export default SoftServiceManagerDashboard;

