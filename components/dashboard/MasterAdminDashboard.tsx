'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Users, Building2, AlertTriangle, Activity,
    LayoutGrid, Settings, Trash2, RefreshCcw,
    CheckCircle2, AlertCircle, Search, Plus, ExternalLink, XCircle, Filter,
    Key, Eye, EyeOff, Globe, Copy, X, Ticket, Link as LinkIcon, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import OrgPropertyDashboard from './OrgPropertyDashboard';
import TicketsView from './TicketsView';
import InviteLinkGenerator from './InviteLinkGenerator';
import { HapticCard } from '@/components/ui/HapticCard';
import SignOutModal from '@/components/ui/SignOutModal';

type Tab = 'overview' | 'organizations' | 'tickets' | 'users' | 'invite-links' | 'modules' | 'settings';

interface Organization {
    id: string;
    name: string;
    code: string;
    is_deleted: boolean;
    deleted_at: string | null;
    deletion_secret: string | null;
    available_modules: string[];
    created_at: string;
    properties?: { count: number }[];
    organization_memberships?: { count: number }[];
}

interface SystemUser {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string;
    organization_memberships?: { role: string; organization_id: string; is_active?: boolean }[];
    property_memberships?: { role: string; organization_id: string; is_active?: boolean; property: { name: string; code: string } }[];
    is_master_admin?: boolean;
}

const MasterAdminDashboard = () => {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null); // For drill-down
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const supabase = createClient();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchOrganizations();
        fetchUsers();
    }, []);

    // We now fetch users on mount to ensure counts are accurate across the dashboard

    const fetchOrganizations = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('organizations')
            .select('*, properties(count)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching organizations:', error);
            setIsLoading(false);
            return;
        }

        setOrganizations(data ?? []);
        setIsLoading(false);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Use the secure Admin API endpoint to bypass client-side RLS issues
            const response = await fetch('/api/admin/users');

            if (!response.ok) {
                // Determine error message based on status
                if (response.status === 403) throw new Error('You do not have permission to view users.');
                if (response.status === 401) throw new Error('Session expired. Please log in again.');
                throw new Error('Failed to fetch users.');
            }

            const data = await response.json();
            setUsers(data || []);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            showToast(
                err.message || 'Failed to load users',
                'error',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const response = await fetch('/api/users/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user');
            }

            showToast('User deleted successfully.');
            fetchUsers();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete user', 'error');
        }
    };

    const handleSoftDelete = async (orgId: string) => {
        await supabase
            .from('organizations')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .eq('id', orgId);
        fetchOrganizations();
    };

    const handleRestoreOrg = async (orgId: string) => {
        await supabase
            .from('organizations')
            .update({
                is_deleted: false,
                deleted_at: null
            })
            .eq('id', orgId);
        fetchOrganizations();
    };

    const handleUpdateUserRole = async (userId: string, newRole: string, orgId: string) => {
        await supabase
            .from('organization_memberships')
            .upsert({
                user_id: userId,
                organization_id: orgId,
                role: newRole
            });
        fetchUsers();
    };

    const handleToggleUserStatus = async (userId: string, orgId: string, currentStatus: boolean) => {
        await supabase
            .from('organization_memberships')
            .update({ is_active: !currentStatus })
            .eq('user_id', userId)
            .eq('organization_id', orgId);
        fetchUsers();
    };

    const handleUpdateModules = async (orgId: string, modules: string[]) => {
        await supabase
            .from('organizations')
            .update({ available_modules: modules })
            .eq('id', orgId);
        fetchOrganizations();
    };

    const handleRestoreWithSecret = async (secret: string) => {
        const { data, error } = await supabase
            .from('organizations')
            .update({
                is_deleted: false,
                deleted_at: null
            })
            .eq('deletion_secret', secret)
            .select();

        if (error || !data || data.length === 0) {
            throw new Error('Invalid secret key or organization not found.');
        }
        fetchOrganizations();
    };

    const navItems: { id: Tab, label: string, icon: any }[] = [
        { id: 'overview', label: 'Console', icon: ShieldCheck },
        { id: 'organizations', label: 'Organizations', icon: Building2 },
        { id: 'tickets', label: 'Support Tickets', icon: Ticket },
        { id: 'users', label: 'User Directory', icon: Users },
        { id: 'invite-links', label: 'Invite Links', icon: LinkIcon },
        { id: 'modules', label: 'Module Control', icon: LayoutGrid },
        { id: 'settings', label: 'System', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[#fafbfc] flex font-inter">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-slate-100 flex flex-col p-8 sticky top-0 h-screen">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white rounded-sm rotate-45"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xl tracking-tighter">MASTER</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">Control Hub</span>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === item.id
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="pt-8 border-t border-slate-100">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-4">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-700">Production Mode</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-2 mb-6">
                        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-slate-200">
                            {user?.email?.[0].toUpperCase() || 'M'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-sm text-slate-900 truncate">
                                {user?.user_metadata?.full_name || 'Master Admin'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate font-medium">
                                {user?.email}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl w-full transition-all duration-300 text-sm font-bold group"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </div>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {/* Main Content */}
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
                        <p className="text-slate-400 text-sm font-medium mt-1">Real-time system oversight and governance.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search master data..."
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-100 w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {activeTab === 'organizations' && (
                            <button
                                onClick={() => setShowCreateOrgModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> New Org
                            </button>
                        )}
                        {activeTab === 'users' && (
                            <button
                                onClick={() => setShowCreateUserModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> New User
                            </button>
                        )}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'overview' && <OverviewGrid />}
                        {activeTab === 'organizations' && (
                            selectedOrg ? (
                                <OrgPropertyDashboard
                                    organization={selectedOrg}
                                    onBack={() => setSelectedOrg(null)}
                                />
                            ) : (
                                <OrganizationsList
                                    organizations={organizations}
                                    users={users} // Pass users to compute counts
                                    isLoading={isLoading}
                                    onSoftDelete={handleSoftDelete}
                                    onRestore={handleRestoreOrg}
                                    onDrillDown={(org) => setSelectedOrg(org)}
                                />
                            )
                        )}
                        {activeTab === 'tickets' && <TicketsView />}
                        {activeTab === 'users' && (
                            <UserDirectory
                                users={users}
                                organizations={organizations}
                                onUpdateRole={handleUpdateUserRole}
                                onToggleStatus={handleToggleUserStatus}
                                onDeleteUser={handleDeleteUser}
                                onAddUser={() => setShowCreateUserModal(true)}
                            />
                        )}
                        {activeTab === 'invite-links' && (
                            <InviteLinkGenerator organizations={organizations} />
                        )}
                        {activeTab === 'modules' && (
                            <ModuleConfig
                                organizations={organizations}
                                onUpdateModules={handleUpdateModules}
                            />
                        )}
                        {activeTab === 'settings' && (
                            <SystemSettings onRestore={handleRestoreWithSecret} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success'
                            ? 'bg-emerald-900 border-emerald-500/50 text-emerald-50'
                            : 'bg-rose-900 border-rose-500/50 text-rose-50'
                            }`}>
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                            )}
                            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {showCreateOrgModal && (
                    <CreateOrgModal
                        onClose={() => setShowCreateOrgModal(false)}
                        onCreated={() => {
                            fetchOrganizations();
                        }}
                        showToast={showToast}
                    />
                )}
                {showCreateUserModal && (
                    <CreateUserModal
                        onClose={() => setShowCreateUserModal(false)}
                        onCreated={fetchUsers}
                        organizations={organizations}
                        showToast={showToast}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-component: Overview Grid with Haptic Hover
const OverviewGrid = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    // Detect prefers-reduced-motion
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const kpiStats = [
        {
            id: 'licensed-entities',
            label: 'Licensed Entities',
            value: '1,284',
            icon: Building2,
            trend: '+12%',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            analytics: {
                title: 'Entity Growth',
                items: [
                    { region: 'North America', count: 542, delta: '+8%' },
                    { region: 'Europe', count: 389, delta: '+15%' },
                    { region: 'Asia Pacific', count: 353, delta: '+18%' },
                ]
            }
        },
        {
            id: 'active-sessions',
            label: 'Active Sessions',
            value: '45,092',
            icon: Activity,
            trend: 'LIVE',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            analytics: {
                title: 'Session Heatmap',
                items: [
                    { time: 'Peak', count: '12:00 - 14:00', delta: '8.2k' },
                    { time: 'Low', count: '03:00 - 05:00', delta: '1.4k' },
                    { time: 'Avg Duration', count: '24 min', delta: '+2min' },
                ]
            }
        },
        {
            id: 'security-alerts',
            label: 'Security Alerts',
            value: '0',
            icon: ShieldCheck,
            trend: 'SAFE',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            analytics: {
                title: 'Threat Timeline',
                items: [
                    { label: 'Resolved Today', count: 3, delta: '100%' },
                    { label: 'Blocked IPs', count: 12, delta: 'Active' },
                    { label: 'Last Incident', count: '7d ago', delta: 'Resolved' },
                ]
            }
        },
        {
            id: 'pending-deletions',
            label: 'Pending Deletions',
            value: '3',
            icon: Trash2,
            trend: 'COOLED',
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            analytics: {
                title: 'Deletion Queue',
                items: [
                    { name: 'Acme Corp', expires: '23h left', status: 'Pending' },
                    { name: 'Test Org', expires: '18h left', status: 'Pending' },
                    { name: 'Demo Ltd', expires: '4h left', status: 'Urgent' },
                ]
            }
        },
    ];

    return (
        <div className="space-y-8">
            <div
                className="grid gap-6 transition-all duration-500 ease-out"
                style={{
                    gridTemplateColumns: expandedId
                        ? 'repeat(4, minmax(0, 1fr))'
                        : 'repeat(4, minmax(0, 1fr))'
                }}
            >
                {kpiStats.map((stat) => {
                    const isExpanded = expandedId === stat.id;
                    const isSibling = expandedId !== null && !isExpanded;

                    return (
                        <HapticCard
                            key={stat.id}
                            id={stat.id}
                            isExpanded={isExpanded}
                            onActivate={setExpandedId}
                            reducedMotion={reducedMotion}
                            className={isSibling ? 'opacity-60' : ''}
                            baseContent={
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                        </div>
                                        <span className="text-[11px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-lg uppercase tracking-wider">
                                            {stat.trend}
                                        </span>
                                    </div>
                                    <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                </>
                            }
                            expandedContent={
                                <div className="pt-4 space-y-3">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                        {stat.analytics.title}
                                    </h4>
                                    {stat.analytics.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                            <span className="text-sm font-bold text-slate-700">
                                                {item.region || item.time || item.label || item.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900">
                                                    {item.count || item.expires}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'Urgent' ? 'bg-rose-100 text-rose-600' :
                                                    item.delta?.startsWith('+') ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {item.delta || item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                        />
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white">
                    <h3 className="text-2xl font-black mb-6">Regional Performance</h3>
                    <div className="space-y-6">
                        {[
                            { name: 'North America', status: 'Optimal', load: 45 },
                            { name: 'European Union', status: 'Maintenance', load: 88 },
                            { name: 'Asia Pacific', status: 'Optimal', load: 12 },
                        ].map((reg, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                    <span>{reg.name}</span>
                                    <span className={reg.load > 80 ? 'text-rose-400' : 'text-emerald-400'}>{reg.status}</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full">
                                    <div className={`h-full ${reg.load > 80 ? 'bg-rose-400' : 'bg-emerald-400'} rounded-full`} style={{ width: `${reg.load}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-slate-100 p-8 rounded-[40px]">
                    <h3 className="text-2xl font-black text-slate-900 mb-6">System Health</h3>
                    <div className="space-y-4">
                        {[
                            { id: 'AUTH-SV', label: 'Auth Middleware', status: 'Healthy' },
                            { id: 'DB-IDX', label: 'Global Indexes', status: 'Warning' },
                            { id: 'OAUTH-API', label: 'OAuth Gateway', status: 'Healthy' }
                        ].map((svc, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-300 px-2 py-0.5 border border-slate-100 rounded-md uppercase tracking-widest">{svc.id}</span>
                                    <span className="text-sm font-bold text-slate-800">{svc.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <span className="text-xs font-bold text-slate-500">{svc.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component: Organization Management
const OrganizationsList = ({ organizations, users, isLoading, onSoftDelete, onRestore, onDrillDown }: {
    organizations: Organization[];
    users: SystemUser[];
    isLoading: boolean;
    onSoftDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onDrillDown?: (org: Organization) => void;
}) => {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {organizations.map((org) => {
                            // Correct deduplicated count of users in this organization
                            const orgMemberIds = new Set([
                                ...(users.filter(u => u.organization_memberships?.some(m => m.organization_id === org.id)).map(u => u.id)),
                                ...(users.filter(u => u.property_memberships?.some(pm => pm.organization_id === org.id)).map(u => u.id))
                            ]);

                            const propertiesCount = org.properties?.[0]?.count || 0;

                            return (
                                <tr
                                    key={org.id}
                                    className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => onDrillDown?.(org)}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                                                {org.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm leading-none mb-1">{org.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">/{org.code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-sm font-black text-slate-700">{propertiesCount} Entities</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-600">{orgMemberIds.size} Users</span>
                                            <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-400 rounded-full" style={{ width: orgMemberIds.size > 0 ? '70%' : '0%' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {org.is_deleted ? (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100 animate-pulse">
                                                Cooling Down
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                                Active
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                            {org.is_deleted ? (
                                                <button
                                                    onClick={() => onRestore(org.id)}
                                                    className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all border border-indigo-100"
                                                >
                                                    <RefreshCcw className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirmId(org.id)}
                                                    className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Soft Delete Organization</h3>
                                    <p className="text-sm text-slate-500">This action has a 24-hour cooling period.</p>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-8">
                                The organization will be marked for deletion. You can restore it within 24 hours using the secret key that was generated during creation.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onSoftDelete(deleteConfirmId);
                                        setDeleteConfirmId(null);
                                    }}
                                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-component: User Directory with Role Management
const UserDirectory = ({ users, organizations, onUpdateRole, onToggleStatus, onDeleteUser, onAddUser }: {
    users: SystemUser[];
    organizations: Organization[];
    onUpdateRole: (userId: string, role: string, orgId: string) => void;
    onToggleStatus: (userId: string, orgId: string, current: boolean) => void;
    onDeleteUser: (userId: string) => void;
    onAddUser: () => void;
}) => {
    const roleOptions = ['master_admin', 'org_super_admin', 'property_admin', 'staff', 'tenant'];
    const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');

    const filteredUsers = selectedOrgFilter === 'all'
        ? users
        : users.filter(u =>
            u.organization_memberships?.some(m => m.organization_id === selectedOrgFilter) ||
            u.property_memberships?.some(m => m.organization_id === selectedOrgFilter)
        );

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-slate-900">System Users ({filteredUsers.length})</h3>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedOrgFilter}
                            onChange={(e) => setSelectedOrgFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-100 appearance-none cursor-pointer"
                        >
                            <option value="all">All Organizations</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onAddUser}
                        className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                    >
                        <Plus className="w-4 h-4" /> Add User
                    </button>
                    <button className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <Users className="w-4 h-4" /> Export Audit Log
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic">No users found for this selection.</div>
                ) : (
                    filteredUsers.map((user) => {
                        const isMasterAdmin = user.is_master_admin === true;

                        // Collect all memberships to display
                        // We want to show specific org memberships if filtered, or ALL memberships if 'all' is selected
                        const orgMemberships = user.organization_memberships?.filter(m => selectedOrgFilter === 'all' || m.organization_id === selectedOrgFilter) || [];
                        // Property memberships are not filtered by Org ID currently in the UI filter (as it only lists Orgs), 
                        // but strictly speaking properties belong to orgs. For now, show all prop memberships if filter is 'all', 
                        // or filter them if we had org_id on them (we don't in the frontend, only in DB).
                        // Let's just show all property memberships for now to ensure visibility.
                        const propMemberships = user.property_memberships || [];

                        const hasMemberships = orgMemberships.length > 0 || propMemberships.length > 0;

                        return (
                            <div key={user.id} className="flex items-center justify-between p-6 border border-slate-50 rounded-3xl hover:border-slate-200 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 relative">
                                        <Users className="w-6 h-6" />
                                        {/* Show suspended if specific checks fail? Global active check is hard with multiple roles. */}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 flex items-center gap-2">
                                            {user.full_name || 'Unknown User'}
                                            {user.is_master_admin && (
                                                <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-slate-900 flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3" /> Master
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs font-medium text-slate-400">{user.email}</p>

                                        {/* Context Badges (Where do they belong?) */}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {isMasterAdmin && (
                                                <span className="text-xs text-indigo-600 font-bold italic">
                                                    Platform-level access
                                                </span>
                                            )}

                                            {!isMasterAdmin && !hasMemberships && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                    Unassigned
                                                </span>
                                            )}

                                            {orgMemberships.map((m, idx) => {
                                                const orgName = organizations.find(o => o.id === m.organization_id)?.name || 'Unknown Org';
                                                return (
                                                    <span key={`org-${idx}`} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" /> {orgName}
                                                    </span>
                                                );
                                            })}

                                            {propMemberships.map((m, idx) => (
                                                <span key={`prop-${idx}`} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" /> {m.property?.name || 'Unknown Property'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Roles Column */}
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Roles</span>

                                        {isMasterAdmin && (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded uppercase font-black">
                                                MASTER ADMIN
                                            </span>
                                        )}

                                        {orgMemberships.map((m, idx) => (
                                            <div key={`org-role-${idx}`} className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-medium">Org:</span>
                                                <select
                                                    value={m.role}
                                                    onChange={(e) => onUpdateRole(user.id, e.target.value, m.organization_id)}
                                                    className="text-sm font-bold text-emerald-700 bg-transparent cursor-pointer border-b border-dotted border-emerald-300 focus:outline-none"
                                                >
                                                    {roleOptions.map(role => (
                                                        <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}

                                        {propMemberships.map((m, idx) => (
                                            <div key={`prop-role-${idx}`} className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-medium">Prop:</span>
                                                <span className="text-sm font-bold text-blue-700 border-b border-dotted border-blue-300">
                                                    {m.role?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                        ))}

                                        {!isMasterAdmin && !hasMemberships && (
                                            <span className="text-xs text-slate-300 italic">No Role</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Status Toggles Logic - complex for multiple roles, maybe just show delete for now */}
                                        <button
                                            onClick={() => onDeleteUser(user.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Sub-component: Module Configuration
const ModuleConfig = ({ organizations, onUpdateModules }: {
    organizations: Organization[];
    onUpdateModules: (orgId: string, modules: string[]) => void;
}) => {
    const modulesList = [
        { id: 'ticketing', name: 'Ticketing & SLA', desc: 'Manage maintenance requests with SLAs.' },
        { id: 'viewer', name: '2.5D Building Viewer', desc: 'Interactive floor-wise visual maps.' },
        { id: 'analytics', name: 'Performance Analytics', desc: 'Deep insights into operational health.' },
        { id: 'procurement', name: 'Inventory Control', desc: 'Stock and vendor management.' },
        { id: 'visitors', name: 'Visitor Management', desc: 'Gate pass and visitor tracking.' },
    ];

    const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
    const [activeModules, setActiveModules] = useState<string[]>([]);

    useEffect(() => {
        if (selectedOrg) {
            const org = organizations.find(o => o.id === selectedOrg);
            setActiveModules(org?.available_modules || []);
        }
    }, [selectedOrg, organizations]);

    const toggleModule = (moduleId: string) => {
        setActiveModules(prev => {
            if (prev.includes(moduleId)) {
                return prev.filter(m => m !== moduleId);
            }
            return [...prev, moduleId];
        });
    };

    const handleSave = () => {
        if (selectedOrg) {
            onUpdateModules(selectedOrg, activeModules);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[32px] p-8 h-fit">
                <h3 className="text-lg font-black text-slate-900 mb-6">Select Organization</h3>
                <div className="space-y-2">
                    {organizations.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => setSelectedOrg(org.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedOrg === org.id
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                                }`}
                        >
                            <p className="text-sm font-black">{org.name}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedOrg === org.id ? 'text-white/40' : 'text-slate-300'}`}>
                                {org.available_modules?.length || 0} Active Modules
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                {!selectedOrg ? (
                    <div className="h-96 border-2 border-dashed border-slate-100 rounded-[32px] flex items-center justify-center text-slate-300 font-bold italic">
                        Choose an organization on the left to configure modules.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <header className="flex justify-between items-center mb-8 bg-slate-50 p-6 rounded-[24px]">
                            <div>
                                <h4 className="text-lg font-black text-slate-800">Capability Matrix</h4>
                                <p className="text-xs text-slate-400 font-medium italic">Customizing licensing for {organizations.find((o) => o.id === selectedOrg)?.name}</p>
                            </div>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 bg-emerald-500 text-white font-black text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
                            >
                                Save Configuration
                            </button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {modulesList.map((mod) => (
                                <div key={mod.id} className="bg-white border border-slate-100 p-6 rounded-[28px] flex flex-col justify-between hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeModules.includes(mod.id) ? 'bg-emerald-100' : 'bg-slate-50'}`}>
                                            <CheckCircle2 className={`w-5 h-5 ${activeModules.includes(mod.id) ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        </div>
                                        <button
                                            onClick={() => toggleModule(mod.id)}
                                            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${activeModules.includes(mod.id) ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        >
                                            <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow ${activeModules.includes(mod.id) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 mb-1">{mod.name}</p>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{mod.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component: Create Organization Modal
const CreateOrgModal = ({ onClose, onCreated, showToast }: { onClose: () => void; onCreated: () => void; showToast: (msg: string, type: 'success' | 'error') => void }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);

    const handleCreate = async () => {
        if (!name || !slug) return;

        setIsCreating(true);

        try {
            // Use API route that bypasses RLS with admin client
            const response = await fetch('/api/organizations/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    slug: slug.toLowerCase().replace(/\s+/g, '-'),
                    available_modules: ['ticketing', 'viewer', 'analytics']
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create organization');
            }

            setCreatedSecret(data.deletion_secret);
            showToast(`Organization "${name}" created.`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to create organization', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopySecret = () => {
        if (createdSecret) {
            navigator.clipboard.writeText(createdSecret);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">Create Organization</h3>
                        <p className="text-sm text-slate-500">Set up a new organization entity.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {!createdSecret ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Organization Name*</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                }}
                                placeholder="e.g. Acme Corporation"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">URL Slug*</label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="e.g. acme-corp"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                            />
                            <p className="text-xs text-slate-400">Will be used in URLs: /acme-corp/dashboard</p>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !name || !slug}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Creating...' : 'Create Organization'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                            <h4 className="text-lg font-black text-slate-900 mb-2">Organization Created!</h4>
                            <p className="text-sm text-slate-600">Save this deletion secret key. You'll need it to restore the organization if soft-deleted.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Key className="w-4 h-4" /> Deletion Secret Key
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm">
                                    {showSecret ? createdSecret : '••••••••••••••••••••••'}
                                </div>
                                <button
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={handleCopySecret}
                                    className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onCreated();
                                onClose();
                            }}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// Sub-component: System Settings
const SystemSettings = ({ onRestore }: { onRestore: (secret: string) => Promise<void> }) => {
    const [secret, setSecret] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleRestore = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRestoring(true);
        setMessage(null);
        try {
            await onRestore(secret);
            setMessage({ type: 'success', text: 'Organization successfully restored!' });
            setSecret('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Restoration failed.' });
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <RefreshCcw className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Organization Recovery</h3>
                            <p className="text-sm text-slate-500 font-medium">Restore soft-deleted entities using their secret key.</p>
                        </div>
                    </div>

                    <form onSubmit={handleRestore} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Secret Key</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    placeholder="Enter sk_..."
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-100 font-mono text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isRestoring || !secret}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isRestoring ? 'Verifying...' : 'Restore Organization'}
                            {!isRestoring && <RefreshCcw className="w-4 h-4" />}
                        </button>
                    </form>
                </div>

                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-6">Backup & Maintenance</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Maintenance Mode</p>
                                <p className="text-[10px] text-slate-400 font-medium">Prevents new logins while active.</p>
                            </div>
                            <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-not-allowed">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-50">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Database Snapshot</p>
                                <p className="text-[10px] text-slate-400 font-medium">Last: 4 hours ago</p>
                            </div>
                            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400">Trigger</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-400" />
                        Global API Configuration
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Supabase Instance', value: 'production-main', status: 'Healthy' },
                            { label: 'OAuth Flow', value: 'enabled', status: 'Healthy' },
                            { label: 'Edge Runtime', value: 'v4.2.1', status: 'Optimal' }
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{item.label}</p>
                                    <p className="text-sm font-bold">{item.value}</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    <span className="text-[10px] font-black text-white/60 uppercase">{item.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-8 rounded-[40px]">
                    <h3 className="text-xl font-black text-orange-900 mb-2 italic">Developer Portal</h3>
                    <p className="text-xs text-orange-700 font-medium mb-6">Access system logs, sandbox environments, and API documentation.</p>
                    <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200">
                        Launch Console
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Sub-component: Create User Modal
const CreateUserModal = ({ onClose, onCreated, organizations, showToast }: {
    onClose: () => void;
    onCreated: () => void;
    organizations: Organization[];
    showToast: (msg: string, type: 'success' | 'error') => void;
}) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [manualPassword, setManualPassword] = useState(''); // New State
    const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id || '');
    const [role, setRole] = useState('staff');
    const [isCreating, setIsCreating] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

    const handleCreate = async () => {
        const isMasterAdmin = role === 'master_admin';
        if (!email || !fullName || (!isMasterAdmin && !selectedOrgId)) return;

        setIsCreating(true);

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password: manualPassword || undefined, // Send if present
                    full_name: fullName,
                    organization_id: isMasterAdmin ? undefined : selectedOrgId,
                    role: isMasterAdmin ? 'staff' : role,
                    create_master_admin: isMasterAdmin
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            if (data.temp_password) {
                // Auto-generated case
                setGeneratedPassword(data.temp_password);
                showToast(`User created with auto-generated password.`, 'success');
            } else {
                // Manual password case (API doesn't return it back)
                // We show what the admin typed just for confirmation, or just a success message.
                // Let's reuse the success view but with the manual password.
                setGeneratedPassword(manualPassword);
                showToast(`User created with manual password.`, 'success');
            }

        } catch (error: any) {
            showToast(error.message || 'Failed to create user', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyPassword = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword);
            showToast('Password copied to clipboard', 'success');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
                {generatedPassword ? (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">User Created!</h3>
                            <p className="text-sm text-slate-500">
                                Share these credentials with the user securely. <br />
                                <span className="text-rose-500 font-bold">This password will not be shown again.</span>
                            </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                <p className="font-bold text-slate-900">{email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Password</p>
                                <div className="flex items-center gap-2">
                                    <code className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-lg font-bold text-slate-800 flex-1">
                                        {generatedPassword}
                                    </code>
                                    <button
                                        onClick={handleCopyPassword}
                                        className="p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                        title="Copy Password"
                                    >
                                        <Copy className="w-5 h-5 text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onCreated();
                                onClose();
                            }}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-1">Add New User</h3>
                                <p className="text-sm text-slate-500">Create a new user and assign roles.</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Password <span className="text-slate-400 font-medium text-xs">(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={manualPassword}
                                        onChange={(e) => setManualPassword(e.target.value)}
                                        placeholder="Auto-generate"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100 bg-white"
                                >
                                    <option value="tenant">Tenant</option>
                                    <option value="staff">Staff</option>
                                    <option value="property_admin">Property Admin</option>
                                    <option value="org_super_admin">Org Super Admin</option>
                                    <option value="master_admin">Master Admin (Platform)</option>
                                </select>
                            </div>

                            {role !== 'master_admin' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Organization</label>
                                    <select
                                        value={selectedOrgId}
                                        onChange={(e) => setSelectedOrgId(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100 bg-white"
                                    >
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={handleCreate}
                                disabled={isCreating || !email || !fullName || (role !== 'master_admin' && !selectedOrgId)}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {isCreating ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default MasterAdminDashboard;
