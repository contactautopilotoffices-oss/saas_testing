'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Bell, Settings, LogOut, Plus,
    CheckCircle2, Clock, MessageSquare, UsersRound, Coffee, UserCircle, Fuel,
    Calendar, Building2, Shield, ChevronRight, Sun, Moon, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselStaffDashboard from '@/components/diesel/DieselStaffDashboard';
import VMSAdminDashboard from '@/components/vms/VMSAdminDashboard';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';
import SettingsView from './SettingsView';

// Types
type Tab = 'overview' | 'requests' | 'visitors' | 'diesel' | 'settings' | 'profile';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
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

    // Removed navItems array as we'll use a hardcoded grouped sidebar

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-text-secondary font-bold">Loading your dashboard...</p>
            </div>
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
            {/* Mobile Menu Button - Fixed top left */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark transition-colors"
            >
                <Menu className="w-5 h-5" />
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
                        className="w-72 bg-white border-r border-border flex flex-col fixed h-full z-50 shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 pb-4">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-primary rounded-[var(--radius-md)] flex items-center justify-center text-text-inverse font-display font-semibold text-lg shadow-sm">
                                    {property?.name?.substring(0, 1) || 'T'}
                                </div>
                                <div>
                                    <h2 className="font-display font-semibold text-sm leading-tight text-text-primary truncate max-w-[160px]">{property?.name}</h2>
                                    <p className="text-[10px] text-text-tertiary font-body font-medium mt-1">Tenant Portal</p>
                                </div>
                            </div>

                            {/* Quick Action: New Request - Bold & Clear */}
                            <div className="mb-6">
                                <button
                                    onClick={() => { setActiveTab('requests'); setSidebarOpen(false); }}
                                    className="w-full flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white text-text-primary rounded-xl hover:bg-muted transition-all border-2 border-primary/20 group shadow-sm"
                                >
                                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Plus className="w-5 h-5 font-black" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center mt-1">New Request</span>
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
                                        onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'overview'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('requests'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'requests'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <Ticket className="w-4 h-4" />
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
                                        onClick={() => { setActiveTab('visitors'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'visitors'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <UsersRound className="w-4 h-4" />
                                        Visitor Management
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('diesel'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'diesel'
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
                            <div className="mb-6">
                                <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                                    <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                                    System & Personal
                                </p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-smooth font-bold text-sm ${activeTab === 'settings'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                            }`}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
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

                        <div className="pt-6 border-t border-border p-6">
                            {/* User Profile Section */}
                            <div className="flex items-center gap-3 px-2 mb-6">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                    {user?.email?.[0].toUpperCase() || 'T'}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-sm text-foreground truncate">
                                        {user?.user_metadata?.full_name || 'Tenant'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate font-medium">
                                        {user?.email}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSignOutModal(true)}
                                className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl w-full transition-all duration-200 text-sm font-bold group"
                            >
                                <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                Sign Out
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content - Full width since sidebar is hidden by default */}
            <main className="min-h-screen p-8 lg:p-12 pt-20 overflow-y-auto bg-white">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} property={property} />}
                        {activeTab === 'requests' && property && user && (
                            <TenantTicketingDashboard
                                propertyId={property.id}
                                organizationId={property.organization_id}
                                user={{ id: user.id, full_name: user.user_metadata?.full_name || 'Tenant' }}
                                propertyName={property.name}
                            />
                        )}
                        {activeTab === 'visitors' && <VMSAdminDashboard propertyId={propertyId} />}
                        {activeTab === 'diesel' && <DieselStaffDashboard isDark={false} />}
                        {activeTab === 'settings' && <SettingsView />}
                        {activeTab === 'profile' && (
                            <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-sm">
                                <UserCircle className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-text-primary mb-2">Profile</h3>
                                <p className="text-text-secondary">Update your profile information.</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />
        </div>
    );
};

// Overview Tab for Tenant - Dark Card-Based Interface
const OverviewTab = ({ onNavigate, property }: { onNavigate: (tab: Tab) => void, property: Property | null }) => {
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
        <div className="min-h-screen bg-white p-8">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-display font-semibold text-text-primary mb-2">
                        Welcome to AUTOPILOT, <span className="text-secondary">{user?.user_metadata?.full_name?.split(' ')[0] || 'Tenant'}</span>
                    </h1>
                    <p className="text-text-secondary font-body font-medium">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {/* Minimalist Top Profile Card - Primary Accent */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="premium-card px-5 py-3 flex items-center gap-4 border-primary/20 bg-primary/5">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                            {userInitial}
                        </div>
                        <div>
                            <p className="text-sm font-black text-text-primary uppercase tracking-wider">{user?.user_metadata?.full_name || 'Tenant'}</p>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Registered Tenant</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Helpdesk & Ticketing Card */}
                <button
                    onClick={() => onNavigate('requests')}
                    className="relative group kpi-card overflow-hidden text-left border-secondary/20"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>

                    {/* Badge */}
                    <div className="absolute top-4 right-4 w-8 h-8 bg-secondary/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-secondary/20">
                        <span className="text-secondary font-display font-semibold text-xs">{ticketCount.active}</span>
                    </div>

                    <div className="relative z-10">
                        <div className="w-14 h-14 kpi-icon flex items-center justify-center mb-6">
                            <MessageSquare className="w-7 h-7 text-secondary" />
                        </div>
                        <h3 className="text-2xl font-display font-semibold text-text-primary mb-2">Helpdesk & Ticketing</h3>
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2 font-body">Report issues, track requests & get support</p>
                        <div className="text-secondary text-xs font-display font-semibold tracking-wider">
                            • {ticketCount.active} Active • {ticketCount.completed} Completed
                        </div>
                    </div>
                </button>

                {/* Visitor Management Card */}
                <button
                    onClick={() => onNavigate('visitors')}
                    className="relative group kpi-card overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-14 h-14 kpi-icon flex items-center justify-center mb-6">
                            <UsersRound className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-2xl font-display font-semibold text-text-primary mb-2">Visitor Management</h3>
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2 font-body">Check-in visitors & manage access control</p>
                        <div className="text-primary text-xs font-display font-semibold tracking-wider">
                            {visitorCount} Active Visitors
                        </div>
                    </div>
                </button>

                {/* Room Bookings Card */}
                <button
                    onClick={() => alert('Room booking feature coming soon!')}
                    className="relative group kpi-card overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-14 h-14 kpi-icon flex items-center justify-center mb-6">
                            <Calendar className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-2xl font-display font-semibold text-text-primary mb-2">Room Bookings</h3>
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2 font-body">Reserve meeting spaces & conference rooms</p>
                        <div className="text-primary text-xs font-display font-semibold tracking-wider bg-primary/10 px-3 py-1 rounded-lg inline-block border border-primary/20">
                            Available Today
                        </div>
                    </div>
                </button>


            </div>
        </div>
    );
};

// Requests Tab for Tenant
const RequestsTab = () => {
    const requests = [
        { id: 4421, title: 'AC Not Cooling', status: 'in_progress', date: 'Today', priority: 'high' },
        { id: 4390, title: 'Tap Leakage', status: 'resolved', date: 'Yesterday', priority: 'medium' },
        { id: 4355, title: 'Door Lock Issue', status: 'resolved', date: '3 days ago', priority: 'low' },
        { id: 4320, title: 'Electrical Outlet', status: 'resolved', date: '1 week ago', priority: 'medium' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-text-primary">All Requests</h3>
                <button className="px-5 py-2.5 bg-primary text-text-inverse font-bold text-xs rounded-xl uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" />
                    New Request
                </button>
            </div>

            <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-surface-elevated border-b border-border">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Ticket</th>
                            <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Title</th>
                            <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-muted transition-colors cursor-pointer">
                                <td className="px-6 py-4 font-bold text-text-tertiary text-sm">#{req.id}</td>
                                <td className="px-6 py-4 font-bold text-text-primary text-sm">{req.title}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${req.status === 'in_progress' ? 'bg-info/10 text-info' : 'bg-success/10 text-success'}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-text-secondary">{req.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Community Tab for Tenant
const CommunityTab = () => {
    const updates = [
        { id: 1, icon: Bell, title: 'Elevator maintenance scheduled for Sunday 10AM-2PM.', time: '2 hours ago' },
        { id: 2, icon: Bell, title: 'New security protocol for visitor entry starts Monday.', time: 'Yesterday' },
        { id: 3, icon: Bell, title: 'Water supply will be interrupted on Saturday 8AM-12PM.', time: '3 days ago' },
    ];

    return (
        <div className="bg-card border border-border rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-black text-text-primary mb-6">Community Updates</h3>
            <div className="space-y-6">
                {updates.map((update) => (
                    <div key={update.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-elevated flex-shrink-0 flex items-center justify-center">
                            <update.icon className="w-5 h-5 text-text-tertiary" />
                        </div>
                        <div>
                            <p className="text-text-primary font-medium leading-tight">{update.title}</p>
                            <p className="text-text-tertiary text-xs mt-1 font-bold">{update.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TenantDashboard;
