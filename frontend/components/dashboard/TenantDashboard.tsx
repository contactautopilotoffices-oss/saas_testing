'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
    LayoutDashboard, Ticket as TicketIcon, Settings, LogOut, Plus,
    CheckCircle2, Clock, MessageSquare, UsersRound, Coffee, UserCircle,
    Calendar, Building2, Shield, ChevronRight, Sun, Moon, Menu, X, Camera, Pencil, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { useAuth } from '@/frontend/context/AuthContext';
import { useTheme } from '@/frontend/context/ThemeContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import SignOutModal from '@/frontend/components/ui/SignOutModal';
import DieselStaffDashboard from '@/frontend/components/diesel/DieselStaffDashboard';
import VMSAdminDashboard from '@/frontend/components/vms/VMSAdminDashboard';
import TenantTicketingDashboard from '@/frontend/components/tickets/TenantTicketingDashboard';
import SettingsView from './SettingsView';
import Loader from '@/frontend/components/ui/Loader';

// Types
type Tab = 'overview' | 'requests' | 'create_request' | 'visitors' | 'settings' | 'profile';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
}

interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    photo_before_url?: string;
    raised_by?: string;
}

const TenantDashboard = () => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const params = useParams();
    const router = useRouter();
    const propertyId = params?.propertyId as string;

    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
    const [completedTickets, setCompletedTickets] = useState<Ticket[]>([]);
    const [isFetchingTickets, setIsFetchingTickets] = useState(false);

    // Edit Modal State
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const searchParams = useSearchParams();

    // Sync activeTab with URL
    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`?${params.toString()}`);
    };

    const supabase = useMemo(() => createClient(), []);

    // Refs to prevent duplicate fetches
    const hasFetchedProperty = useRef(false);
    const hasFetchedTickets = useRef(false);

    useEffect(() => {
        if (propertyId && !hasFetchedProperty.current) {
            hasFetchedProperty.current = true;
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

    const fetchTickets = async () => {
        if (!user || !propertyId) return;
        setIsFetchingTickets(true);

        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('property_id', propertyId)
            .eq('raised_by', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const active = data.filter((t: any) => !['resolved', 'closed'].includes(t.status));
            const completed = data.filter((t: any) => ['resolved', 'closed'].includes(t.status));
            setActiveTickets(active);
            setCompletedTickets(completed);
        }
        setIsFetchingTickets(false);
    };

    useEffect(() => {
        if (propertyId && user && !hasFetchedTickets.current) {
            hasFetchedTickets.current = true;
            fetchTickets();
        }
    }, [propertyId, user?.id]);

    // Removed navItems array as we'll use a hardcoded grouped sidebar

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

    const handleEditClick = (e: React.MouseEvent, ticket: Ticket) => {
        e.stopPropagation();
        setEditingTicket(ticket);
        setEditTitle(ticket.title);
        setEditDescription(ticket.description);
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader size="lg" text="Loading your dashboard..." />
        </div>
    );

    if (!property) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-error">Error Loading Dashboard</h2>
            <p className="text-text-secondary mt-2">{errorMsg || 'Property not found.'}</p>
            <button onClick={() => router.back()} className="mt-4 text-primary font-bold hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter text-text-primary">

            {/* Mobile Menu Button - Fixed position */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-6 left-6 z-50 p-2.5 bg-slate-900 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group"
                aria-label="Open navigation menu"
            >
                <Menu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>

            {/* Overlay when sidebar is open */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar - Slides in from left */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-border flex flex-col z-50 shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-5 lg:p-6 pb-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-primary rounded-[var(--radius-md)] flex items-center justify-center text-text-inverse font-display font-semibold text-lg shadow-sm">
                                    {property?.name?.substring(0, 1) || 'T'}
                                </div>
                                <div>
                                    <h2 className="font-display font-semibold text-sm leading-tight text-text-primary truncate max-w-[140px]">{property?.name}</h2>
                                    <p className="text-[10px] text-text-tertiary font-body font-medium mt-0.5">Tenant Portal</p>
                                </div>
                            </div>

                            {/* Quick Action: New Request - Compact */}
                            <div className="mb-4">
                                <button
                                    onClick={() => { handleTabChange('create_request'); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white text-text-primary rounded-xl hover:bg-muted transition-all border border-primary/20 group shadow-sm"
                                >
                                    <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                        <Plus className="w-4 h-4 font-black" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">New Request</span>
                                </button>
                            </div>
                        </div>

                        <nav className="flex-1 px-4 overflow-y-auto">
                            {/* Core Operations */}
                            <div className="mb-6">
                                <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                                    <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                                    Core Operations
                                </p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { handleTabChange('overview'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'overview'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => { handleTabChange('requests'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'requests'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <TicketIcon className="w-4 h-4" />
                                        My Requests
                                    </button>
                                </div>
                            </div>

                            {/* Management Hub */}
                            <div className="mb-6">
                                <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                                    <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                                    Management Hub
                                </p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { handleTabChange('visitors'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'visitors'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <UsersRound className="w-4 h-4" />
                                        Visitor Management
                                    </button>

                                </div>
                            </div>

                            {/* System & Personal */}
                            <div className="mb-6">
                                <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                                    <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                                    System & Personal
                                </p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { handleTabChange('settings'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'settings'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => { handleTabChange('profile'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'profile'
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

                        <div className="pt-3 border-t border-border px-4 pb-3">
                            {/* User Profile Section */}
                            <div className="flex items-center gap-2 px-1 mb-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                    {user?.email?.[0].toUpperCase() || 'T'}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-xs text-foreground truncate">
                                        {user?.user_metadata?.full_name || 'Tenant'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground truncate font-medium">
                                        {user?.email}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSignOutModal(true)}
                                className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg w-full transition-all duration-200 text-xs font-bold group"
                            >
                                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                Sign Out
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen bg-[#fafafa]">
                <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-20 pt-24 pb-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {activeTab === 'overview' && <OverviewTab onNavigate={handleTabChange} property={property} onMenuToggle={() => setSidebarOpen(true)} />}
                            {activeTab === 'requests' && property && user && (
                                <RequestsTab
                                    activeTickets={activeTickets}
                                    completedTickets={completedTickets}
                                    onNavigate={handleTabChange}
                                    isLoading={isFetchingTickets}
                                    onEditClick={handleEditClick}
                                />
                            )}
                            {activeTab === 'create_request' && property && user && (
                                <TenantTicketingDashboard
                                    propertyId={property.id}
                                    organizationId={property.organization_id}
                                    user={{ id: user.id, full_name: user.user_metadata?.full_name || 'Tenant' }}
                                    propertyName={property.name}
                                />
                            )}
                            {activeTab === 'visitors' && <VMSAdminDashboard propertyId={propertyId} />}

                            {activeTab === 'settings' && <SettingsView />}
                            {activeTab === 'profile' && (
                                <div className="flex justify-center items-start py-8">
                                    <div className="bg-white border border-slate-100 rounded-3xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                                        {/* Card Header with Autopilot Logo */}
                                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col items-center">
                                            {/* Autopilot Logo */}
                                            <div className="flex items-center justify-center mb-6 font-display">
                                                <img
                                                    src="/autopilot-logo-new.png"
                                                    alt="Autopilot Logo"
                                                    className="h-10 w-auto object-contain invert mix-blend-screen"
                                                />
                                            </div>

                                            {/* User Avatar */}
                                            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4 overflow-hidden shadow-xl">
                                                {user?.user_metadata?.user_photo_url || user?.user_metadata?.avatar_url ? (
                                                    <NextImage
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
                                            <span className="px-4 py-1.5 bg-primary text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                                                Registered Tenant
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
                                                        {property?.name || 'Not Set'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-center">
                                                <button
                                                    onClick={() => handleTabChange('settings')}
                                                    className="px-8 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all w-full"
                                                >
                                                    Edit Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {/* Edit Request Modal */}
            <AnimatePresence>
                {editingTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[9998] p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-display font-semibold text-lg text-slate-800">Edit Request</h3>
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-900"
                                        placeholder="Brief title of the issue"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-900 min-h-[120px] resize-none"
                                        placeholder="Detailed description..."
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTicket}
                                    disabled={isUpdating}
                                    className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

// Overview Tab for Tenant - Dark Card-Based Interface
const OverviewTab = ({ onNavigate, property, onMenuToggle }: { onNavigate: (tab: Tab) => void, property: Property | null, onMenuToggle?: () => void }) => {
    const { user } = useAuth();
    const params = useParams();
    const [ticketCount, setTicketCount] = useState({ active: 0, completed: 0 });
    const [visitorCount, setVisitorCount] = useState(0);
    const propertyId = params?.propertyId as string;
    const supabase = createClient();

    useEffect(() => {
        const fetchCounts = async () => {
            if (!user?.id || !propertyId) return;

            // Fetch Ticket Counts
            const { data: tickets } = await supabase
                .from('tickets')
                .select('status')
                .eq('property_id', propertyId)
                .eq('raised_by', user.id);

            if (tickets) {
                const active = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;
                const completed = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
                setTicketCount({ active, completed });
            }

            // Fetch Active Visitor Count
            if (user?.user_metadata?.full_name) {
                const { data: visitors } = await supabase
                    .from('visitor_logs')
                    .select('id')
                    .eq('property_id', propertyId)
                    .eq('status', 'checked_in')
                    .eq('whom_to_meet', user.user_metadata.full_name);

                if (visitors) {
                    setVisitorCount(visitors.length);
                }
            }
        };
        fetchCounts();
    }, [user?.id, user?.user_metadata?.full_name, propertyId]);

    const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U';

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-100/50">
                <div className="flex items-center gap-4">
                    {/* Desktop Menu Toggle (Optional but fits the pattern) */}
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-800 tracking-tight">
                            Welcome to AUTOPILOT, <span className="text-secondary opacity-80">{user?.user_metadata?.full_name?.split(' ')[0] || 'Member'}</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Minimalist Top Profile Card - Floating Capsule Style */}
                <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-3xl p-2.5 pr-6 shadow-sm shadow-slate-200/50">
                    <div className="w-12 h-12 bg-slate-400 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {userInitial}
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">
                            {user?.user_metadata?.full_name || 'Tenant'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] leading-none">
                            Registered Tenant
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Helpdesk & Ticketing Card */}
                <button
                    onClick={() => onNavigate('requests')}
                    className="relative group bg-white border border-slate-100 rounded-[3rem] p-12 text-left transition-all hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 min-h-[400px] flex flex-col"
                >
                    {/* Badge */}
                    <div className="absolute top-6 right-6 w-9 h-9 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <span className="text-slate-400 font-bold text-xs">{ticketCount.active}</span>
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 border border-slate-100 group-hover:bg-secondary group-hover:text-white transition-all">
                            <MessageSquare className="w-10 h-10 text-slate-300 group-hover:text-white" />
                        </div>
                        <h3 className="text-3xl font-display font-semibold text-slate-800 mb-4">Helpdesk & Ticketing</h3>
                        <p className="text-slate-500 text-base mb-8 leading-relaxed">Report issues, track requests & get support instantly.</p>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
                            • {ticketCount.active} Active • {ticketCount.completed} Completed
                        </div>
                    </div>
                </button>

                {/* Visitor Management Card */}
                <button
                    onClick={() => onNavigate('visitors')}
                    className="relative group bg-white border border-slate-100 rounded-[3rem] p-12 text-left transition-all hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 min-h-[400px] flex flex-col"
                >
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                            <UsersRound className="w-10 h-10 text-slate-300 group-hover:text-white" />
                        </div>
                        <h3 className="text-3xl font-display font-semibold text-slate-800 mb-4">Visitor Management</h3>
                        <p className="text-slate-500 text-base mb-8 leading-relaxed">Check-in visitors & manage building access control.</p>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            • {visitorCount} Active Visitors
                        </div>
                    </div>
                </button>

                {/* Room Bookings Card */}
                <button
                    onClick={() => alert('Room booking feature coming soon!')}
                    className="relative group bg-white border border-slate-100 rounded-[3rem] p-12 text-left transition-all hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 min-h-[400px] flex flex-col"
                >
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <Calendar className="w-10 h-10 text-slate-300 group-hover:text-white" />
                        </div>
                        <h3 className="text-3xl font-display font-semibold text-slate-800 mb-4">Room Bookings</h3>
                        <p className="text-slate-500 text-base mb-8 leading-relaxed">Reserve meeting spaces & conference rooms with ease.</p>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full inline-block border border-slate-100">
                            Available Today
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

// Helper Sub-component for Ticket Row (MST Style)
const TicketRow = ({ ticket, onTicketClick, isCompleted, onEditClick, currentUserId }: { ticket: Ticket, onTicketClick?: (id: string) => void, isCompleted?: boolean, onEditClick?: (e: React.MouseEvent, t: Ticket) => void, currentUserId?: string }) => (
    <div
        onClick={() => onTicketClick?.(ticket.id)}
        className={`bg-white border rounded-2xl p-5 transition-all group cursor-pointer ${isCompleted ? 'opacity-75 grayscale-[0.3] border-slate-200' : 'border-slate-100 hover:border-primary/50 shadow-sm hover:shadow-md'}`}
    >
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${isCompleted ? 'bg-slate-100' : 'bg-primary/10'} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                    <MessageSquare className={`w-6 h-6 ${isCompleted ? 'text-slate-400' : 'text-primary'}`} />
                </div>
                <div>
                    <h3 className={`text-lg font-bold truncate max-w-[300px] md:max-w-md ${isCompleted ? 'text-slate-500' : 'text-slate-900'} transition-colors group-hover:text-primary`}>{ticket.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{ticket.ticket_number}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border ${ticket.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    ticket.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                    {ticket.priority}
                </span>

                {/* Edit Button - Only for user's own tickets */}
                {ticket.raised_by === currentUserId && !isCompleted && onEditClick && (
                    <button
                        onClick={(e) => onEditClick(e, ticket)}
                        className="p-2 px-4 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/10 transition-smooth flex items-center gap-2"
                        title="Edit Request"
                    >
                        <Pencil className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                    </button>
                )}

                <button
                    className={`text-[11px] font-black px-5 py-2 rounded-xl transition-all uppercase tracking-widest ${isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-black'}`}
                >
                    View
                </button>
            </div>
        </div>

        <div className="flex gap-5">
            {ticket.photo_before_url && (
                <div className="relative group/thumb shrink-0">
                    <img
                        src={ticket.photo_before_url}
                        alt="Before"
                        className="w-20 h-20 rounded-xl object-cover border border-slate-100 group-hover/thumb:border-primary transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 rounded-xl transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${isCompleted ? 'text-slate-400' : 'text-slate-600'} line-clamp-2 leading-relaxed`}>{ticket.description}</p>
                <div className="mt-4 flex items-center gap-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {ticket.status.replace('_', ' ')}
                    </span>
                    {ticket.photo_before_url && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest">
                            <Camera className="w-3.5 h-3.5" />
                            Evidence Logged
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// Requests Tab for Tenant
const RequestsTab = ({ activeTickets, completedTickets, onNavigate, isLoading, onEditClick }: { activeTickets: Ticket[], completedTickets: Ticket[], onNavigate: (tab: Tab) => void, isLoading: boolean, onEditClick?: (e: React.MouseEvent, t: Ticket) => void }) => {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-display font-semibold text-slate-900 tracking-tight">Support Requests</h2>
                    <p className="text-slate-500 font-medium mt-1">Track and manage your facility assistance tickets.</p>
                </div>
                <button
                    onClick={() => onNavigate('create_request')}
                    className="px-8 py-3.5 bg-primary text-white font-black text-xs rounded-2xl uppercase tracking-[0.15em] hover:opacity-95 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    New Request
                </button>
            </div>

            {/* Active Requests */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Requests ({activeTickets.length})</h3>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 bg-slate-50 rounded-3xl animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : activeTickets.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <TicketIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">No active requests</h4>
                        <p className="text-slate-500 max-w-xs mx-auto">You don't have any requests in progress at the moment.</p>
                        <button
                            onClick={() => onNavigate('create_request')}
                            className="mt-8 text-primary font-black text-[10px] uppercase tracking-widest hover:underline"
                        >
                            Create your first request
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {activeTickets.map(ticket => (
                            <TicketRow
                                key={ticket.id}
                                ticket={ticket}
                                onTicketClick={(id) => router.push(`/tickets/${id}?from=requests`)}
                                onEditClick={onEditClick}
                                currentUserId={user?.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Completed Requests */}
            {completedTickets.length > 0 && (
                <div className="space-y-4 pt-8">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recently Resolved ({completedTickets.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {completedTickets.map(ticket => (
                            <TicketRow
                                key={ticket.id}
                                ticket={ticket}
                                isCompleted
                                onTicketClick={(id) => router.push(`/tickets/${id}?from=requests`)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



export default TenantDashboard;
