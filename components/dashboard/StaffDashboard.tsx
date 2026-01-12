'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle, Plus,
    LogOut, Bell, Settings, Search, UserCircle, Coffee, Fuel, UsersRound,
    ClipboardList, FolderKanban, Moon, Sun, ChevronRight, RefreshCw, Cog, X,
    AlertOctagon, BarChart3, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselStaffDashboard from '@/components/diesel/DieselStaffDashboard';
import VMSAdminDashboard from '@/components/vms/VMSAdminDashboard';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';
import { useTheme } from '@/context/ThemeContext';

// Types
type Tab = 'dashboard' | 'tasks' | 'projects' | 'requests' | 'alerts' | 'visitors' | 'diesel' | 'cafeteria' | 'settings';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
}

const StaffDashboard = () => {
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
    const [showQuickActions, setShowQuickActions] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        if (propertyId) {
            fetchPropertyDetails();
        }
    }, [propertyId]);

    const fetchPropertyDetails = async () => {
        setIsLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .maybeSingle();

        if (error || !data) {
            setErrorMsg('Property not found.');
        } else {
            setProperty(data);
        }
        setIsLoading(false);
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-muted border-t-brand-orange rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">Loading staff dashboard...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-bold text-red-400">Error Loading Dashboard</h2>
                <p className="text-muted-foreground mt-2">{errorMsg || 'Property not found.'}</p>
                <button onClick={() => router.back()} className="mt-4 text-brand-orange font-bold hover:underline">Go Back</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex font-inter text-foreground">
            {/* Dark Sidebar */}
            <aside className="w-56 bg-sidebar flex flex-col fixed h-full z-10 border-r border-border">
                {/* Logo */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            SP
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-white">AUTOPILOT</h2>
                            <p className="text-[10px] text-slate-500">Staff Portal</p>
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
                            className="w-full pl-8 pr-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
                                onClick={() => setActiveTab('requests')}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <Plus className="w-3 h-3" />
                                New Request
                            </button>
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <Cog className="w-3 h-3" />
                                Manage Visitors
                            </button>
                            <button
                                onClick={() => alert('URGENT: Emergency SOS Signal Broadcasted to all Staff.')}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <AlertOctagon className="w-3 h-3" />
                                Emergency
                            </button>
                            <button
                                onClick={() => setActiveTab('diesel')}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <FileText className="w-3 h-3" />
                                Quick Report
                            </button>
                            <button
                                onClick={() => alert('System Health: 100% Operational. All nodes synced.')}
                                className="col-span-2 flex items-center gap-1.5 px-2 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-[10px] text-slate-300 border border-[#30363d]"
                            >
                                <BarChart3 className="w-3 h-3" />
                                System Status
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 overflow-y-auto">
                    {/* Daily Work */}
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                            <span className="w-0.5 h-2.5 bg-blue-500 rounded-full" />
                            Daily Work
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'dashboard'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'tasks'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'
                                    }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                My Tasks
                            </button>
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'projects'
                                    ? 'bg-brand-orange text-white'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <FolderKanban className="w-4 h-4" />
                                My Project Work
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'requests'
                                    ? 'bg-brand-orange text-white'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('alerts')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'alerts'
                                    ? 'bg-brand-orange text-white'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                            <span className="w-0.5 h-2.5 bg-blue-500 rounded-full" />
                            Operations
                        </p>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium ${activeTab === 'visitors'
                                    ? 'bg-brand-orange text-white'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                                    ? 'bg-brand-orange text-white'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-border p-3 space-y-1">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-2.5 py-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg w-full transition-colors text-xs font-medium"
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon className="w-4 h-4" />
                                <span>Dark Mode</span>
                            </>
                        ) : (
                            <>
                                <Sun className="w-4 h-4" />
                                <span>Light Mode</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-2 px-2.5 py-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg w-full transition-colors text-xs font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-56 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-md bg-muted transition-colors">
                            <RefreshCw className="w-3 h-3 inline mr-1.5" />
                            Refresh page
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-64 pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange"
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
                            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <span className="text-xs text-slate-400">{user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>
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
                            {activeTab === 'dashboard' && <DashboardTab />}
                            {activeTab === 'tasks' && <TasksTab />}
                            {activeTab === 'projects' && <ProjectsTab />}
                            {activeTab === 'requests' && property && user && (
                                <TenantTicketingDashboard
                                    propertyId={property.id}
                                    organizationId={property.organization_id}
                                    user={{ id: user.id, full_name: user.user_metadata?.full_name || 'Staff' }}
                                    propertyName={property.name}
                                />
                            )}
                            {activeTab === 'alerts' && <AlertsTab />}
                            {activeTab === 'visitors' && <VMSAdminDashboard propertyId={propertyId} />}
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
const DashboardTab = () => (
    <div className="space-y-6">
        {/* Header */}
        <div>
            <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Monitor and manage facility operations</p>
        </div>

        {/* Incoming Requests */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
            <div className="mb-4">
                <h2 className="text-base font-bold text-white">Incoming Requests</h2>
                <p className="text-xs text-slate-500">Tasks available for you to accept</p>
            </div>
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                No incoming requests
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

            {/* Requests Overview */}
            <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Requests Overview</h3>
                    <button className="text-slate-500 hover:text-white">
                        <ChevronRight className="w-4 h-4 rotate-[-45deg]" />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-white">0</p>
                        <p className="text-xs text-slate-500 mt-1">Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-blue-400">0</p>
                        <p className="text-xs text-slate-500 mt-1">Active</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-emerald-400">0</p>
                        <p className="text-xs text-slate-500 mt-1">Completed</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

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
const RequestsTab = () => (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Requests</h1>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-12 text-center">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No requests found</p>
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

export default StaffDashboard;
