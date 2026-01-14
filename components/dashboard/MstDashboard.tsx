'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle, Plus,
    LogOut, Bell, Settings, Search, UserCircle, Coffee, Fuel, UsersRound,
    ClipboardList, FolderKanban, Moon, Sun, ChevronRight, RefreshCw, Cog, X,
    AlertOctagon, BarChart3, FileText, Wrench, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { checkInResolver } from '@/utils/resolver';
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
    photo_before_url?: string;
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
    const [completedTickets, setCompletedTickets] = useState<Ticket[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (propertyId) {
            fetchPropertyDetails();
            fetchTickets();
            if (user?.id) {
                checkInResolver(user.id, propertyId);
            }
        }
    }, [propertyId, user?.id]);

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
            const active = (data || []).filter((t: any) => !['resolved', 'closed'].includes(t.status));
            const completed = (data || []).filter((t: any) => ['resolved', 'closed'].includes(t.status));
            setIncomingTickets(active);
            setCompletedTickets(completed);
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
        <div className="min-h-screen bg-background flex font-inter text-foreground dark">
            {/* Dark Sidebar */}
            <aside className="w-56 bg-sidebar flex flex-col fixed h-full z-10 border-r border-border">
                {/* Logo */}
                <div className="p-4 border-b border-[#21262d]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-text-inverse font-bold text-sm">
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
                                className="col-span-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d] transition-all"
                            >
                                <Plus className="w-3 h-3 text-primary" />
                                New Request
                            </button>
                            <button className="col-span-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d] transition-all">
                                <Cog className="w-3 h-3 text-primary" />
                                Manage Prop
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 overflow-y-auto">
                    {/* Daily Work */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-primary rounded-full" />
                            Daily Work
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'dashboard'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'tasks'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                My Tasks
                            </button>
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'projects'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <FolderKanban className="w-4 h-4" />
                                My Project Work
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'requests'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('alerts')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'alerts'
                                    ? 'bg-primary text-text-inverse'
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
                            <span className="w-0.5 h-2.5 bg-primary rounded-full" />
                            Operations
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse'
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
                                    ? 'bg-primary text-text-inverse'
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
                                    completedCount={completedTickets.length}
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
                                    activeTickets={incomingTickets}
                                    completedTickets={completedTickets}
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
                            {activeTab === 'diesel' && <DieselStaffDashboard isDark={true} />}
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

// Helper Sub-component for Ticket Row
const TicketRow = ({ ticket, onTicketClick, userId, isCompleted }: { ticket: Ticket, onTicketClick?: (id: string) => void, userId: string, isCompleted?: boolean }) => (
    <div
        onClick={() => onTicketClick?.(ticket.id)}
        className={`bg-[#0d1117] border border-[#21262d] rounded-lg p-3 hover:border-emerald-500/50 transition-colors group cursor-pointer ${isCompleted ? 'opacity-75 grayscale-[0.3]' : ''}`}
    >
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold truncate max-w-[400px] ${isCompleted ? 'text-slate-400 line-through decoration-slate-600' : 'text-white'}`}>{ticket.title}</h3>
                {ticket.assigned_to === userId ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-widest">
                        Your Task
                    </span>
                ) : ticket.assigned_to ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {ticket.assignee?.full_name || 'Assigned'}
                    </span>
                ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Unassigned
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
                    className={`text-[10px] px-3 py-1 rounded transition-all font-bold uppercase tracking-widest ${isCompleted ? 'bg-slate-700 text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                >
                    View
                </button>
            </div>
        </div>

        <div className="flex gap-4">
            {ticket.photo_before_url && (
                <div className="relative group/thumb shrink-0">
                    <img
                        src={ticket.photo_before_url}
                        alt="Before"
                        className="w-16 h-16 rounded-lg object-cover border border-[#30363d] group-hover/thumb:border-emerald-500 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 rounded-lg transition-opacity">
                        <Camera className="w-4 h-4 text-white" />
                    </div>
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{ticket.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500/60 font-medium">
                    <span className="flex items-center gap-1">
                        <Ticket className="w-3 h-3" />
                        {ticket.ticket_number}
                    </span>
                    <span>•</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={`uppercase font-bold ${isCompleted ? 'text-emerald-600/60' : ticket.status === 'in_progress' ? 'text-blue-400' : 'text-slate-500'}`}>
                        {ticket.status === 'closed' || ticket.status === 'resolved' ? 'COMPLETE' : ticket.status.replace('_', ' ')}
                    </span>
                    {ticket.photo_before_url && (
                        <span className="flex items-center gap-1 text-emerald-500 font-bold ml-auto bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            <Camera className="w-3 h-3" />
                            SEE SITE PHOTO
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// Dashboard Tab
const DashboardTab = ({ tickets, completedCount, onTicketClick, userId, isLoading, propertyId, propertyName, userName }: { tickets: Ticket[], completedCount: number, onTicketClick: (id: string) => void, userId: string, isLoading: boolean, propertyId: string, propertyName?: string, userName?: string }) => {
    const total = tickets.length + completedCount;
    const active = tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned' || t.status === 'open').length;
    const completed = completedCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Maintenance Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">{propertyName || 'Property'} • MST: {userName}</p>
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
                            <TicketRow key={ticket.id} userId={userId} ticket={ticket} onTicketClick={onTicketClick} />
                        ))
                    )}
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
const RequestsTab = ({ activeTickets = [], completedTickets = [], onTicketClick, userId, isLoading, propertyName, userName }: { activeTickets?: Ticket[], completedTickets?: Ticket[], onTicketClick?: (id: string) => void, userId: string, isLoading: boolean, propertyName?: string, userName?: string }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Requests</h1>
            {propertyName && <span className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-[#161b22] px-3 py-1 rounded-full border border-[#21262d]">{propertyName}</span>}
        </div>

        {/* Active Requests */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-400 mb-4 px-2 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Active Requests ({activeTickets.length})
            </h2>
            {isLoading ? (
                <div className="flex flex-col gap-2 py-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-[#0d1117] border border-[#21262d] rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : activeTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0d1117] rounded-xl border border-dashed border-[#21262d]">
                    <p className="text-slate-500 text-sm">No active requests</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {activeTickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} userId={userId} />
                    ))}
                </div>
            )}
        </div>

        {/* Completed Requests */}
        <div className="bg-[#161b22]/50 border border-[#21262d] rounded-xl p-5 opacity-90">
            <h2 className="text-sm font-bold text-slate-500 mb-4 px-2 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600/50" />
                Recently Completed ({completedTickets.length})
            </h2>
            <div className="flex flex-col gap-2">
                {completedTickets.slice(0, 10).map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} userId={userId} isCompleted />
                ))}
            </div>
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
