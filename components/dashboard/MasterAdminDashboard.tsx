'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Users, Building2, AlertTriangle, Activity,
    Globe, LayoutGrid, Settings, Trash2, Key, RefreshCcw,
    CheckCircle2, XCircle, Search, Filter, ExternalLink, MoreVertical,
    Plus, X, Copy, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

type Tab = 'overview' | 'organizations' | 'users' | 'modules' | 'settings';

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
    organization_memberships?: { role: string; organization_id: string }[];
}

const MasterAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const supabase = createClient();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchOrganizations();
        fetchUsers();
    }, []);

    const fetchOrganizations = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('organizations')
            .select(`
        *,
        properties (count),
        organization_memberships (count)
      `);

        if (!error && data) {
            setOrganizations(data);
        }
        setIsLoading(false);
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select(`
        *,
        organization_memberships (role, organization_id)
      `);

        if (!error && data) {
            setUsers(data);
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
        { id: 'users', label: 'User Directory', icon: Users },
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
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-700">Production Mode</span>
                        </div>
                    </div>
                </div>
            </div>

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
                            <OrganizationsList
                                organizations={organizations}
                                isLoading={isLoading}
                                onSoftDelete={handleSoftDelete}
                                onRestore={handleRestoreOrg}
                            />
                        )}
                        {activeTab === 'users' && (
                            <UserDirectory
                                users={users}
                                organizations={organizations}
                                onUpdateRole={handleUpdateUserRole}
                                onToggleStatus={handleToggleUserStatus}
                            />
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
            </AnimatePresence>
        </div>
    );
};

// Sub-component: Overview Grid
const OverviewGrid = () => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
                { label: 'Licensed Entities', value: '1,284', icon: Building2, trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Active Sessions', value: '45,092', icon: Activity, trend: 'LIVE', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Security Alerts', value: '0', icon: ShieldCheck, trend: 'SAFE', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Pending Deletions', value: '3', icon: Trash2, trend: 'COOLED', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((stat, i) => (
                <div key={i} className="bg-white px-6 py-7 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <span className="text-[11px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-lg uppercase tracking-wider">{stat.trend}</span>
                    </div>
                    <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
            ))}
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

// Sub-component: Organization Management
const OrganizationsList = ({ organizations, isLoading, onSoftDelete, onRestore }: {
    organizations: Organization[];
    isLoading: boolean;
    onSoftDelete: (id: string) => void;
    onRestore: (id: string) => void;
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
                        {organizations.map((org) => (
                            <tr key={org.id} className="group hover:bg-slate-50/50 transition-colors">
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
                                    <span className="text-sm font-black text-slate-700">{org.properties?.[0]?.count || 0} Entities</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-slate-600">{org.organization_memberships?.[0]?.count || 0} Users</span>
                                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 rounded-full" style={{ width: '45%' }} />
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
                                <td className="px-8 py-6">
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
                        ))}
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
const UserDirectory = ({ users, organizations, onUpdateRole, onToggleStatus }: {
    users: SystemUser[];
    organizations: Organization[];
    onUpdateRole: (userId: string, role: string, orgId: string) => void;
    onToggleStatus: (userId: string, orgId: string, current: boolean) => void;
}) => {
    const roleOptions = ['master_admin', 'org_super_admin', 'property_admin', 'staff', 'tenant'];

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900">System Users ({users.length})</h3>
                <button className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <Users className="w-4 h-4" /> Export Audit Log
                </button>
            </div>

            <div className="space-y-4">
                {users.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic">No users found in the system.</div>
                ) : (
                    users.map((user) => {
                        const membership = user.organization_memberships?.[0];
                        const isActive = membership?.is_active ?? true;
                        return (
                            <div key={user.id} className="flex items-center justify-between p-6 border border-slate-50 rounded-3xl hover:border-slate-200 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 relative">
                                        <Users className="w-6 h-6" />
                                        {!isActive && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                                                <XCircle className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 flex items-center gap-2">
                                            {user.full_name}
                                            {!isActive && <span className="text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Suspended</span>}
                                        </h4>
                                        <p className="text-xs font-medium text-slate-400">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</span>
                                        <select
                                            value={membership?.role || 'tenant'}
                                            disabled={!isActive}
                                            onChange={(e) => {
                                                if (membership?.organization_id) {
                                                    onUpdateRole(user.id, e.target.value, membership.organization_id);
                                                }
                                            }}
                                            className="text-sm font-bold text-slate-900 focus:outline-none bg-transparent cursor-pointer border border-slate-200 rounded-lg px-3 py-1 disabled:opacity-50"
                                        >
                                            {roleOptions.map(role => (
                                                <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                if (membership?.organization_id) {
                                                    onToggleStatus(user.id, membership.organization_id, isActive);
                                                }
                                            }}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isActive
                                                ? 'text-rose-500 hover:bg-rose-50'
                                                : 'text-emerald-500 hover:bg-emerald-50'
                                                }`}
                                        >
                                            {isActive ? 'Suspend' : 'Activate'}
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
    const [code, setCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const supabase = createClient();

    const generateSecret = () => {
        return `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    };

    const handleCreate = async () => {
        if (!name || !code) return;

        setIsCreating(true);
        const secret = generateSecret();

        const { error } = await supabase.from('organizations').insert({
            name,
            code: code.toLowerCase().replace(/\s+/g, '-'),
            deletion_secret: secret,
            available_modules: ['ticketing', 'viewer', 'analytics']
        });

        setIsCreating(false);

        if (!error) {
            setCreatedSecret(secret);
            showToast(`Organization "${name}" created.`, 'success');
        } else {
            showToast(error.message, 'error');
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
                                    setCode(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                }}
                                placeholder="e.g. Acme Corporation"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">URL Code*</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="e.g. acme-corp"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100"
                            />
                            <p className="text-xs text-slate-400">Will be used in URLs: /acme-corp/dashboard</p>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !name || !code}
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

export default MasterAdminDashboard;
