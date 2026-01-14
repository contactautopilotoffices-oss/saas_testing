'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle, Plus,
    LogOut, Bell, Settings, Search, UserCircle, Coffee, Fuel, UsersRound,
    ClipboardList, FolderKanban, Moon, Sun, ChevronRight, RefreshCw, Cog, X,
    AlertOctagon, BarChart3, FileText, Wrench, Camera, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { checkInResolver } from '@/utils/resolver';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselStaffDashboard from '@/components/diesel/DieselStaffDashboard';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';
import { useTheme } from '@/context/ThemeContext';
import SettingsView from './SettingsView';
import { MstTicketDashboard } from '@/components/mst';

// Types
type Tab = 'dashboard' | 'my_work' | 'department' | 'tasks' | 'projects' | 'requests' | 'create_request' | 'visitors' | 'diesel' | 'settings' | 'profile';

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
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
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
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0f1419]' : 'bg-slate-50'}`}>
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-text-secondary font-medium">Loading maintenance portal...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-bold text-error">Error Loading Dashboard</h2>
                <p className="text-text-secondary mt-2">{errorMsg || 'Property not found.'}</p>
                <button onClick={() => router.back()} className="mt-4 text-primary font-bold hover:underline">Go Back</button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'} flex font-inter text-text-primary`}>
            {/* Sidebar */}
            <aside className={`w-64 ${isDarkMode ? 'bg-[#161b22]' : 'bg-white'} border-r border-border flex flex-col fixed h-full z-20 transition-all duration-500`}>
                {/* Logo */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-text-inverse font-bold text-sm">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-text-primary">AUTOPILOT</h2>
                            <p className="text-[10px] text-text-tertiary">Maintenance Portal</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Search features... (Ctr"
                            className="w-full pl-8 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Quick Actions</span>
                        <button onClick={() => setShowQuickActions(!showQuickActions)} className="text-text-tertiary hover:text-slate-300">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    {showQuickActions && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setActiveTab('create_request')}
                                className="col-span-1 flex flex-col items-center justify-center gap-1 p-2 bg-surface-elevated text-text-primary rounded-xl hover:bg-muted transition-all border border-border group"
                            >
                                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Plus className="w-4 h-4 font-black" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tight text-center">New Request</span>
                            </button>
                            <button className="col-span-1 flex flex-col items-center justify-center gap-1 p-2 bg-surface-elevated text-text-primary rounded-xl hover:bg-muted transition-all border border-border group cursor-not-allowed opacity-60">
                                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                    <Cog className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tight text-center">Manage Prop</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 overflow-y-auto">
                    {/* Daily Work */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-primary rounded-full" />
                            Daily Work
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'dashboard'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('my_work')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'my_work'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                My Work
                            </button>
                            <button
                                onClick={() => setActiveTab('department')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'department'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Layers className="w-4 h-4" />
                                Department
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'tasks'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <FolderKanban className="w-4 h-4" />
                                Projects
                            </button>
                        </div>
                    </div>

                    {/* Operations */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-primary rounded-full" />
                            Operations
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitors
                            </button>
                            <button
                                onClick={() => setActiveTab('diesel')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'diesel'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Fuel className="w-4 h-4" />
                                Diesel Logger
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-primary rounded-full" />
                            System & Personal
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'settings'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'profile'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4" />
                                Profile
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-border p-3">
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-2 px-2 py-2 text-text-tertiary hover:text-red-400 rounded-lg w-full transition-colors text-xs font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 ml-64 flex flex-col min-h-screen ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
                {/* Top Header */}
                <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchTickets}
                            className="text-xs text-text-secondary hover:text-text-primary border border-border px-3 py-1.5 rounded-md bg-white hover:bg-slate-50"
                        >
                            <RefreshCw className="w-3 h-3 inline mr-1.5" />
                            Refresh page
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-text-tertiary hover:text-text-primary transition-colors">
                            <Bell className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-text-tertiary hover:text-text-primary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 pl-3 border-l border-border">
                            <span className="text-xs text-text-secondary font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
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
                                    onSettingsClick={() => setActiveTab('settings')}
                                />
                            )}
                            {activeTab === 'my_work' && property && user && (
                                <MstTicketDashboard
                                    propertyId={propertyId}
                                    userId={user.id}
                                    propertyName={property.name}
                                    userName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff'}
                                />
                            )}
                            {activeTab === 'department' && property && user && (
                                <MstTicketDashboard
                                    propertyId={propertyId}
                                    userId={user.id}
                                    propertyName={property.name}
                                    userName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff'}
                                />
                            )}
                            {activeTab === 'tasks' && <ProjectsTab />}
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
                            {activeTab === 'visitors' && <VisitorsTab />}
                            {activeTab === 'diesel' && <DieselStaffDashboard isDark={isDarkMode} />}
                            {activeTab === 'settings' && <SettingsView />}
                            {activeTab === 'profile' && (
                                <div className="bg-white border border-border rounded-3xl p-12 text-center shadow-sm">
                                    <UserCircle className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-text-primary mb-2">Profile</h3>
                                    <p className="text-text-secondary">Update your MST account details here.</p>
                                </div>
                            )}
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
        className={`bg-surface-elevated border rounded-lg p-3 transition-colors group cursor-pointer ${isCompleted ? 'opacity-75 grayscale-[0.3] border-border' : ticket.assigned_to === userId ? 'border-success ring-1 ring-success/20 shadow-md ring-offset-1 ring-offset-background' : 'border-border hover:border-primary/50 shadow-sm hover:shadow-md'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold truncate max-w-[400px] ${isCompleted ? 'text-text-secondary line-through decoration-text-tertiary' : 'text-text-primary'}`}>{ticket.title}</h3>
                {ticket.assigned_to === userId ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-success text-text-inverse font-black uppercase tracking-tighter shadow-sm">
                        YOUR TASK
                    </span>
                ) : ticket.assigned_to ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20">
                        {ticket.assignee?.full_name || 'Assigned'}
                    </span>
                ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                        Unassigned
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${ticket.priority === 'high' ? 'bg-error/10 text-error border-error/20' :
                    ticket.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-info/10 text-info border-info/20'
                    }`}>
                    {ticket.priority}
                </span>
                <button
                    className={`text-[10px] px-3 py-1 rounded transition-all font-bold uppercase tracking-widest ${isCompleted ? 'bg-muted text-text-tertiary shadow-none' : 'bg-primary text-text-inverse hover:shadow-lg shadow-primary/20'}`}
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
                        className="w-16 h-16 rounded-lg object-cover border border-border group-hover/thumb:border-emerald-500 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 rounded-lg transition-opacity">
                        <Camera className="w-4 h-4 text-text-primary" />
                    </div>
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-text-tertiary line-clamp-2 mb-2">{ticket.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-tertiary/60 font-medium">
                    <span className="flex items-center gap-1">
                        <Ticket className="w-3 h-3" />
                        {ticket.ticket_number}
                    </span>
                    <span>•</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={`uppercase font-bold ${isCompleted ? 'text-success/60' : ticket.status === 'in_progress' ? 'text-info' : 'text-text-tertiary'}`}>
                        {ticket.status === 'closed' || ticket.status === 'resolved' ? 'COMPLETE' : ticket.status.replace('_', ' ')}
                    </span>
                    {ticket.photo_before_url && (
                        <span className="flex items-center gap-1 text-primary font-bold ml-auto bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
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
const DashboardTab = ({ tickets, completedCount, onTicketClick, userId, isLoading, propertyId, propertyName, userName, onSettingsClick }: { tickets: Ticket[], completedCount: number, onTicketClick: (id: string) => void, userId: string, isLoading: boolean, propertyId: string, propertyName?: string, userName?: string, onSettingsClick?: () => void }) => {
    const total = tickets.length + completedCount;
    const active = tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned' || t.status === 'open').length;
    const completed = completedCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary">Maintenance Dashboard</h1>
                <p className="text-text-tertiary text-sm mt-1">{propertyName || 'Property'} • MST: {userName}</p>
            </div>

            {/* Dashboard Section */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-text-primary">Dashboard</h2>
                    <button
                        onClick={onSettingsClick}
                        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary border border-border px-3 py-1.5 rounded-lg bg-surface-elevated transition-colors">
                        <Settings className="w-3 h-3" />
                        Customize
                    </button>
                </div>

                {/* Work Orders Overview */}
                <div className="bg-surface-elevated border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-text-primary">Work Orders Overview</h3>
                        <button className="text-text-tertiary hover:text-text-primary">
                            <ChevronRight className="w-4 h-4 rotate-[-45deg]" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-text-primary">{total}</p>
                            <p className="text-xs text-text-tertiary mt-1">Total</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-info">{active}</p>
                            <p className="text-xs text-text-tertiary mt-1">Active</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-success">{completed}</p>
                            <p className="text-xs text-text-tertiary mt-1">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Property Requests */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-base font-bold text-text-primary">Property Requests</h2>
                    <p className="text-xs text-text-tertiary">All requests for this property</p>
                </div>
                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        <div className="flex flex-col gap-2 py-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-surface-elevated border border-border rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">
                            No requests found
                        </div>
                    ) : (
                        [...tickets]
                            .sort((a, b) => {
                                if (a.assigned_to === userId && b.assigned_to !== userId) return -1;
                                if (a.assigned_to !== userId && b.assigned_to === userId) return 1;
                                return 0;
                            })
                            .map((ticket) => (
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
        <h1 className="text-2xl font-bold text-text-primary">My Tasks</h1>
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <ClipboardList className="w-12 h-12 text-text-tertiary/40 mx-auto mb-3" />
            <p className="text-text-tertiary text-sm">No tasks assigned to you</p>
        </div>
    </div>
);

// Projects Tab
const ProjectsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">My Project Work</h1>
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <FolderKanban className="w-12 h-12 text-text-tertiary/40 mx-auto mb-3" />
            <p className="text-text-tertiary text-sm">No projects assigned to you</p>
        </div>
    </div>
);

// Requests Tab
const RequestsTab = ({ activeTickets = [], completedTickets = [], onTicketClick, userId, isLoading, propertyName, userName }: { activeTickets?: Ticket[], completedTickets?: Ticket[], onTicketClick?: (id: string) => void, userId: string, isLoading: boolean, propertyName?: string, userName?: string }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">Requests</h1>
            {propertyName && <span className="text-xs text-text-tertiary font-bold uppercase tracking-widest bg-surface-elevated px-3 py-1 rounded-full border border-border">{propertyName}</span>}
        </div>

        {/* Active Requests */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-text-secondary mb-4 px-2 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-success" />
                Active Requests ({activeTickets.length})
            </h2>
            {isLoading ? (
                <div className="flex flex-col gap-2 py-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-surface-elevated border border-border rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : activeTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-muted rounded-xl border border-dashed border-border">
                    <p className="text-text-tertiary text-sm">No active requests</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {[...activeTickets]
                        .sort((a, b) => {
                            if (a.assigned_to === userId && b.assigned_to !== userId) return -1;
                            if (a.assigned_to !== userId && b.assigned_to === userId) return 1;
                            return 0;
                        })
                        .map((ticket) => (
                            <TicketRow key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} userId={userId} />
                        ))}
                </div>
            )}
        </div>

        {/* Completed Requests */}
        <div className="bg-muted border border-border rounded-xl p-5 opacity-90">
            <h2 className="text-sm font-bold text-text-tertiary mb-4 px-2 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success/50" />
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





// Visitors Tab
const VisitorsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Visitors</h1>
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <UsersRound className="w-12 h-12 text-text-tertiary/40 mx-auto mb-3" />
            <p className="text-text-tertiary text-sm">Check-in and verify property visitors</p>
        </div>
    </div>
);



export default MstDashboard;
