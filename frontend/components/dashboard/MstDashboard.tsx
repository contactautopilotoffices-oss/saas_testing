'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle, Plus,
    LogOut, Bell, Settings, Search, UserCircle, Coffee, Fuel, UsersRound,
    ClipboardList, FolderKanban, Moon, Sun, ChevronRight, Cog, X,
    AlertOctagon, BarChart3, FileText, Wrench, Camera, Menu, Pencil, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { useAuth } from '@/frontend/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { checkInResolver } from '@/frontend/utils/resolver';
import SignOutModal from '@/frontend/components/ui/SignOutModal';
import Image from 'next/image';
import DieselStaffDashboard from '@/frontend/components/diesel/DieselStaffDashboard';
import TenantTicketingDashboard from '@/frontend/components/tickets/TenantTicketingDashboard';
import { useTheme } from '@/frontend/context/ThemeContext';
import SettingsView from './SettingsView';
import VMSAdminDashboard from '@/frontend/components/vms/VMSAdminDashboard';
import { ShiftToast } from '@/frontend/components/mst/ShiftStatus';
import NavbarShiftStatus from '@/frontend/components/mst/NavbarShiftStatus';

// Types
type Tab = 'dashboard' | 'tasks' | 'projects' | 'requests' | 'create_request' | 'visitors' | 'diesel' | 'settings' | 'profile';

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
    raised_by?: string;
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
    const [userRole, setUserRole] = useState('MST Professional');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Modal State
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Shift Tracking State
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [isShiftLoading, setIsShiftLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error', visible: boolean }>({
        message: '',
        type: 'success',
        visible: false
    });

    const supabase = createClient();

    useEffect(() => {
        if (propertyId) {
            fetchPropertyDetails();
            fetchTickets();
            fetchUserRole();
            fetchShiftStatus();
            if (user?.id) {
                checkInResolver(user.id, propertyId);
            }
        }
    }, [propertyId, user?.id]);

    const fetchShiftStatus = async () => {
        if (!propertyId) return;
        try {
            const res = await fetch(`/api/mst/shift?propertyId=${propertyId}`);
            if (res.ok) {
                const data = await res.json();
                setIsCheckedIn(data.isCheckedIn);
            }
        } catch (error) {
            console.error('Failed to fetch shift status:', error);
        }
    };

    const handleShiftToggle = async () => {
        if (!propertyId) return;
        setIsShiftLoading(true);
        try {
            const action = isCheckedIn ? 'check-out' : 'check-in';
            const res = await fetch('/api/mst/shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, action })
            });

            if (res.ok) {
                const data = await res.json();
                setIsCheckedIn(data.isCheckedIn);
                showToast(data.message, 'success');
            } else {
                const err = await res.json();
                showToast(err.error || 'Operation failed', 'error');
            }
        } catch (error) {
            showToast('Network error occurred', 'error');
        } finally {
            setIsShiftLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const fetchUserRole = async () => {
        if (!user) return;
        const { data: member } = await supabase
            .from('property_memberships')
            .select('role')
            .eq('user_id', user.id)
            .eq('property_id', propertyId)
            .single();

        if (member) {
            setUserRole(member.role.replace('_', ' '));
        } else {
            // Check org membership if property not found
            const { data: orgMember } = await supabase
                .from('organization_memberships')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (orgMember) setUserRole(orgMember.role.replace('_', ' '));
        }
    };

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
        <div className="min-h-screen flex items-center justify-center bg-background">
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

    // Helper to change tab and close mobile sidebar
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setSidebarOpen(false);
    };

    const handleEditClick = (e: React.MouseEvent, ticket: Ticket) => {
        e.stopPropagation();
        setEditingTicket(ticket);
        setEditTitle(ticket.title);
        setEditDescription(ticket.description);
    };

    const handleUpdateTicket = async () => {
        if (!editingTicket || !editTitle.trim()) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/tickets/${editingTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    description: editDescription
                })
            });

            if (res.ok) {
                setEditingTicket(null);
                fetchTickets(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update ticket');
            }
        } catch (error) {
            console.error('Update ticket error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex font-inter text-text-primary">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`
                w-64 bg-sidebar flex flex-col h-screen z-50 transition-all duration-300
                fixed lg:sticky top-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 lg:hidden p-2 rounded-lg hover:bg-surface-elevated transition-colors"
                >
                    <X className="w-5 h-5 text-text-secondary" />
                </button>

                {/* Logo */}
                <div className="p-5 lg:p-6 pb-1">
                    <div className="flex flex-col items-center gap-1.5 mb-3">
                        <img src="/autopilot-logo-new.png" alt="Autopilot Logo" className="h-10 w-auto object-contain" />
                        <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.2em]">Maintenance Portal</p>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-3 relative">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Search features..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.length > 2) {
                                    const match = [
                                        { label: 'Overview', tab: 'dashboard' },
                                        { label: 'Requests', tab: 'requests' },
                                        { label: 'Tickets', tab: 'requests' },
                                        { label: 'Projects', tab: 'projects' },
                                        { label: 'Tasks', tab: 'tasks' },
                                        { label: 'Visitors', tab: 'visitors' },
                                        { label: 'Diesel Logger', tab: 'diesel' },
                                        { label: 'Settings', tab: 'settings' },
                                        { label: 'Profile', tab: 'profile' },
                                        { label: 'New Request', tab: 'create_request' }
                                    ].find(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()));
                                    if (match) {
                                        handleTabChange(match.tab as Tab);
                                        setSearchQuery('');
                                    }
                                }
                            }}
                            className="w-full pl-8 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Search Suggestions Dropdown */}
                    <AnimatePresence>
                        {searchQuery.length > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-3 right-3 mt-1 bg-card border border-border rounded-xl shadow-xl z-[70] overflow-hidden"
                            >
                                {[
                                    { label: 'Overview', tab: 'dashboard', icon: LayoutDashboard },
                                    { label: 'Requests', tab: 'requests', icon: Ticket },
                                    { label: 'Projects', tab: 'projects', icon: FolderKanban },
                                    { label: 'Visitors', tab: 'visitors', icon: UsersRound },
                                    { label: 'Diesel Logger', tab: 'diesel', icon: Fuel },
                                    { label: 'Settings', tab: 'settings', icon: Settings },
                                    { label: 'Profile', tab: 'profile', icon: UserCircle },
                                    { label: 'New Request', tab: 'create_request', icon: Plus },
                                ].filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                                    <button
                                        key={item.tab}
                                        onClick={() => {
                                            handleTabChange(item.tab as Tab);
                                            setSearchQuery('');
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors border-b last:border-0 border-border"
                                    >
                                        <item.icon className="w-4 h-4 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-text-primary">{item.label}</span>
                                            <span className="text-[9px] text-text-tertiary uppercase tracking-tighter">Navigate to Section</span>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Quick Actions */}
                <div className="px-3 pb-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Quick Actions</span>
                        <button onClick={() => setShowQuickActions(!showQuickActions)} className="text-text-tertiary hover:text-slate-300">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    {showQuickActions && (
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => handleTabChange('create_request')}
                                className="w-full flex items-center gap-2.5 px-3 py-2 bg-surface-elevated text-text-primary rounded-xl hover:bg-muted transition-all border border-border group shadow-sm"
                            >
                                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                    <Plus className="w-4 h-4 font-black" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">New Request</span>
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
                                onClick={() => handleTabChange('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'dashboard'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Overview
                            </button>
                            <button
                                onClick={() => handleTabChange('requests')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'requests'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                            <button
                                onClick={() => handleTabChange('tasks')}
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
                                onClick={() => handleTabChange('visitors')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitors
                            </button>
                            <button
                                onClick={() => handleTabChange('diesel')}
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
                                onClick={() => handleTabChange('settings')}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'settings'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => handleTabChange('profile')}
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
                        className="flex items-center gap-2 px-2.5 py-2 text-text-tertiary hover:text-red-400 rounded-lg w-full transition-colors text-[11px] font-bold uppercase tracking-wider"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:ml-0 flex flex-col min-h-screen bg-background">
                {/* Top Header */}
                <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 lg:hidden text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Shift Status in Navbar */}
                        <NavbarShiftStatus
                            isCheckedIn={isCheckedIn}
                            isLoading={isShiftLoading}
                            onToggle={handleShiftToggle}
                        />

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
                                    onEditClick={handleEditClick}
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
                                    onEditClick={handleEditClick}
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
                            {activeTab === 'visitors' && propertyId && (
                                <VMSAdminDashboard propertyId={propertyId} />
                            )}
                            {activeTab === 'diesel' && <DieselStaffDashboard isDark={isDarkMode} />}
                            {activeTab === 'settings' && <SettingsView />}
                            {activeTab === 'profile' && (
                                <div className="flex justify-center items-start py-8">
                                    <div className="bg-white border border-slate-100 rounded-3xl shadow-lg w-full max-w-md overflow-hidden">
                                        {/* Card Header with Autopilot Logo */}
                                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col items-center">
                                            {/* Autopilot Logo */}
                                            <div className="flex items-center justify-center mb-6">
                                                <img
                                                    src="/autopilot-logo-new.png"
                                                    alt="Autopilot Logo"
                                                    className="h-10 w-auto object-contain dark:invert transition-smooth"
                                                />
                                            </div>

                                            {/* User Avatar */}
                                            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4 overflow-hidden">
                                                {user?.user_metadata?.user_photo_url || user?.user_metadata?.avatar_url ? (
                                                    <Image
                                                        src={user.user_metadata.user_photo_url || user.user_metadata.avatar_url}
                                                        alt="Profile"
                                                        width={96}
                                                        height={96}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-4xl font-black text-white">
                                                        {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Role Badge */}
                                            <span className="px-4 py-1.5 bg-primary text-text-inverse rounded-full text-xs font-black uppercase tracking-wider">
                                                {userRole}
                                            </span>
                                        </div>

                                        {/* Card Body with User Info */}
                                        <div className="p-8 space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {user?.user_metadata?.full_name || 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {user?.user_metadata?.phone || 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {user?.email || 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</span>
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {property?.name || 'Not Assigned'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Email</span>
                                                    <span className="text-xs font-medium text-primary">
                                                        {user?.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div >

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            <ShiftToast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
            />

            {/* Edit Ticket Modal */}
            <AnimatePresence>
                {editingTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-display font-semibold text-slate-800">Edit Maintenance Request</h2>
                                    <button
                                        onClick={() => setEditingTicket(null)}
                                        className="p-2 hover:bg-muted rounded-full transition-smooth"
                                    >
                                        <X className="w-5 h-5 text-text-tertiary" />
                                    </button>
                                </div>
                                <p className="text-text-tertiary text-sm">Update the details of your service request.</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Request Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-primary transition-all font-bold text-slate-700"
                                        placeholder="Brief summary of the issue"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Detailed Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-primary transition-all font-medium text-slate-600 resize-none"
                                        placeholder="Please provide more details about your request..."
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 flex gap-4">
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTicket}
                                    disabled={isUpdating || !editTitle.trim()}
                                    className="flex-1 px-6 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:opacity-95 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

// Helper Sub-component for Ticket Row
const TicketRow = ({ ticket, onTicketClick, userId, isCompleted, onEditClick }: { ticket: Ticket, onTicketClick?: (id: string) => void, userId: string, isCompleted?: boolean, onEditClick?: (e: React.MouseEvent, t: Ticket) => void }) => (
    <div
        onClick={() => onTicketClick?.(ticket.id)}
        className={`bg-surface-elevated border rounded-lg p-3 transition-colors group cursor-pointer ${isCompleted ? 'opacity-75 grayscale-[0.3] border-border' : ticket.assigned_to === userId ? 'border-success ring-1 ring-success/20 shadow-md ring-offset-1 ring-offset-background' : 'border-border hover:border-primary/50 shadow-sm hover:shadow-md'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold truncate max-w-[300px] md:max-w-md ${isCompleted ? 'text-text-secondary line-through decoration-text-tertiary' : 'text-text-primary'}`}>{ticket.title}</h3>
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
            <div className="flex items-center gap-1.5">
                {ticket.priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${ticket.priority === 'high' ? 'bg-error/10 text-error border-error/20' :
                        ticket.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                            'bg-info/10 text-info border-info/20'
                        }`}>
                        {ticket.priority}
                    </span>
                )}

                {/* Edit Button - Only for user's own tickets */}
                {ticket.raised_by === userId && !isCompleted && onEditClick && (
                    <button
                        onClick={(e) => onEditClick(e, ticket)}
                        className="p-1 px-2 text-primary hover:bg-primary/10 rounded border border-primary/20 transition-smooth flex items-center gap-1.5"
                        title="Edit Request"
                    >
                        <Pencil className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
                    </button>
                )}

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
                    <span className={`uppercase font-bold ${isCompleted ? 'text-success/60' : ticket.status === 'in_progress' ? 'text-info' : ticket.assigned_to ? 'text-primary' : 'text-text-tertiary'}`}>
                        {ticket.status === 'closed' || ticket.status === 'resolved' ? 'COMPLETE' :
                            ticket.assigned_to && (ticket.status === 'waitlist' || ticket.status === 'open') ? 'ASSIGNED' :
                                ticket.status.replace('_', ' ')}
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
const DashboardTab = ({ tickets, completedCount, onTicketClick, userId, isLoading, propertyId, propertyName, userName, onSettingsClick, onEditClick }: { tickets: Ticket[], completedCount: number, onTicketClick: (id: string) => void, userId: string, isLoading: boolean, propertyId: string, propertyName?: string, userName?: string, onSettingsClick?: () => void, onEditClick?: (e: React.MouseEvent, t: Ticket) => void }) => {
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
                                <TicketRow key={ticket.id} userId={userId} ticket={ticket} onTicketClick={onTicketClick} onEditClick={onEditClick} />
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
const RequestsTab = ({ activeTickets = [], completedTickets = [], onTicketClick, userId, isLoading, propertyName, userName, onEditClick }: { activeTickets?: Ticket[], completedTickets?: Ticket[], onTicketClick?: (id: string) => void, userId: string, isLoading: boolean, propertyName?: string, userName?: string, onEditClick?: (e: React.MouseEvent, t: Ticket) => void }) => (
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
                            <TicketRow key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} userId={userId} onEditClick={onEditClick} />
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
