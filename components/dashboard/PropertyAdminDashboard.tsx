'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Ticket, Settings, UserCircle, UsersRound,
    Search, Plus, Filter, Bell, LogOut, ChevronRight, MapPin, Building2,
    Calendar, CheckCircle2, AlertCircle, Clock, Coffee, IndianRupee, FileDown, Fuel, Store, Activity, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import UserDirectory from './UserDirectory';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselAnalyticsDashboard from '@/components/diesel/DieselAnalyticsDashboard';
import Image from 'next/image';
import VendorExportModal from '@/components/vendor/VendorExportModal';
import VMSAdminDashboard from '@/components/vms/VMSAdminDashboard';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';
import TicketCreateModal from '@/components/tickets/TicketCreateModal';
import TicketsView from './TicketsView';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import SettingsView from './SettingsView';
import AddMemberModal from './InviteMemberModal';

// Types
type Tab = 'overview' | 'requests' | 'users' | 'visitors' | 'diesel' | 'cafeteria' | 'settings' | 'profile' | 'units' | 'vendor_revenue';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
    image_url?: string;
}

interface TicketData {
    id: string;
    title: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
}

const PropertyAdminDashboard = () => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const params = useParams();
    const router = useRouter();
    const orgSlug = params?.orgId as string;
    const propertyId = params?.propertyId as string;

    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [property, setProperty] = useState<Property | null>(null);
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [statsVersion, setStatsVersion] = useState(0);

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
                <p className="text-muted-foreground font-bold">Loading property dashboard...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-muted-foreground mt-2">{errorMsg || 'Property not found.'}</p>
            <button onClick={() => router.back()} className="mt-4 text-brand-orange font-bold hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex font-inter text-text-primary">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-border flex flex-col fixed h-full z-20 transition-all duration-300">
                <div className="p-8 pb-4">
                    <div className="flex flex-col items-center gap-2 mb-8">
                        <img src="/autopilot-logo-new.png" alt="Autopilot Logo" className="h-12 w-auto object-contain" />
                        <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.2em]">Property Manager</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Quick Actions - Compact Version */}
                    <div className="mb-6">
                        {/* Quick Actions - Simplified Dark Version */}
                        <div className="mb-8">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                                Quick Actions
                            </p>
                            <div className="px-4 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowCreateTicketModal(true)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white text-text-primary rounded-xl hover:bg-muted transition-all border-2 border-primary/20 group shadow-sm"
                                >
                                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Plus className="w-5 h-5 font-black" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center mt-1">New Request</span>
                                </button>
                                <button
                                    onClick={() => router.push(`/property/${propertyId}/snags/intake`)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white text-text-primary rounded-xl hover:bg-muted transition-all border-2 border-amber-500/20 group shadow-sm"
                                >
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                        <Upload className="w-5 h-5 font-black" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center mt-1">Bulk Snags</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Core Operations */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'overview'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'requests'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                        </div>
                    </div>

                    {/* Management Hub */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">

                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'users'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                User Management
                            </button>
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitor Management
                            </button>
                            <button
                                onClick={() => setActiveTab('diesel')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'diesel'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Fuel className="w-4 h-4" />
                                Diesel Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab('vendor_revenue')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'vendor_revenue'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria Revenue
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'settings'
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'profile'
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

                <div className="p-6 border-t border-[#21262d] mt-auto">
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowSignOutModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-red-50 hover:text-red-600 transition-all font-bold text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {
                property && (
                    <TicketCreateModal
                        isOpen={showCreateTicketModal}
                        onClose={() => setShowCreateTicketModal(false)}
                        propertyId={property.id}
                        organizationId={property.organization_id}
                        onSuccess={() => {
                            setStatsVersion(v => v + 1);
                        }}
                    />
                )
            }

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 lg:p-12 overflow-y-auto min-h-screen bg-white">
                {activeTab !== 'overview' && (
                    <header className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-black text-text-primary tracking-tight capitalize">{activeTab}</h1>
                            <p className="text-text-tertiary text-sm font-medium mt-1">{property.address || 'Property Management Hub'}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* User Account Info - Simplified Level Look */}
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className="flex items-center gap-4 group transition-all"
                                >
                                    <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-text-inverse font-bold text-base group-hover:scale-105 transition-transform shadow-sm shadow-primary/20">
                                        {user?.email?.[0].toUpperCase() || 'P'}
                                    </div>
                                    <div className="text-left hidden md:block">
                                        <h4 className="text-[15px] font-black text-text-primary leading-none mb-1 group-hover:text-primary transition-colors">
                                            {user?.user_metadata?.full_name || 'Property Admin'}
                                        </h4>
                                        <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.15em]">
                                            View Profile
                                        </p>
                                    </div>
                                </button>

                                <div className="hidden lg:flex flex-col items-end border-l border-border pl-6 h-8 justify-center">
                                    <span className="text-[11px] font-black text-text-tertiary uppercase tracking-widest leading-none mb-1">Access Level</span>
                                    <span className="text-xs text-primary font-black uppercase tracking-widest leading-none">Property admin</span>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'overview' && <OverviewTab propertyId={propertyId} statsVersion={statsVersion} property={property} />}
                        {activeTab === 'users' && <UserDirectory
                            propertyId={propertyId}
                            orgId={property?.organization_id}
                            orgName={orgSlug}
                            properties={property ? [property] : []}
                            onUserUpdated={Object.assign(() => setStatsVersion((v: number) => v + 1), {
                                __triggerModal: () => setShowAddMemberModal(true)
                            })}
                        />}
                        {activeTab === 'vendor_revenue' && <VendorRevenueTab propertyId={propertyId} />}
                        {activeTab === 'requests' && property && user && (
                            <TicketsView
                                key={`tickets-${statsVersion}`}
                                propertyId={property.id}
                                canDelete={true}
                                onNewRequest={() => setShowCreateTicketModal(true)}
                            />
                        )}
                        {activeTab === 'visitors' && property && (
                            <VMSAdminDashboard propertyId={property.id} />
                        )}
                        {activeTab === 'units' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Unit Management</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Unit inventory management loading...</p>
                            </div>
                        )}
                        {activeTab === 'diesel' && <DieselAnalyticsDashboard />}
                        {activeTab === 'settings' && <SettingsView />}
                        {activeTab === 'profile' && (
                            <div className="flex justify-center items-start py-8">
                                <div className="bg-white border border-slate-100 rounded-3xl shadow-lg w-full max-w-md overflow-hidden">
                                    {/* Card Header with Autopilot Logo */}
                                    <div className="bg-primary/5 p-8 flex flex-col items-center border-b border-border">
                                        {/* Autopilot Logo */}
                                        <div className="flex items-center justify-center mb-6">
                                            <img
                                                src="/autopilot-logo-new.png"
                                                alt="Autopilot Logo"
                                                className="h-10 w-auto object-contain"
                                            />
                                        </div>

                                        {/* User Avatar */}
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-white mb-4 overflow-hidden">
                                            {user?.user_metadata?.user_photo_url || user?.user_metadata?.avatar_url ? (
                                                <Image
                                                    src={user.user_metadata.user_photo_url || user.user_metadata.avatar_url}
                                                    alt="Profile"
                                                    width={96}
                                                    height={96}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl font-black text-primary">
                                                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Role Badge */}
                                        <span className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs font-black uppercase tracking-wider">
                                            Property Admin
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
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold capitalize">
                                                    Property Admin
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

            <AddMemberModal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                orgId={property?.organization_id || ''}
                orgName={orgSlug || 'Organization'}
                properties={property ? [property] : []}
                fixedPropertyId={propertyId}
                onSuccess={() => setStatsVersion(v => v + 1)}
            />
        </div>
    );
};

// Diesel Sphere Visualization (copied from OrgAdminDashboard for consistency)
const DieselSphere = ({ percentage }: { percentage: number }) => {
    return (
        <div className="relative w-full aspect-square max-w-[200px] mx-auto group">
            <div className="absolute inset-0 rounded-full border-4 border-white/20 bg-slate-900/10 backdrop-blur-[2px] shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-700">
                <div className="absolute inset-0 rounded-full shadow-[inset_0_10px_40px_rgba(0,0,0,0.5)] z-20" />
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${percentage}%` }}
                    transition={{ duration: 2, ease: "circOut" }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-dark via-primary to-primary-light"
                >
                    <motion.div
                        animate={{ x: [0, -100] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-0 w-[400%] h-8 bg-primary-light/50 -translate-y-1/2 opacity-60"
                        style={{ borderRadius: '38% 42% 35% 45%' }}
                    />
                    <motion.div
                        animate={{ x: [-100, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1 left-0 w-[400%] h-8 bg-primary-light/30 -translate-y-1/2 opacity-40"
                        style={{ borderRadius: '45% 35% 42% 38%' }}
                    />
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ y: [0, -40], opacity: [0, 0.6, 0], x: [0, (i % 2 === 0 ? 10 : -10)] }}
                            transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.5 }}
                            className="absolute bottom-0 rounded-full bg-white/30 backdrop-blur-sm"
                            style={{ width: 4 + (i * 2), height: 4 + (i * 2), left: `${20 + (i * 15)}%` }}
                        />
                    ))}
                </motion.div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 z-30 pointer-events-none" />
                <div className="absolute top-[10%] left-[15%] w-[25%] h-[15%] bg-white/20 rounded-full blur-[4px] rotate-[-25deg] z-30 pointer-events-none" />
                <div className="absolute bottom-[15%] right-[15%] w-[10%] h-[10%] bg-primary/20 rounded-full blur-[2px] z-30 pointer-events-none" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {Math.round(percentage)}<span className="text-sm ml-0.5 opacity-80">%</span>
                </motion.span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest drop-shadow-md">Diesel Level</span>
            </div>
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-[60%] h-4 bg-primary/20 blur-xl rounded-full transition-opacity duration-300 ${percentage > 0 ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
};

const OverviewTab = ({ propertyId, statsVersion, property }: { propertyId: string, statsVersion: number, property: { name: string; code: string; address?: string; image_url?: string } | null }) => {
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    // Stats State
    const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0, sla_breached: 0, avg_resolution_hours: 0 });
    const [dieselStats, setDieselStats] = useState({ total_consumption: 0, change_percentage: 0 });
    const [vmsStats, setVmsStats] = useState({ total_visitors_today: 0, checked_in: 0, checked_out: 0 });
    const [vendorStats, setVendorStats] = useState({ total_revenue: 0, total_commission: 0, total_vendors: 0 });
    const [recentTickets, setRecentTickets] = useState<any[]>([]);

    useEffect(() => {
        const fetchPropertyData = async () => {
            setIsLoading(true);
            try {
                // --- Tickets ---
                const [openRes, inProgressRes, resolvedRes, totalRes] = await Promise.all([
                    supabase.from('tickets').select('id', { count: 'exact' }).eq('property_id', propertyId).eq('status', 'open'),
                    supabase.from('tickets').select('id', { count: 'exact' }).eq('property_id', propertyId).eq('status', 'in_progress'),
                    supabase.from('tickets').select('id', { count: 'exact' }).eq('property_id', propertyId).in('status', ['resolved', 'closed']),
                    supabase.from('tickets').select('id', { count: 'exact' }).eq('property_id', propertyId),
                ]);
                setTicketStats({
                    total: totalRes.count || 0, open: openRes.count || 0, in_progress: inProgressRes.count || 0, resolved: resolvedRes.count || 0, sla_breached: 0, avg_resolution_hours: 0
                });

                // --- Recent Tickets ---
                const { data: recents } = await supabase.from('tickets').select('id, title, status, created_at').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(5);
                setRecentTickets(recents || []);

                // --- Diesel ---
                const { data: dieselData } = await supabase.from('diesel_readings').select('consumed_litres').eq('property_id', propertyId).gte('reading_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);
                const totalDiesel = dieselData?.reduce((acc, r) => acc + (r.consumed_litres || 0), 0) || 0;
                setDieselStats({ total_consumption: totalDiesel, change_percentage: 0 });

                // --- VMS ---
                const today = new Date().toISOString().split('T')[0];
                const { data: vmsData } = await supabase.from('visitor_logs').select('status').eq('property_id', propertyId).gte('checkin_time', today);
                const checkedIn = vmsData?.filter(v => v.status === 'checked_in').length || 0;
                const checkedOut = vmsData?.filter(v => v.status === 'checked_out').length || 0;
                setVmsStats({ total_visitors_today: vmsData?.length || 0, checked_in: checkedIn, checked_out: checkedOut });

                // --- Vendors ---
                const { data: vendorData } = await supabase.from('vendors').select('id, commission_rate, vendor_daily_revenue(revenue_amount, entry_date)').eq('property_id', propertyId);
                let totalRev = 0, totalComm = 0;
                vendorData?.forEach(v => {
                    const todayEntry = v.vendor_daily_revenue?.find((r: any) => r.entry_date === today);
                    if (todayEntry) {
                        totalRev += todayEntry.revenue_amount || 0;
                        totalComm += (todayEntry.revenue_amount || 0) * ((v.commission_rate || 0) / 100);
                    }
                });
                setVendorStats({ total_revenue: totalRev, total_commission: totalComm, total_vendors: vendorData?.length || 0 });

            } catch (err) {
                console.error('Error fetching property overview data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (propertyId) fetchPropertyData();
    }, [propertyId, statsVersion]);

    const completionRate = ticketStats.total > 0 ? Math.round((ticketStats.resolved / ticketStats.total) * 100 * 10) / 10 : 0;

    if (isLoading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Synchronizing Property Intelligence...</div>;

    return (
        <div className="min-h-screen bg-background -m-8 lg:-m-12">
            {/* Header Section */}
            <div className="bg-[#708F96] px-8 lg:px-12 py-10 border-b border-white/10 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-3xl font-black text-white">Unified Dashboard</h1>
                    <Search className="w-6 h-6 text-white/70 cursor-pointer hover:text-white transition-colors" />
                </div>
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-white text-sm font-bold">Dashboard / {property?.name || 'Property'}</span>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Open Tickets</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{ticketStats.open + ticketStats.in_progress}</span>
                            <span className="text-[10px] text-rose-500 font-bold uppercase">{ticketStats.sla_breached} SLA breached</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Resolved</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{ticketStats.resolved}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Avg {ticketStats.avg_resolution_hours}h resolution</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Completion Rate</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{completionRate}%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{ticketStats.resolved} of {ticketStats.total} closed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="px-8 lg:px-12 py-5 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column */}
                    <div className="lg:col-span-3 space-y-5">
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-2">Diesel Consumption</h3>
                            <div className="text-primary text-xs font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full animate-pulse" />Real-time Tank Status</div>
                            <div className="flex justify-center my-6"><DieselSphere percentage={Math.min(100, (dieselStats.total_consumption / 5000) * 100)} /></div>
                            <div className="space-y-1">
                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total consumption</div>
                                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1">{dieselStats.total_consumption.toLocaleString()}<span className="text-sm text-slate-400 font-bold">L</span></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-2">Vendor Revenue</h3>
                            <div className="text-slate-400 text-xs font-bold mb-2">Today</div>
                            <div className="text-3xl font-black text-slate-900">₹ {vendorStats.total_revenue.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-2">Commission: ₹ {vendorStats.total_commission.toLocaleString()} from {vendorStats.total_vendors} vendors</div>
                        </div>
                    </div>

                    {/* Center Column - Property Card */}
                    <div className="lg:col-span-4">
                        <div className="bg-yellow-400 rounded-3xl p-5 h-full relative overflow-hidden">
                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{property?.name || 'Property'}</h3>
                            <div className="text-red-600 text-sm font-bold mb-5 truncate">Property: {property?.code || 'N/A'}</div>
                            <div className="bg-yellow-500/50 rounded-[2rem] h-56 mb-5 flex items-center justify-center overflow-hidden border-4 border-white/30 shadow-2xl group relative">
                                {property?.image_url ? (
                                    <><img src={property.image_url} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent" /></>
                                ) : (
                                    <div className="flex flex-col items-center gap-2"><Building2 className="w-20 h-20 text-yellow-600/30" /><span className="text-[10px] font-black text-yellow-700/40 uppercase tracking-widest">Awaiting Visuals</span></div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div><div className="text-slate-700 text-xs font-bold">Visitors Today</div><div className="text-2xl font-black text-slate-900">{vmsStats.total_visitors_today}</div></div>
                                <div><div className="text-slate-700 text-xs font-bold">Checked In / Out</div><div className="text-2xl font-black text-slate-900">{vmsStats.checked_in} / {vmsStats.checked_out}</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-4">Recent Tickets</h3>
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {recentTickets.map((t, idx) => (
                                    <div key={t.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div><div className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{t.title}</div><div className="text-xs text-slate-500 capitalize">{t.status?.replace('_', ' ')}</div></div>
                                        <div className="text-right"><div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</div></div>
                                    </div>
                                ))}
                                {recentTickets.length === 0 && <div className="text-center text-slate-400 py-4">No recent tickets.</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-4">Module Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-xl"><div className="text-xs font-bold text-blue-600 mb-1">Tickets</div><div className="text-2xl font-black text-blue-900">{ticketStats.total}</div></div>
                                <div className="p-4 bg-emerald-50 rounded-xl"><div className="text-xs font-bold text-emerald-600 mb-1">Visitors</div><div className="text-2xl font-black text-emerald-900">{vmsStats.total_visitors_today}</div></div>
                                <div className="p-4 bg-primary/5 rounded-xl"><div className="text-xs font-bold text-primary mb-1">Diesel (L)</div><div className="text-2xl font-black text-slate-900">{dieselStats.total_consumption}</div></div>
                                <div className="p-4 bg-purple-50 rounded-xl"><div className="text-xs font-bold text-purple-600 mb-1">Vendors</div><div className="text-2xl font-black text-purple-900">{vendorStats.total_vendors}</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper to format time ago
const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
        {Icon && (
            <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
            </div>
        )}
        <h3 className="text-text-tertiary font-bold text-xs uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-3xl font-black text-text-primary">{value}</p>
    </div>
);

const ActivityItem = ({ icon: Icon, color, title, desc, time, onClick }: any) => (
    <div
        className={`flex gap-4 p-2 rounded-xl transition-all ${onClick ? 'cursor-pointer hover:bg-muted' : ''}`}
        onClick={onClick}
    >
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
            <h4 className="text-sm font-bold text-text-primary">{title}</h4>
            <p className="text-xs text-text-secondary">{desc}</p>
        </div>
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter">{time}</span>
    </div>
);

const InspectionItem = ({ date, unit, status }: any) => (
    <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-2xl border border-border">
        <div className="flex items-center gap-4">
            <div className="bg-white w-12 py-2 rounded-xl text-center border border-border">
                <span className="block text-[8px] font-black text-text-tertiary uppercase tracking-tighter">Jan</span>
                <span className="block font-black text-sm text-text-primary leading-none">{date.split(' ')[1]}</span>
            </div>
            <div>
                <p className="font-bold text-text-primary text-sm">{unit}</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{status}</p>
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-tertiary" />
    </div>
);

const VendorRevenueTab = ({ propertyId }: { propertyId: string }) => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchVendors();
    }, [propertyId]);

    const fetchVendors = async () => {
        setIsLoading(true);
        try {
            // Fetch food vendors and their latest revenue entries
            const { data, error } = await supabase
                .from('vendors')
                .select(`
                    *,
                    vendor_daily_revenue (
                        revenue_amount,
                        entry_date
                    )
                `)
                .eq('property_id', propertyId);

            if (error) throw error;
            setVendors(data || []);
        } catch (err) {
            console.error('Error fetching vendors:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (options: any) => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams({ format: options.format });

            if (options.period === 'today') {
                const today = new Date().toISOString().split('T')[0];
                params.append('startDate', today);
                params.append('endDate', today);
            } else if (options.period === 'month') {
                const monthStart = new Date();
                monthStart.setDate(1);
                params.append('startDate', monthStart.toISOString().split('T')[0]);
                params.append('endDate', new Date().toISOString().split('T')[0]);
            } else if (options.period === 'year') {
                const yearStart = new Date();
                yearStart.setMonth(0, 1);
                params.append('startDate', yearStart.toISOString().split('T')[0]);
                params.append('endDate', new Date().toISOString().split('T')[0]);
            } else if (options.startDate && options.endDate) {
                params.append('startDate', options.startDate);
                params.append('endDate', options.endDate);
            }

            const response = await fetch(`/api/properties/${propertyId}/vendor-export?${params}`);

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vendor_revenue_export.${options.format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowExportModal(false);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Calculate pending payments (vendors who haven't submitted today)
    const today = new Date().toISOString().split('T')[0];
    const pendingCount = vendors.filter(v =>
        !v.vendor_daily_revenue?.some((r: any) => r.entry_date === today)
    ).length;

    const totalRevenue = vendors.reduce((acc, v) =>
        acc + (v.vendor_daily_revenue?.find((r: any) => r.entry_date === today)?.revenue_amount || 0), 0
    );

    const totalCommission = vendors.reduce((acc, v) => {
        const rev = v.vendor_daily_revenue?.find((r: any) => r.entry_date === today)?.revenue_amount || 0;
        return acc + (rev * (v.commission_rate / 100));
    }, 0);

    if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold">Loading Revenue Data...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue (Today)"
                    value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                    icon={IndianRupee}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Total Commission"
                    value={`₹${totalCommission.toLocaleString('en-IN')}`}
                    icon={Calendar}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Pending Entries"
                    value={pendingCount.toString()}
                    icon={Clock}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
                <StatCard
                    title="Active Vendors"
                    value={vendors.length.toString()}
                    icon={Store}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                />
            </div>

            <div className="bg-white border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-border flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">Cafeteria Performance</h3>
                        <p className="text-text-secondary text-xs font-medium mt-1">Real-time revenue tracking per vendor.</p>
                    </div>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-text-inverse rounded-xl text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                    >
                        <FileDown className="w-4 h-4" /> Export
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-elevated border-b border-border">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Vendor / Shop</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-center">Commission %</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-right">Today's Revenue</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-right">Commission Due</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">No vendors found for this property.</td>
                                </tr>
                            ) : (
                                vendors.map((vendor) => {
                                    const todayRevenue = vendor.vendor_daily_revenue?.find((r: any) => r.entry_date === today)?.revenue_amount || 0;
                                    const commission = (todayRevenue * (vendor.commission_rate / 100)).toFixed(2);

                                    return (
                                        <tr key={vendor.id} className="hover:bg-slate-50/50 transition-all">
                                            <td className="px-8 py-5">
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{vendor.shop_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{vendor.owner_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                                    {vendor.commission_rate}%
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className={`font-black text-sm ${todayRevenue > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    ₹{todayRevenue.toLocaleString('en-IN')}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 text-right text-emerald-600 font-black text-sm">
                                                ₹{Number(commission).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${todayRevenue > 0
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {todayRevenue > 0 ? 'Paid' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <VendorExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                isExporting={isExporting}
            />
        </div>
    );
};

export default PropertyAdminDashboard;
