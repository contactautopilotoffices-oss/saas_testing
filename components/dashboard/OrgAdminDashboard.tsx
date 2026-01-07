'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Building2, Users, Ticket, Settings,
    Search, Plus, Filter, Bell, LogOut, ChevronRight, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';

// Types
type Tab = 'overview' | 'properties' | 'users' | 'tickets' | 'settings';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    image_url?: string;
    created_at: string;
}

interface OrgUser {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    user: {
        email: string;
        full_name: string;
        phone: string | null;
    };
}

interface Organization {
    id: string;
    name: string;
    slug: string; // Updated from 'code' to match schema
    logo_url?: string;
}

const OrgAdminDashboard = () => {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const orgSlug = params?.orgId as string; // maps to [orgId] in URL structure

    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [org, setOrg] = useState<Organization | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreatePropModal, setShowCreatePropModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const supabase = createClient();

    useEffect(() => {
        if (orgSlug) {
            fetchOrgDetails();
        }
    }, [orgSlug]);

    useEffect(() => {
        if (org) {
            if (activeTab === 'properties') fetchProperties();
            if (activeTab === 'users') fetchOrgUsers();
        }
    }, [activeTab, org]);

    // Fetch Organization by Slug
    // Fetch Organization by Slug
    const fetchOrgDetails = async () => {
        setIsLoading(true);
        setErrorMsg('');
        const decodedSlug = decodeURIComponent(orgSlug);

        // Robust Fetch: Handle duplicates and soft-deletes using maybeSingle()
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', decodedSlug)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            console.error('Org not found', error);
            setErrorMsg(`Organization not found for slug: "${decodedSlug}". Connection status: ${error ? error.message : 'No data returned (maybeSingle)'}`);

            // Fallback: lookup by ID
            const { data: dataById } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', decodedSlug)
                .is('deleted_at', null)
                .maybeSingle();

            if (dataById) {
                setOrg(dataById);
                setErrorMsg('');
            } else {
                // handle 404
            }
        } else {
            setOrg(data);
        }
        setIsLoading(false);
    };

    const fetchProperties = async () => {
        if (!org) return;
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false });

        if (!error && data) setProperties(data);
    };

    const fetchOrgUsers = async () => {
        if (!org) return;
        // Fetch users belonging to this org via membership
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                id, role, is_active, user_id,
                user:users (email, full_name, phone)
            `)
            .eq('organization_id', org.id);

        if (!error && data) {
            // Transform to shape
            const users = data.map((d: any) => ({
                id: d.id,
                user_id: d.user_id,
                role: d.role,
                is_active: d.is_active,
                user: d.user
            }));
            setOrgUsers(users);
        }
    };

    const handleCreateProperty = async (propData: any) => {
        if (!org) return;
        const { error } = await supabase.from('properties').insert({
            ...propData,
            organization_id: org.id
        });
        if (!error) {
            fetchProperties();
            setShowCreatePropModal(false);
        } else {
            alert('Failed to create property: ' + error.message);
        }
    };

    const navItems: { id: Tab, label: string, icon: any }[] = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'properties', label: 'Properties', icon: Building2 },
        { id: 'users', label: 'User Directory', icon: Users },
        { id: 'tickets', label: 'Ticketing', icon: Ticket },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (!org && !isLoading) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-slate-600 mt-2">{errorMsg || 'Organization not found.'}</p>
            <p className="text-xs text-slate-400 mt-4">Try checking your URL or contact support.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex font-inter text-slate-900">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-200">
                            {org?.name?.substring(0, 1) || 'O'}
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-tight text-slate-900">{org?.name || 'Organization'}</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Super Admin Console</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold ${activeTab === item.id
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={() => signOut()} className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-full transition-colors text-sm font-bold">
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 lg:p-12 overflow-y-auto min-h-screen">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab}</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Manage your organization's resources.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                            {user?.email?.substring(0, 2).toUpperCase()}
                        </div>
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
                        {activeTab === 'overview' && <OverviewTab org={org} />}
                        {activeTab === 'properties' && (
                            <PropertiesTab
                                properties={properties}
                                onCreate={() => setShowCreatePropModal(true)}
                            />
                        )}
                        {activeTab === 'users' && <UsersTab users={orgUsers} />}
                        {activeTab === 'tickets' && <div className="text-slate-400 font-bold italic">Ticketing Module Loading...</div>}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Create Property Modal */}
            {showCreatePropModal && (
                <CreatePropertyModal
                    onClose={() => setShowCreatePropModal(false)}
                    onCreate={handleCreateProperty}
                />
            )}
        </div>
    );
};

// Sub-components
const OverviewTab = ({ org }: { org: Organization | null }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Total Properties</h3>
            <p className="text-4xl font-black text-slate-900">12</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Total Users</h3>
            <p className="text-4xl font-black text-slate-900">48</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Open Tickets</h3>
            <p className="text-4xl font-black text-emerald-600">5</p>
        </div>
    </div>
);

const PropertiesTab = ({ properties, onCreate }: { properties: Property[], onCreate: () => void }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search properties..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100 w-64"
                />
            </div>
            <button
                onClick={onCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
                <Plus className="w-4 h-4" /> Add Property
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(prop => (
                <div key={prop.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wide group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            Active
                        </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{prop.name}</h3>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-6">
                        <MapPin className="w-3 h-3" />
                        {prop.address || 'No address provided'}
                    </div>
                    <button className="w-full py-3 border border-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors">
                        Manage Property
                    </button>
                </div>
            ))}
            {properties.length === 0 && (
                <div className="col-span-3 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">No properties found.</p>
                    <button onClick={onCreate} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">Create your first property</button>
                </div>
            )}
        </div>
    </div>
);

const UsersTab = ({ users }: { users: OrgUser[] }) => (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{u.user?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-400">{u.user?.email}</p>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide">
                                {u.role?.replace('_', ' ')}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <button className="text-slate-400 hover:text-slate-900 font-bold text-xs">Edit</button>
                        </td>
                    </tr>
                ))}
                {users.length === 0 && (
                    <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm italic">No users found in this organization.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const CreatePropertyModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (data: any) => void }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-900 mb-6">Add New Property</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Code</label>
                        <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                        <button onClick={() => onCreate({ name, code, address })} className="flex-1 py-3 font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800">Create</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrgAdminDashboard;
