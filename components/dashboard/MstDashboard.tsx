'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle, Plus,
    LogOut, Bell, Settings, Search, UserCircle, Coffee, Fuel, UsersRound,
    ClipboardList, FolderKanban, Moon, Sun, ChevronRight, RefreshCw, Cog, X,
    AlertOctagon, BarChart3, FileText, Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselStaffDashboard from '@/components/diesel/DieselStaffDashboard';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';

// Types
type Tab = 'dashboard' | 'tasks' | 'projects' | 'requests' | 'create_request' | 'alerts' | 'visitors' | 'diesel' | 'cafeteria' | 'settings';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id?: string;
}

interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    assigned_to?: string | null;
    assignee?: {
        full_name: string;
        email: string;
    } | null;
}

const MstDashboard = () => {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const propertyId = params?.propertyId as string;

    // State
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showQuickActions, setShowQuickActions] = useState(true);
    const [incomingTickets, setIncomingTickets] = useState<Ticket[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (propertyId && user) {
            fetchPropertyDetails();
            fetchTickets();
        }
    }, [propertyId, user]);

    const fetchTickets = async () => {
        if (!user || !propertyId) return;
        setIsFetching(true);
        console.log('Fetching all property tickets for MST view:', propertyId);

        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                assignee:users!assigned_to(id, full_name, email)
            `)
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
        } else {
            console.log('Tickets fetched:', data);
            // Filter non-closed tickets for the dashboard view
            const filtered = (data || []).filter(t => !['resolved', 'closed'].includes(t.status));
            setIncomingTickets(filtered);
        }
        setIsFetching(false);
    };

    const fetchPropertyDetails = async () => {
        setIsLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .maybeSingle();

        if (error || !data) {
            console.error('Property fetch error:', error);
            setErrorMsg(`Property not found (ID: ${propertyId})`);
        } else {
            setProperty(data);
        }
        setIsLoading(false);
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f1419]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-900 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-medium">Loading maintenance portal...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-bold text-red-400">Error Loading Dashboard</h2>
                <p className="text-slate-400 mt-2">{errorMsg || 'Property not found.'}</p>
                <button onClick={() => router.back()} className="mt-4 text-emerald-400 font-bold hover:underline">Go Back</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f1419] flex font-inter text-white">
            {/* Dark Sidebar */}
            <aside className="w-56 bg-[#161b22] flex flex-col fixed h-full z-10 border-r border-[#21262d]">
                {/* Logo */}
                <div className="p-4 border-b border-[#21262d]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-white">AUTOPILOT</h2>
                            <p className="text-[10px] text-slate-500">Maintenance Portal</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search features... (Ctr"
                            className="w-full pl-8 pr-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</span>
                        <button onClick={() => setShowQuickActions(!showQuickActions)} className="text-slate-500 hover:text-slate-300">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    {showQuickActions && (
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => setActiveTab('create_request')}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <Plus className="w-3 h-3" />
                                New Request
                            </button>
                            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]">
                                <Cog className="w-3 h-3" />
                                Manage Pro...
                            </button>
                            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]">
                                <AlertOctagon className="w-3 h-3" />
                                Emergency ...
                            </button>
                            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]">
                                <FileText className="w-3 h-3" />
                                Quick Report
                            </button>
                            <button className="col-span-2 flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]">
                                <BarChart3 className="w-3 h-3" />
                                System Stat...
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 overflow-y-auto">
                    {/* Daily Work */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full" />
                            Daily Work
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'dashboard'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'tasks'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                My Tasks
                            </button>
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'projects'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <FolderKanban className="w-4 h-4" />
                                My Project Work
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'requests'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('alerts')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'alerts'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <Bell className="w-4 h-4" />
                                Alerts
                            </button>
                        </div>
                    </div>

                    {/* Operations */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full" />
                            Operations
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'visitors'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitors
                            </button>
                            <button
                                onClick={() => setActiveTab('diesel')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'diesel'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <Fuel className="w-4 h-4" />
                                Diesel Logger
                            </button>
                            <button
                                onClick={() => setActiveTab('cafeteria')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'cafeteria'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-[#21262d] p-3">
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-2 px-2 py-2 text-slate-500 hover:text-red-400 rounded-lg w-full transition-colors text-xs font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-56 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-14 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchTickets}
                            className="text-xs text-slate-400 hover:text-white border border-[#30363d] px-3 py-1.5 rounded-md bg-[#21262d]"
                        >
                            <RefreshCw className="w-3 h-3 inline mr-1.5" />
                            Refresh page
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-64 pl-10 pr-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#21262d] text-slate-400 hover:text-white transition-colors"
                        >
                            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#21262d] text-slate-400 hover:text-white transition-colors">
                            <Bell className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#21262d] text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 pl-3 border-l border-[#30363d]">
                            <span className="text-xs text-slate-400 font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'dashboard' && property && user && (
                                <DashboardTab
                                    tickets={incomingTickets}
                                    onTicketClick={(id) => router.push(`/tickets/${id}`)}
                                    userId={user.id}
                                    isLoading={isFetching}
                                    propertyId={propertyId}
                                    propertyName={property.name}
                                    userName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff'}
                                />
                            )}
                            {activeTab === 'tasks' && <TasksTab />}
                            {activeTab === 'projects' && <ProjectsTab />}
                            {activeTab === 'requests' && user && (
                                <RequestsTab
                                    tickets={incomingTickets}
                                    onTicketClick={(id) => router.push(`/tickets/${id}`)}
                                    userId={user.id}
                                    isLoading={isFetching}
                                    propertyName={property?.name}
                                    userName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff'}
                                />
                            )}
                            {activeTab === 'create_request' && property && user && (
                                <TenantTicketingDashboard
                                    propertyId={property.id}
                                    organizationId={property.organization_id || ''}
                                    user={{ id: user.id, full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff' }}
                                    propertyName={property.name}
                                    isStaff={true}
                                />
                            )}
                            {activeTab === 'alerts' && <AlertsTab />}
                            {activeTab === 'visitors' && <VisitorsTab />}
                            {activeTab === 'diesel' && <DieselStaffDashboard />}
                            {activeTab === 'cafeteria' && <CafeteriaTab />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />
        </div>
    );
};

// Dashboard Tab
const DashboardTab = ({ tickets, onTicketClick, userId, isLoading, propertyId, propertyName, userName }: { tickets: Ticket[], onTicketClick: (id: string) => void, userId: string, isLoading: boolean, propertyId: string, propertyName?: string, userName?: string }) => {
    const total = tickets.length;
    const active = tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
    const completed = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Maintenance Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">{propertyName || 'Property'} • MST: {userName}</p>
            </div>

            {/* Property Requests */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
                <div className="mb-4">
                    <h2 className="text-base font-bold text-white">Property Requests</h2>
                    <p className="text-xs text-slate-500">All requests for this property</p>
                </div>
                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        <div className="flex flex-col gap-2 py-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-[#0d1117] border border-[#21262d] rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                            No requests found
                        </div>
                    ) : (
                        tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => onTicketClick(ticket.id)}
                                className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 hover:border-emerald-500/50 transition-colors group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white truncate max-w-[200px]">{ticket.title}</h3>
                                        {ticket.assigned_to === userId ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Assigned to You
                                            </span>
                                        ) : ticket.assigned_to ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Assigned to {ticket.assignee?.full_name || 'Staff'}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                Unassigned / Incoming
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${ticket.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            ticket.priority === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {ticket.priority}
                                        </span>
                                        <button
                                            onClick={() => onTicketClick(ticket.id)}
                                            className="text-[10px] px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all font-bold uppercase tracking-widest"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{ticket.description}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Ticket className="w-3 h-3" />
                                        {ticket.ticket_number}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className={`uppercase font-bold ${ticket.status === 'in_progress' ? 'text-blue-400' : ticket.status === 'assigned' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Dashboard Section */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-white">Dashboard</h2>
                    <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-[#30363d] px-3 py-1.5 rounded-lg bg-[#21262d]">
                        <Settings className="w-3 h-3" />
                        Customize
                    </button>
                </div>

                {/* Work Orders Overview */}
                <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white">Work Orders Overview</h3>
                        <button className="text-slate-500 hover:text-white">
                            <ChevronRight className="w-4 h-4 rotate-[-45deg]" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">{total}</p>
                            <p className="text-xs text-slate-500 mt-1">Total</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-400">{active}</p>
                            <p className="text-xs text-slate-500 mt-1">Active</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-emerald-400">{completed}</p>
                            <p className="text-xs text-slate-500 mt-1">Completed</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Tasks Tab
const TasksTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Tasks</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No tasks assigned to you</p>
        </div>
    </div>
);

// Projects Tab
const ProjectsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Project Work</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No projects assigned to you</p>
        </div>
    </div>
);

// Requests Tab
const RequestsTab = ({ tickets = [], onTicketClick, userId, isLoading, propertyName, userName }: { tickets?: Ticket[], onTicketClick?: (id: string) => void, userId: string, isLoading: boolean, propertyName?: string, userName?: string }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Requests</h1>
            {propertyName && <span className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-[#161b22] px-3 py-1 rounded-full border border-[#21262d]">{propertyName}</span>}
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
            {isLoading ? (
                <div className="flex flex-col gap-2 py-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-[#0d1117] border border-[#21262d] rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-slate-500 text-sm">No requests found</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => onTicketClick?.(ticket.id)}
                            className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 hover:border-emerald-500/50 transition-colors group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-white truncate max-w-[400px]">{ticket.title}</h3>
                                    {ticket.assigned_to === userId ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Assigned to You
                                        </span>
                                    ) : ticket.assigned_to ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            Assigned to {ticket.assignee?.full_name || 'Staff'}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Unassigned / Incoming
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${ticket.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        ticket.priority === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {ticket.priority}
                                    </span>
                                    <button
                                        onClick={() => onTicketClick?.(ticket.id)}
                                        className="text-[10px] px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all font-bold uppercase tracking-widest"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{ticket.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Ticket className="w-3 h-3" />
                                    {ticket.ticket_number}
                                </span>
                                <span>•</span>
                                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className={`uppercase font-bold ${ticket.status === 'in_progress' ? 'text-blue-400' : ticket.status === 'assigned' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

// Alerts Tab
const AlertsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No alerts at this time</p>
        </div>
    </div>
);

// Visitors Tab
const VisitorsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Visitors</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <UsersRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Check-in and verify property visitors</p>
        </div>
    </div>
);

// Cafeteria Tab
const CafeteriaTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Cafeteria</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <Coffee className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Cafeteria management coming soon</p>
        </div>
    </div>
);

export default MstDashboard;
