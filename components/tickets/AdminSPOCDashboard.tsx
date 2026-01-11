'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, ChevronDown, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    sla_deadline: string | null;
    sla_breached: boolean;
    sla_paused: boolean;
    confidence_score: number;
    is_vague: boolean;
    category?: { id: string; name: string };
    assignee?: { full_name: string };
    creator?: { full_name: string };
    floor_number?: number;
}

interface Resolver {
    user_id: string;
    active_tickets: number;
    current_floor: number;
    is_available: boolean;
    score: number;
    user?: { full_name: string };
}

interface Activity {
    id: string;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    user?: { full_name: string };
    ticket_id: string;
}

interface Category {
    id: string;
    code: string;
    name: string;
}

interface AdminSPOCDashboardProps {
    propertyId: string;
    organizationId: string;
    propertyName?: string;
    adminUser?: { full_name: string; avatar_url?: string };
}

export default function AdminSPOCDashboard({
    propertyId,
    organizationId,
    propertyName,
    adminUser,
}: AdminSPOCDashboardProps) {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [resolvers, setResolvers] = useState<Resolver[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [assignTo, setAssignTo] = useState('');
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideCategory, setOverrideCategory] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [propertyId]);

    const fetchData = async () => {
        try {
            const [ticketsRes, resolversRes, categoriesRes] = await Promise.all([
                fetch(`/api/tickets?propertyId=${propertyId}`),
                fetch(`/api/resolvers/workload?propertyId=${propertyId}`),
                fetch(`/api/properties/${propertyId}/ticket-config`),
            ]);

            const ticketsData = await ticketsRes.json();
            const resolversData = await resolversRes.json();
            const categoriesData = await categoriesRes.json();

            setTickets(ticketsData.tickets || []);
            setResolvers(resolversData.resolvers || []);
            setCategories(categoriesData.categories || []);

            // Fetch recent activities from first few tickets
            if (ticketsData.tickets?.length > 0) {
                const actRes = await fetch(`/api/tickets/${ticketsData.tickets[0].id}/activity`);
                const actData = await actRes.json();
                setActivities(actData.activities?.slice(0, 5) || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSLAStatus = (deadline: string | null, breached: boolean, paused: boolean) => {
        if (paused) return { text: 'PAUSED', color: 'text-yellow-400 bg-yellow-500/20', urgent: false };
        if (breached) return { text: 'SLA BREACHED', color: 'text-red-400 bg-red-500/20', urgent: true };
        if (!deadline) return null;

        const diffMs = new Date(deadline).getTime() - Date.now();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 0) return { text: 'SLA BREACHED', color: 'text-red-400 bg-red-500/20', urgent: true };
        if (diffMins < 30) return { text: `${diffMins}m left`, color: 'text-red-400 bg-red-500/20', urgent: true };
        if (diffMins < 60) return { text: `${diffMins}m left`, color: 'text-orange-400 bg-orange-500/20', urgent: true };

        const hours = Math.floor(diffMins / 60);
        return { text: `${hours}h ${diffMins % 60}m`, color: 'text-gray-400 bg-gray-500/20', urgent: false };
    };

    // Force Assign
    const handleForceAssign = async () => {
        if (!selectedTicket || !assignTo) return;
        setActionLoading('assign');
        try {
            await fetch(`/api/tickets/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: assignTo }),
            });
            fetchData();
            setSelectedTicket(null);
            setAssignTo('');
        } catch (error) {
            console.error('Error assigning:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // Pause/Resume SLA
    const handlePauseSLA = async (ticketId: string, pause: boolean) => {
        setActionLoading(`pause-${ticketId}`);
        try {
            await fetch(`/api/tickets/${ticketId}/pause-sla`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pause, reason: pause ? 'Paused by admin' : undefined }),
            });
            fetchData();
        } catch (error) {
            console.error('Error pausing SLA:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // Trigger AI Re-eval
    const handleReclassify = async (ticketId: string) => {
        setActionLoading(`reclassify-${ticketId}`);
        try {
            await fetch(`/api/tickets/${ticketId}/reclassify`, { method: 'POST' });
            fetchData();
        } catch (error) {
            console.error('Error reclassifying:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // Override Classification
    const handleOverrideClassification = async () => {
        if (!selectedTicket || !overrideCategory) return;
        setActionLoading('override');
        try {
            await fetch(`/api/tickets/${selectedTicket.id}/override-classification`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id: overrideCategory }),
            });
            fetchData();
            setShowOverrideModal(false);
            setOverrideCategory('');
        } catch (error) {
            console.error('Error overriding:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const waitlistTickets = tickets.filter(t => t.status === 'waitlist' || t.is_vague);
    const slaRiskTickets = tickets.filter(t => {
        if (!t.sla_deadline || t.sla_paused) return false;
        const diffMs = new Date(t.sla_deadline).getTime() - Date.now();
        return diffMs > 0 && diffMs < 60 * 60 * 1000;
    });
    const availableResolvers = resolvers.filter(r => r.is_available);

    // Real workload distribution for chart
    const workloadBuckets = [0, 0, 0, 0, 0]; // 0, 1-2, 3-4, 5-6, 7+ tasks
    resolvers.forEach(r => {
        if (r.active_tickets === 0) workloadBuckets[0]++;
        else if (r.active_tickets <= 2) workloadBuckets[1]++;
        else if (r.active_tickets <= 4) workloadBuckets[2]++;
        else if (r.active_tickets <= 6) workloadBuckets[3]++;
        else workloadBuckets[4]++;
    });

    return (
        <div className="min-h-screen bg-[#0a0e14] text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Ticketic V3.0: Site SPOC Dashboard</h1>
                        <p className="text-gray-400 text-sm">{propertyName || 'Property'}</p>
                    </div>
                </div>
                <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Live Ticket Board */}
                <div className="col-span-3 bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        LIVE TICKET BOARD
                    </h2>

                    <div className="overflow-auto max-h-[300px]">
                        <table className="w-full text-xs">
                            <thead className="text-gray-500 sticky top-0 bg-[#141a24]">
                                <tr>
                                    <th className="text-left py-2">ID</th>
                                    <th className="text-left py-2">Subject</th>
                                    <th className="text-right py-2">SLA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.slice(0, 15).map((ticket) => {
                                    const sla = getSLAStatus(ticket.sla_deadline, ticket.sla_breached, ticket.sla_paused);
                                    return (
                                        <tr
                                            key={ticket.id}
                                            className={`border-t border-[#1e2836] hover:bg-white/5 cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-cyan-500/10' : ''
                                                }`}
                                            onClick={() => setSelectedTicket(ticket)}
                                        >
                                            <td className="py-2 text-gray-400">{ticket.ticket_number?.slice(-5)}</td>
                                            <td className="py-2 text-white truncate max-w-[120px]">{ticket.title}</td>
                                            <td className="py-2 text-right">
                                                {sla ? (
                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${sla.color}`}>
                                                        {sla.text}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Resolver Load Map */}
                <div className="col-span-5 bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-gray-300 mb-3">RESOLVER LOAD MAP</h2>

                    <div className="flex gap-4">
                        <div className="flex-1 bg-[#0d1117] rounded-lg p-4 relative min-h-[200px]">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />

                            {resolvers.slice(0, 6).map((r, i) => (
                                <div
                                    key={r.user_id}
                                    className="absolute flex flex-col items-center"
                                    style={{
                                        left: `${15 + (i % 3) * 30}%`,
                                        top: `${20 + Math.floor(i / 3) * 45}%`,
                                    }}
                                    title={`${r.user?.full_name || 'Resolver'} - Floor ${r.current_floor}, ${r.active_tickets} tasks`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.active_tickets === 0 ? 'bg-green-500/30 border border-green-500' :
                                            r.active_tickets < 3 ? 'bg-yellow-500/30 border border-yellow-500' :
                                                'bg-red-500/30 border border-red-500'
                                        }`}>
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1">{r.active_tickets}</span>
                                </div>
                            ))}
                        </div>

                        <div className="w-32 space-y-3">
                            <div className="bg-[#0d1117] rounded-lg p-3">
                                <p className="text-xs text-gray-400">Total Active</p>
                                <p className="text-2xl font-bold text-cyan-400">{availableResolvers.length}</p>
                                <p className="text-xs text-gray-500">Available</p>
                            </div>

                            <div className="bg-[#0d1117] rounded-lg p-3">
                                <div className="flex items-end gap-1 h-[40px]">
                                    {workloadBuckets.map((count, i) => (
                                        <div
                                            key={i}
                                            className="w-4 bg-cyan-500/50 rounded-t transition-all"
                                            style={{ height: `${Math.max(4, count * 10)}px` }}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Workload</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-span-4 space-y-4">
                    {/* Waitlist */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-cyan-400">WAITLIST</h2>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>

                        <p className="text-2xl font-bold text-white mb-2">{waitlistTickets.length} Tickets</p>
                        <p className="text-xs text-gray-400 mb-3">NEEDS CLASSIFICATION</p>

                        {waitlistTickets.slice(0, 2).map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-xs mb-2">
                                <span className={`w-2 h-2 rounded-full ${t.confidence_score >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-gray-400">Confidence: {t.confidence_score || '<40'}%</span>
                            </div>
                        ))}

                        <button
                            onClick={() => {
                                if (waitlistTickets[0]) {
                                    setSelectedTicket(waitlistTickets[0]);
                                    setShowOverrideModal(true);
                                }
                            }}
                            className="w-full mt-3 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                        >
                            OVERRULE & RETRAIN AI
                        </button>
                    </div>

                    {/* Manual Assignment */}
                    <div className="bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3">MANUAL ASSIGNMENT</h2>

                        {selectedTicket ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-400">{selectedTicket.title}</p>
                                <select
                                    value={assignTo}
                                    onChange={(e) => setAssignTo(e.target.value)}
                                    className="w-full bg-[#0d1117] border border-[#1e2836] rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select resolver...</option>
                                    {resolvers.map(r => (
                                        <option key={r.user_id} value={r.user_id}>
                                            {r.user?.full_name} ({r.active_tickets} tasks, score: {r.score})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleForceAssign}
                                    disabled={!assignTo || actionLoading === 'assign'}
                                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'assign' ? 'Assigning...' : 'FORCE ASSIGN'}
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">Select a ticket from the board</p>
                        )}
                    </div>
                </div>

                {/* SLA Risk Queue */}
                <div className="col-span-6 bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        SLA RISK QUEUE
                    </h2>

                    {slaRiskTickets.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No tickets at SLA risk</p>
                    ) : (
                        <div className="space-y-2">
                            {slaRiskTickets.slice(0, 3).map(ticket => {
                                const sla = getSLAStatus(ticket.sla_deadline, false, false);
                                return (
                                    <div key={ticket.id} className="flex items-center justify-between bg-[#0d1117] rounded-lg p-3">
                                        <div>
                                            <p className="text-sm text-white">{ticket.ticket_number}: "{ticket.title.slice(0, 30)}..."</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                                <span className="text-xs text-yellow-400">SLA Left: {sla?.text}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs"
                                        >
                                            ASSIGN
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Audit Log + Quick Actions */}
                <div className="col-span-6 grid grid-cols-2 gap-4">
                    {/* Audit Log */}
                    <div className="bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3">OVERRIDE & AUDIT LOG</h2>

                        <div className="space-y-2 text-xs max-h-[120px] overflow-auto">
                            {activities.length === 0 ? (
                                <p className="text-gray-500">No recent activity</p>
                            ) : (
                                activities.map(act => (
                                    <div key={act.id} className="flex items-start gap-2 text-gray-400">
                                        <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>
                                            {act.user?.full_name || 'System'} {act.action.replace(/_/g, ' ')}
                                            {act.new_value && ` → ${act.new_value.slice(0, 20)}`}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => selectedTicket && router.push(`/tickets/${selectedTicket.id}`)}
                            className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs transition-colors"
                        >
                            FULL AUDIT TRAIL
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-[#141a24] border border-[#1e2836] rounded-xl p-4">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3">QUICK ACTIONS</h2>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => selectedTicket && handlePauseSLA(selectedTicket.id, !selectedTicket.sla_paused)}
                                disabled={!selectedTicket}
                                className="py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                            >
                                {selectedTicket?.sla_paused ? 'RESUME SLA' : 'PAUSE SLA'}
                            </button>
                            <button
                                onClick={() => selectedTicket && handleReclassify(selectedTicket.id)}
                                disabled={!selectedTicket}
                                className="py-2 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                            >
                                AI RE-EVAL
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedTicket) {
                                        setShowOverrideModal(true);
                                    }
                                }}
                                disabled={!selectedTicket}
                                className="py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                            >
                                OVERRIDE
                            </button>
                            <button
                                onClick={() => router.push('/reports/tickets')}
                                className="py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-1"
                            >
                                REPORTS ✨
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Override Classification Modal */}
            <AnimatePresence>
                {showOverrideModal && selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                        onClick={() => setShowOverrideModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Override Classification</h3>
                                <button onClick={() => setShowOverrideModal(false)}>
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-400 mb-4">Ticket: {selectedTicket.title}</p>
                            <p className="text-xs text-gray-500 mb-2">Current: {selectedTicket.category?.name || 'Unclassified'}</p>

                            <select
                                value={overrideCategory}
                                onChange={(e) => setOverrideCategory(e.target.value)}
                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm mb-4"
                            >
                                <option value="">Select new category...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowOverrideModal(false)}
                                    className="flex-1 py-2 bg-white/10 rounded-lg text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOverrideClassification}
                                    disabled={!overrideCategory || actionLoading === 'override'}
                                    className="flex-1 py-2 bg-red-500 hover:bg-red-400 rounded-lg text-white disabled:bg-gray-600"
                                >
                                    {actionLoading === 'override' ? 'Saving...' : 'Override & Retrain'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
