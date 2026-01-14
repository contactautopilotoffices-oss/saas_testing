'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, Building2, Users, Ticket, Settings, UserCircle,
    Search, Plus, Filter, Bell, LogOut, ChevronRight, MapPin, Edit, Trash2, X, Check, UsersRound,
    Coffee, IndianRupee, FileDown, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { HapticCard } from '@/components/ui/HapticCard';
import UserDirectory from './UserDirectory';
import SignOutModal from '@/components/ui/SignOutModal';
import AdminSPOCDashboard from '../tickets/AdminSPOCDashboard';

// Types
type Tab = 'overview' | 'properties' | 'requests' | 'users' | 'visitors' | 'cafeteria' | 'settings' | 'profile' | 'revenue';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    image_url?: string;
    created_at: string;
}

interface OrgUser {
    user_id: string;
    role?: string; // Org role
    is_active: boolean;
    user: {
        id: string;
        email: string;
        full_name: string;
    };
    propertyMemberships: {
        property_id: string;
        property_name?: string;
        role: string;
    }[];
}

interface Organization {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
}

const OrgAdminDashboard = () => {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const orgSlugOrId = params?.orgId as string;

    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [org, setOrg] = useState<Organization | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreatePropModal, setShowCreatePropModal] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState('all');
    const [isPropSelectorOpen, setIsPropSelectorOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('User');

    // Derived state
    const activeProperty = selectedPropertyId === 'all'
        ? null
        : properties.find(p => p.id === selectedPropertyId);

    const supabase = createClient();

    useEffect(() => {
        if (orgSlugOrId) {
            fetchOrgDetails();
        }
    }, [orgSlugOrId]);

    useEffect(() => {
        if (org) {
            fetchProperties(); // ALWAYS fetch properties for the dropdown
            fetchUserRole(); // Fetch user role for profile
            if (activeTab === 'users') fetchOrgUsers();
        }
    }, [activeTab, org]);

    const fetchUserRole = async () => {
        if (!org || !user) return;

        const { data } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('organization_id', org.id)
            .eq('user_id', user.id)
            .single();

        if (data?.role) {
            // Format role for display (e.g., 'org_admin' -> 'Org Admin')
            const formattedRole = data.role.split('_').map((word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            setUserRole(formattedRole);
        }
    };

    const fetchOrgDetails = async () => {
        setIsLoading(true);
        setErrorMsg('');

        // 1. Decode URL param
        const decoded = decodeURIComponent(orgSlugOrId);

        // 2. Sanitize ID (Remove spaces/newlines that might have crept in)
        // This fixes the issue if the URL somehow looks like "uuid part 1 - uuid part 2"
        const cleanId = decoded.trim().replace(/\s+/g, '');

        console.log(`🔍 [Dashboard] Lookup Org ID: "${cleanId}" (Original: "${decoded}")`);

        // 3. Fetch strict by ID
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', cleanId)
            .is('deleted_at', null)
            .maybeSingle();

        if (error) {
            console.error('❌ [Dashboard] Supabase Error:', error);
            setErrorMsg(`Access Denied (403) or System Error. ID: ${cleanId}`);
        } else if (!data) {
            console.warn('⚠️ [Dashboard] Organization not found in DB.');
            setErrorMsg(`Organization not found. ID: ${cleanId}`);
        } else {
            console.log('✅ [Dashboard] Organization found:', data.name);
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

        // 🔹 Step 1: Fetch ORG-level users
        const { data: orgUsers, error: orgError } = await supabase
            .from('organization_memberships')
            .select(`
                user_id,
                role,
                is_active,
                user:users (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('organization_id', org.id)
            .eq('is_active', true);

        if (orgError) console.error('Error fetching org users:', orgError);

        // 🔹 Step 2: Fetch PROPERTY-level users for same org
        // 💡 !inner ensures only properties belonging to this org are included
        const { data: propertyUsers, error: propError } = await supabase
            .from('property_memberships')
            .select(`
                user_id,
                role,
                is_active,
                property:properties!inner (
                    id,
                    organization_id,
                    name
                ),
                user:users (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('properties.organization_id', org.id)
            .eq('is_active', true);

        if (propError) console.error('Error fetching property users:', propError);

        // 🔹 Step 3: Merge + deduplicate users (CRITICAL)
        const userMap = new Map<string, OrgUser>();

        // Org users
        orgUsers?.forEach((row: any) => {
            userMap.set(row.user_id, {
                user_id: row.user_id,
                role: row.role,
                is_active: row.is_active,
                user: row.user,
                propertyMemberships: []
            });
        });

        // Property users
        propertyUsers?.forEach((row: any) => {
            const existing = userMap.get(row.user_id);

            if (existing) {
                existing.propertyMemberships.push({
                    property_id: row.property.id,
                    property_name: row.property.name,
                    role: row.role
                });
            } else {
                userMap.set(row.user_id, {
                    user_id: row.user_id,
                    role: undefined, // No org-level role
                    is_active: row.is_active,
                    user: row.user,
                    propertyMemberships: [{
                        property_id: row.property.id,
                        property_name: row.property.name,
                        role: row.role
                    }]
                });
            }
        });

        setOrgUsers(Array.from(userMap.values()));
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

    const handleUpdateProperty = async (id: string, propData: any) => {
        const { error } = await supabase
            .from('properties')
            .update(propData)
            .eq('id', id);

        if (!error) {
            fetchProperties();
            setEditingProperty(null);
        } else {
            alert('Update failed: ' + error.message);
        }
    };

    const handleDeleteProperty = async (id: string) => {
        if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return;
        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchProperties();
        } else {
            alert('Delete failed: ' + error.message);
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        // Update user profile
        const { error: profileError } = await supabase
            .from('users')
            .update({
                full_name: data.full_name,
                phone: data.phone
            })
            .eq('id', userId);

        if (profileError) {
            alert('Failed to update profile: ' + profileError.message);
            return;
        }

        // Update org role if exists
        if (data.orgRole) {
            await supabase
                .from('organization_memberships')
                .update({ role: data.orgRole })
                .eq('user_id', userId)
                .eq('organization_id', org?.id);
        }

        fetchOrgUsers();
        setEditingUser(null);
        setShowUserModal(false);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Remove this user from the organization?')) return;

        // Remove from org memberships
        await supabase
            .from('organization_memberships')
            .delete()
            .eq('user_id', userId)
            .eq('organization_id', org?.id);

        // Remove from property memberships
        await supabase
            .from('property_memberships')
            .delete()
            .eq('user_id', userId)
            .eq('organization_id', org?.id);

        fetchOrgUsers();
    };


    if (!org && !isLoading) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-slate-600 mt-2">{errorMsg || 'Organization not found.'}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex font-inter text-foreground">
            {/* Sidebar */}
            <aside className="w-72 bg-[var(--sidebar-bg)] border-r border-border flex flex-col fixed h-full z-10 transition-smooth">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary rounded-[var(--radius-md)] flex items-center justify-center text-text-inverse font-display font-semibold text-lg shadow-sm">
                            {org?.name?.substring(0, 1) || 'O'}
                        </div>
                        <div>
                            <h2 className="font-display font-semibold text-sm leading-tight text-text-primary truncate max-w-[150px]">{org?.name || 'Organization'}</h2>
                            <p className="text-[10px] text-text-tertiary font-body font-medium mt-1">Super Admin Console</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Core Operations */}
                    <div className="mb-5">
                        <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                            <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'overview'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'requests'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                        </div>
                    </div>

                    {/* Management Hub */}
                    <div className="mb-5">
                        <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                            <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'users'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                User Management
                            </button>
                            <button
                                onClick={() => setActiveTab('properties')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'properties'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Property Management
                            </button>
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitor Management
                            </button>
                            <button
                                onClick={() => setActiveTab('revenue')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'revenue'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <IndianRupee className="w-4 h-4" />
                                Cafeteria Revenue
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-5">
                        <p className="text-[10px] font-medium text-text-tertiary tracking-widest px-4 mb-3 flex items-center gap-2 font-body">
                            <span className="w-0.5 h-3 bg-secondary rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'settings'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'profile'
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4" />
                                Profile
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="pt-5 border-t border-border p-5">
                    {/* User Profile Section */}
                    <div className="flex items-center gap-3 px-2 mb-5">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-text-inverse font-bold text-sm">
                            {user?.email?.[0].toUpperCase() || 'O'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-display font-semibold text-sm text-text-primary truncate">
                                {user?.user_metadata?.full_name || 'Super Admin'}
                            </span>
                            <span className="text-[10px] text-text-tertiary truncate font-body font-medium">
                                {user?.email}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-3 px-4 py-3 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-xl w-full transition-smooth text-sm font-body font-medium group"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {/* Main Content */}
            <main className={`flex-1 ml-72 overflow-y-auto min-h-screen ${activeTab === 'overview' ? '' : 'p-8 lg:p-12'}`}>
                {/* Only show header for non-overview tabs */}
                {activeTab !== 'overview' && (
                    <header className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight capitalize">{activeTab}</h1>
                            <p className="text-text-tertiary text-sm font-body font-medium mt-1">Manage your organization's resources.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Property Selector for Requests/Other tabs */}
                            {properties.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsPropSelectorOpen(!isPropSelectorOpen)}
                                        className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-4 py-2.5 hover:border-primary transition-smooth group min-w-[200px]"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-background flex items-center justify-center overflow-hidden">
                                            {activeProperty?.image_url ? (
                                                <img src={activeProperty.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                                            )}
                                        </div>
                                        <span className="text-sm font-body font-medium text-text-primary flex-1 text-left">
                                            {selectedPropertyId === 'all' ? 'All Properties' : activeProperty?.name}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isPropSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isPropSelectorOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-[60]"
                                                    onClick={() => setIsPropSelectorOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-2 w-72 bg-surface-elevated rounded-2xl shadow-2xl border border-border z-[70] overflow-hidden"
                                                >
                                                    <div className="p-2 border-b border-border">
                                                        <button
                                                            onClick={() => { setSelectedPropertyId('all'); setIsPropSelectorOpen(false); }}
                                                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${selectedPropertyId === 'all' ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-background'}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                                                                <LayoutDashboard className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-xs font-black uppercase tracking-tight">All Properties</p>
                                                                <p className="text-[10px] text-text-tertiary font-body font-medium">{properties.length} Locations</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                                                        {properties.map(prop => (
                                                            <button
                                                                key={prop.id}
                                                                onClick={() => { setSelectedPropertyId(prop.id); setIsPropSelectorOpen(false); }}
                                                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${selectedPropertyId === prop.id ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-background'}`}
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center overflow-hidden">
                                                                    {prop.image_url ? (
                                                                        <img src={prop.image_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Building2 className="w-4 h-4 text-slate-400" />
                                                                    )}
                                                                </div>
                                                                <div className="text-left overflow-hidden">
                                                                    <p className="text-xs font-black uppercase tracking-tight truncate">{prop.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{prop.code}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-display font-semibold text-text-primary tracking-tight">System Status</span>
                                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Online</span>
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
                        {activeTab === 'overview' && (
                            <OverviewTab
                                properties={properties}
                                orgId={org?.id || ''}
                                selectedPropertyId={selectedPropertyId}
                                setSelectedPropertyId={setSelectedPropertyId}
                            />
                        )}
                        {activeTab === 'revenue' && <RevenueTab properties={properties} selectedPropertyId={selectedPropertyId} />}
                        {activeTab === 'properties' && (
                            <PropertiesTab
                                properties={properties}
                                onCreate={() => setShowCreatePropModal(true)}
                                onEdit={(p: any) => setEditingProperty(p)}
                                onDelete={handleDeleteProperty}
                            />
                        )}
                        {activeTab === 'requests' && (
                            <div className="h-full">
                                <AdminSPOCDashboard
                                    organizationId={org?.id || ''}
                                    propertyId={selectedPropertyId === 'all' ? undefined : selectedPropertyId}
                                    propertyName={selectedPropertyId === 'all' ? 'All Properties' : activeProperty?.name}
                                    adminUser={{
                                        full_name: user?.user_metadata?.full_name || 'Super Admin',
                                        avatar_url: '' // Add avatar if available
                                    }}
                                />
                            </div>
                        )}
                        {activeTab === 'users' && (
                            <UserDirectory
                                orgId={org?.id}
                                propertyId={selectedPropertyId === 'all' ? undefined : selectedPropertyId}
                                properties={properties.map(p => ({ id: p.id, name: p.name }))}
                                onUserUpdated={fetchOrgUsers}
                            />
                        )}
                        {activeTab === 'visitors' && <VisitorsTab properties={properties} selectedPropertyId={selectedPropertyId} />}
                        {activeTab === 'cafeteria' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Coffee className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Cafeteria Management</h3>
                                <p className="text-slate-500">Cafeteria management module coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Settings</h3>
                                <p className="text-slate-500">System settings coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="flex justify-center items-start py-8">
                                <div className="bg-white border border-slate-100 rounded-3xl shadow-lg w-full max-w-md overflow-hidden">
                                    {/* Card Header with Autopilot Logo */}
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col items-center">
                                        {/* Autopilot Logo */}
                                        <div className="flex items-center gap-1 mb-4">
                                            <div className="w-8 h-8 relative flex items-center justify-center">
                                                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-white" />
                                                <div className="absolute w-1.5 h-1.5 bg-slate-900 rounded-full top-3 left-1/2 -translate-x-1/2" />
                                            </div>
                                            <span className="text-white text-2xl font-black tracking-tight">UTOPILOT</span>
                                        </div>

                                        {/* User Avatar */}
                                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4">
                                            <span className="text-4xl font-black text-white">
                                                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>

                                        {/* Role Badge */}
                                        <span className="px-4 py-1.5 bg-amber-500 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider">
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
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</span>
                                                <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                                                    {user?.id?.slice(0, 8) || 'N/A'}...
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                                                <span className="text-sm font-medium text-slate-700">
                                                    {user?.email || 'Not Set'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</span>
                                                <span className="text-sm font-bold text-slate-900">
                                                    {org?.name || 'Not Assigned'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center py-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold capitalize">
                                                    {userRole}
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

            {/* Modals */}
            {
                (showCreatePropModal || editingProperty) && (
                    <PropertyModal
                        property={editingProperty}
                        onClose={() => { setShowCreatePropModal(false); setEditingProperty(null); }}
                        onSave={editingProperty ? (data: any) => handleUpdateProperty(editingProperty.id, data) : handleCreateProperty}
                    />
                )
            }

            {
                showUserModal && (
                    <UserModal
                        user={editingUser}
                        onClose={() => { setShowUserModal(false); setEditingUser(null); }}
                        onSave={(data: any) => editingUser && handleUpdateUser(editingUser.user_id, data)}
                    />
                )
            }
        </div >
    );
};

const DieselSphere = ({ percentage }: { percentage: number }) => {
    return (
        <div className="relative w-40 h-40 mx-auto group">
            {/* Outer Glass Sphere */}
            <div className="absolute inset-0 rounded-full border-4 border-white/20 bg-slate-900/10 backdrop-blur-[2px] shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-700">
                {/* 3D Inner Shadow for Depth */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_10px_40px_rgba(0,0,0,0.5)] z-20" />

                {/* Liquid Fill */}
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${percentage}%` }}
                    transition={{ duration: 2, ease: "circOut" }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400"
                >
                    {/* Primary Wave */}
                    <motion.div
                        animate={{
                            x: [0, -100],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        className="absolute top-0 left-0 w-[400%] h-8 bg-amber-400/50 -translate-y-1/2 opacity-60"
                        style={{
                            borderRadius: '38% 42% 35% 45%',
                        }}
                    />

                    {/* Secondary Wave */}
                    <motion.div
                        animate={{
                            x: [-100, 0],
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        className="absolute top-1 left-0 w-[400%] h-8 bg-amber-300/30 -translate-y-1/2 opacity-40"
                        style={{
                            borderRadius: '45% 35% 42% 38%',
                        }}
                    />

                    {/* Bubbles animation */}
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                y: [0, -40],
                                opacity: [0, 0.6, 0],
                                x: [0, (i % 2 === 0 ? 10 : -10)],
                            }}
                            transition={{
                                duration: 2 + i,
                                repeat: Infinity,
                                delay: i * 0.5,
                            }}
                            className="absolute bottom-0 rounded-full bg-white/30 backdrop-blur-sm"
                            style={{
                                width: 4 + (i * 2),
                                height: 4 + (i * 2),
                                left: `${20 + (i * 15)}%`,
                            }}
                        />
                    ))}
                </motion.div>

                {/* Reflection/Lighting Highlights */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 z-30 pointer-events-none" />
                <div className="absolute top-4 left-10 w-12 h-6 bg-white/20 rounded-full blur-[4px] rotate-[-25deg] z-30 pointer-events-none" />
                <div className="absolute bottom-6 right-10 w-4 h-4 bg-amber-200/20 rounded-full blur-[2px] z-30 pointer-events-none" />
            </div>

            {/* Percentage Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                    {Math.round(percentage)}
                    <span className="text-sm ml-0.5 opacity-80">%</span>
                </motion.span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest drop-shadow-md">Diesel Level</span>
            </div>

            {/* Bottom Glow */}
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-amber-500/20 blur-xl rounded-full transition-opacity duration-300 ${percentage > 0 ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
};

// Sub-components
const OverviewTab = ({
    properties,
    orgId,
    selectedPropertyId,
    setSelectedPropertyId
}: {
    properties: Property[],
    orgId: string,
    selectedPropertyId: string,
    setSelectedPropertyId: (id: string) => void
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isOverviewSelectorOpen, setIsOverviewSelectorOpen] = useState(false);

    // Real data from org APIs
    const [ticketSummary, setTicketSummary] = useState({
        total_tickets: 0,
        open_tickets: 0,
        in_progress: 0,
        resolved: 0,
        sla_breached: 0,
        avg_resolution_hours: 0,
        properties: [] as any[],
    });

    const [dieselSummary, setDieselSummary] = useState({
        total_consumption: 0,
        change_percentage: 0,
        properties: [] as any[],
    });

    const [vmsSummary, setVmsSummary] = useState({
        total_visitors_today: 0,
        checked_in: 0,
        checked_out: 0,
        properties: [] as any[],
    });

    const [vendorSummary, setVendorSummary] = useState({
        total_revenue: 0,
        total_commission: 0,
        total_vendors: 0,
        properties: [] as any[],
    });

    // Fetch all org summaries
    useEffect(() => {
        if (!orgId) return;

        const fetchSummaries = async () => {
            setIsLoading(true);

            try {
                // Tickets summary
                const ticketsRes = await fetch(`/api/organizations/${orgId}/tickets-summary?period=month`);
                if (ticketsRes.ok) {
                    const data = await ticketsRes.json();
                    setTicketSummary(data);
                }

                // Diesel summary
                const dieselRes = await fetch(`/api/organizations/${orgId}/diesel-summary?period=month`);
                if (dieselRes.ok) {
                    const data = await dieselRes.json();
                    setDieselSummary({
                        total_consumption: data.org_summary?.total_litres || 0,
                        change_percentage: 0, // Not currently implemented in API
                        properties: data.properties || [],
                    });
                }

                // VMS summary
                const vmsRes = await fetch(`/api/organizations/${orgId}/vms-summary?period=today`);
                if (vmsRes.ok) {
                    const data = await vmsRes.json();
                    setVmsSummary({
                        total_visitors_today: data.total_visitors || 0,
                        checked_in: data.checked_in || 0,
                        checked_out: data.checked_out || 0,
                        properties: data.properties || [],
                    });
                }

                // Vendor summary
                const vendorRes = await fetch(`/api/organizations/${orgId}/vendor-summary?period=month`);
                if (vendorRes.ok) {
                    const data = await vendorRes.json();
                    setVendorSummary({
                        total_revenue: data.total_revenue || 0,
                        total_commission: data.total_commission || 0,
                        total_vendors: data.total_vendors || 0,
                        properties: data.properties || [],
                    });
                }
            } catch (error) {
                console.error('Error fetching org summaries:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummaries();
    }, [orgId]);

    const activeProperty = selectedPropertyId === 'all'
        ? null
        : properties.find(p => p.id === selectedPropertyId);

    // Derive display stats based on selection
    const displayTicketStats = useMemo(() => {
        if (selectedPropertyId === 'all') return ticketSummary;

        const propStats = ticketSummary.properties?.find(p => p.property_id === selectedPropertyId);
        if (!propStats) return {
            total_tickets: 0,
            open_tickets: 0,
            in_progress: 0,
            resolved: 0,
            sla_breached: 0,
            avg_resolution_hours: 0,
            properties: ticketSummary.properties
        };

        return {
            total_tickets: propStats.total,
            open_tickets: propStats.open,
            in_progress: propStats.in_progress,
            resolved: propStats.resolved,
            sla_breached: propStats.sla_breached,
            avg_resolution_hours: ticketSummary.avg_resolution_hours,
            properties: ticketSummary.properties
        };
    }, [selectedPropertyId, ticketSummary]);

    const displayDieselStats = useMemo(() => {
        if (selectedPropertyId === 'all') return dieselSummary;
        const propStats = dieselSummary.properties?.find(p => p.property_id === selectedPropertyId);
        return {
            total_consumption: propStats?.period_total_litres || 0,
            change_percentage: 0,
            properties: dieselSummary.properties
        };
    }, [selectedPropertyId, dieselSummary]);

    const displayVmsStats = useMemo(() => {
        if (selectedPropertyId === 'all') return vmsSummary;
        const propStats = (vmsSummary as any).properties?.find((p: any) => p.property_id === selectedPropertyId);
        return {
            total_visitors_today: propStats?.today || 0,
            checked_in: propStats?.checked_in || 0,
            checked_out: propStats?.checked_out || 0,
        };
    }, [selectedPropertyId, vmsSummary]);

    const displayVendorStats = useMemo(() => {
        if (selectedPropertyId === 'all') return vendorSummary;
        const propStats = (vendorSummary as any).properties?.find((p: any) => p.property_id === selectedPropertyId);
        return {
            total_revenue: propStats?.total_revenue || 0,
            total_commission: propStats?.total_commission || 0,
            total_vendors: propStats?.vendor_count || 0,
        };
    }, [selectedPropertyId, vendorSummary]);

    // Calculated metrics
    const completionRate = displayTicketStats.total_tickets > 0
        ? Math.round((displayTicketStats.resolved / displayTicketStats.total_tickets) * 100 * 10) / 10
        : 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header Section */}
            <div className="bg-[#708F96] px-8 lg:px-12 py-10 border-b border-white/10 shadow-lg relative z-[100]">
                <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-black text-white">Unified Dashboard</h1>

                        <div className="relative">
                            <button
                                onClick={() => setIsOverviewSelectorOpen(!isOverviewSelectorOpen)}
                                className="flex items-center gap-3 bg-[#5A737A] text-white border border-white/10 rounded-xl px-4 py-2.5 shadow-sm hover:border-white/50 transition-all group min-w-[220px]"
                            >
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
                                    {activeProperty?.image_url ? (
                                        <img src={activeProperty.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-3.5 h-3.5 text-white/70" />
                                    )}
                                </div>
                                <span className="text-sm font-bold flex-1 text-left">
                                    {selectedPropertyId === 'all' ? 'All Properties' : activeProperty?.name}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOverviewSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isOverviewSelectorOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[110]"
                                            onClick={() => setIsOverviewSelectorOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute left-0 mt-2 w-80 bg-[#5A737A] rounded-2xl shadow-2xl border border-white/10 z-[120] overflow-hidden"
                                        >
                                            <div className="p-2 border-b border-white/10">
                                                <button
                                                    onClick={() => { setSelectedPropertyId('all'); setIsOverviewSelectorOpen(false); }}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedPropertyId === 'all' ? 'bg-yellow-400 text-slate-900' : 'text-white hover:bg-white/10'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                                                        <LayoutDashboard className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black uppercase tracking-tight">Show All Properties</p>
                                                        <p className={`text-[10px] font-bold ${selectedPropertyId === 'all' ? 'text-slate-900/60' : 'text-white/60'}`}>{properties.length} Active Locations</p>
                                                    </div>
                                                </button>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                                                {properties.map(prop => (
                                                    <button
                                                        key={prop.id}
                                                        onClick={() => { setSelectedPropertyId(prop.id); setIsOverviewSelectorOpen(false); }}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedPropertyId === prop.id ? 'bg-yellow-400 text-slate-900' : 'text-white hover:bg-white/10'}`}
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                                                            {prop.image_url ? (
                                                                <img src={prop.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Building2 className="w-5 h-5 text-white/50" />
                                                            )}
                                                        </div>
                                                        <div className="text-left overflow-hidden">
                                                            <p className="text-xs font-black uppercase tracking-tight truncate">{prop.name}</p>
                                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedPropertyId === prop.id ? 'text-slate-900/60' : 'text-white/40'}`}>{prop.code}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <Search className="w-6 h-6 text-white/70 cursor-pointer hover:text-white transition-colors" />
                    </div>
                </div>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-yellow-400 text-sm font-bold">Dashboard /Home</span>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {/* Active Requests */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Open Tickets</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{displayTicketStats.open_tickets + displayTicketStats.in_progress}</span>
                            <span className="text-[10px] text-rose-500 font-bold uppercase">{displayTicketStats.sla_breached} SLA breached</span>
                        </div>
                    </div>

                    {/* Resolved */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Resolved</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{displayTicketStats.resolved}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Avg {displayTicketStats.avg_resolution_hours}h resolution</span>
                        </div>
                    </div>

                    {/* Completion Rate */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Completion Rate</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{completionRate}%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{displayTicketStats.resolved} of {displayTicketStats.total_tickets} closed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid - with padding */}
            <div className="px-8 lg:px-12 py-5 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column */}
                    <div className="lg:col-span-3 space-y-5">
                        {/* Diesel Consumption */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-900">Diesel Consumption</h3>
                            </div>
                            <div className="text-amber-500 text-xs font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                Real-time Tank Status
                            </div>

                            {/* 3D Sphere Visualization */}
                            <div className="flex justify-center my-6">
                                <DieselSphere percentage={Math.min(100, (displayDieselStats.total_consumption / 5000) * 100)} />
                            </div>

                            <div className="space-y-1">
                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total consumption</div>
                                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1">
                                    {displayDieselStats.total_consumption.toLocaleString()}
                                    <span className="text-sm text-slate-400 font-bold">L</span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-50 mt-2">
                                    <span className={`font-black text-xs ${displayDieselStats.change_percentage >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {displayDieselStats.change_percentage >= 0 ? '+' : ''}{displayDieselStats.change_percentage}%
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">vs Last Month</span>
                                </div>
                            </div>
                        </div>

                        {/* Vendor Revenue */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-2">Vendor Revenue</h3>
                            <div className="text-slate-400 text-xs font-bold mb-2">This Month</div>
                            <div className="text-3xl font-black text-slate-900">₹ {displayVendorStats.total_revenue.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-2">
                                Commission: ₹ {displayVendorStats.total_commission.toLocaleString()} from {displayVendorStats.total_vendors} vendors
                            </div>
                        </div>
                    </div>

                    {/* Center Column - Property Card */}
                    <div className="lg:col-span-4">
                        <div className="bg-yellow-400 rounded-3xl p-5 h-full relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
                                {properties.length}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">
                                {activeProperty ? activeProperty.name : 'All Properties'}
                            </h3>
                            <div className="text-red-600 text-sm font-bold mb-5 truncate">
                                {activeProperty ? `Property: ${activeProperty.code}` : 'Multi-Property View'}
                            </div>

                            {/* Building Image */}
                            <div className="bg-yellow-500/50 rounded-[2rem] h-56 mb-5 flex items-center justify-center overflow-hidden border-4 border-white/30 shadow-2xl group relative">
                                {activeProperty?.image_url ? (
                                    <>
                                        <img
                                            src={activeProperty.image_url}
                                            alt={activeProperty.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent" />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Building2 className="w-20 h-20 text-yellow-600/30" />
                                        <span className="text-[10px] font-black text-yellow-700/40 uppercase tracking-widest">Awaiting Visuals</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-slate-700 text-xs font-bold">Visitors Today</div>
                                    <div className="text-2xl font-black text-slate-900">{displayVmsStats.total_visitors_today}</div>
                                </div>
                                <div>
                                    <div className="text-slate-700 text-xs font-bold">Checked In / Out</div>
                                    <div className="text-2xl font-black text-slate-900">{displayVmsStats.checked_in} / {displayVmsStats.checked_out}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* Property Breakdown */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-4">Tickets by Property</h3>
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {(ticketSummary as any).properties?.slice(0, 5).map((prop: any, idx: number) => (
                                    <div key={prop.property_id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{prop.property_name}</div>
                                            <div className="text-xs text-slate-500">{prop.open} open · {prop.resolved} resolved</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-slate-900">{prop.total}</div>
                                            <div className="text-xs text-slate-400">total</div>
                                        </div>
                                    </div>
                                ))}
                                {!(ticketSummary as any).properties?.length && (
                                    <div className="text-center text-slate-400 py-4">No ticket data available</div>
                                )}
                            </div>
                        </div>

                        {/* Module Summary */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-4">Module Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-xl">
                                    <div className="text-xs font-bold text-blue-600 mb-1">Tickets</div>
                                    <div className="text-2xl font-black text-blue-900">{displayTicketStats.total_tickets}</div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-xl">
                                    <div className="text-xs font-bold text-emerald-600 mb-1">Visitors</div>
                                    <div className="text-2xl font-black text-emerald-900">{displayVmsStats.total_visitors_today}</div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl">
                                    <div className="text-xs font-bold text-amber-600 mb-1">Diesel (L)</div>
                                    <div className="text-2xl font-black text-amber-900">{displayDieselStats.total_consumption}</div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl">
                                    <div className="text-xs font-bold text-purple-600 mb-1">Vendors</div>
                                    <div className="text-2xl font-black text-purple-900">{displayVendorStats.total_vendors}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

const PropertiesTab = ({ properties, onCreate, onEdit, onDelete }: any) => (
    <div className="space-y-5">
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
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
                <Plus className="w-4 h-4" /> Add Property
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((prop: any) => (
                <div key={prop.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col">
                    {/* Image Header with aspect-ratio handling */}
                    <div className="relative h-56 bg-slate-50 overflow-hidden">
                        {prop.image_url ? (
                            <img
                                src={prop.image_url}
                                alt={prop.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 gap-2">
                                <Building2 className="w-16 h-16" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Standard Asset View</span>
                            </div>
                        )}

                        {/* Overlay Controls */}
                        <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                            <button
                                onClick={() => onEdit(prop)}
                                className="p-3 bg-white/90 backdrop-blur-xl text-slate-600 rounded-2xl hover:bg-blue-500 hover:text-white shadow-xl shadow-black/5 transition-all"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(prop.id)}
                                className="p-3 bg-white/90 backdrop-blur-xl text-slate-600 rounded-2xl hover:bg-rose-500 hover:text-white shadow-xl shadow-black/5 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Property Tag */}
                        <div className="absolute bottom-4 left-4">
                            <span className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-xl uppercase tracking-widest border border-white/10 shadow-lg">
                                {prop.code}
                            </span>
                        </div>
                    </div>

                    <div className="p-8 flex-1 flex flex-col">
                        <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 truncate decoration-blue-500 decoration-4">{prop.name}</h3>
                        <div className="flex items-start gap-2.5 text-slate-500 text-xs font-medium mb-8">
                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-2 leading-relaxed">{prop.address || 'No physical address registered'}</span>
                        </div>

                        <button className="w-full py-4 bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl text-[10px] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all mt-auto uppercase tracking-[0.2em] shadow-sm">
                            View Live Analytics
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const UsersTab = ({ users, orgId, allProperties, onEdit, onDelete }: any) => (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-900">User Directory</h3>
            <div className="flex gap-2">
                <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-900 transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>
        </div>
        <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Role</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {users.map((u: any) => (
                    <tr key={`${u.user_id}-${orgId}`} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs">
                                    {u.user?.full_name?.substring(0, 1) || 'U'}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{u.user?.full_name || 'Unknown'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{u.user?.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            {u.role ? (
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${u.role === 'org_super_admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white'
                                    }`}>
                                    {u.role?.replace(/_/g, ' ')}
                                </span>
                            ) : u.propertyMemberships?.[0] ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {u.propertyMemberships[0].role?.replace(/_/g, ' ')}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-slate-400 italic uppercase tracking-wider">
                                    No Assignment
                                </span>
                            )}
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                {u.role === 'org_super_admin' ? (
                                    // Super Admins see all properties
                                    allProperties.map((p: any) => (
                                        <div key={p.id} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[9px] font-black border border-emerald-100 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {p.name}
                                            <span className="opacity-50 text-[8px] tracking-tighter ml-1 font-bold">ALL ACCESS</span>
                                        </div>
                                    ))
                                ) : (
                                    // Others see assigned properties with their specific roles
                                    u.propertyMemberships?.map((pm: any) => (
                                        <div key={pm.property_id} className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[9px] font-black border border-slate-100 flex items-center gap-1 group/chip hover:bg-white transition-colors">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            {pm.property_name}
                                            <span className="bg-slate-200 text-slate-500 px-1 py-0.5 rounded text-[8px] ml-1 uppercase letter-spacing-tight">
                                                {pm.role?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ))
                                )}
                                {u.role !== 'org_super_admin' && (!u.propertyMemberships || u.propertyMemberships.length === 0) && (
                                    <span className="text-slate-300 text-[10px] italic">No directly assigned properties</span>
                                )}
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => onEdit(u)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDelete(u.user_id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const PropertyModal = ({ property, onClose, onSave }: any) => {
    const [name, setName] = useState(property?.name || '');
    const [code, setCode] = useState(property?.code || '');
    const [address, setAddress] = useState(property?.address || '');
    const [imageUrl, setImageUrl] = useState(property?.image_url || '');
    const [isDragging, setIsDragging] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
                <button onClick={onClose} className="absolute right-6 top-5 text-slate-300 hover:text-slate-900 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                            {property ? 'Edit Property' : 'Add Property'}
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">Define your physical asset details.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Property Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="e.g. Skyline Towers" />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Property Code</label>
                        <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="e.g. SKY-01" />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="123 Main St, City" />
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Property Image</label>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`relative h-40 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-slate-50 ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
                                }`}
                        >
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setImageUrl('')}
                                        className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Drop Image Here</p>
                                        <p className="text-[9px] text-slate-400 font-bold">or click to browse</p>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} className="flex-1 py-4 font-black text-slate-400 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                        <button onClick={() => onSave({ name, code, address, image_url: imageUrl })} className="flex-1 py-4 font-black text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" /> {property ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

const UserModal = ({ user, onClose, onSave }: any) => {
    const [fullName, setFullName] = useState(user?.user?.full_name || '');
    const [phone, setPhone] = useState(user?.user?.phone || '');
    const [orgRole, setOrgRole] = useState(user?.role || 'org_admin');

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative"
            >
                <button onClick={onClose} className="absolute right-6 top-5 text-slate-300 hover:text-slate-900 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">Edit User</h3>
                        <p className="text-slate-400 text-sm font-medium">{user?.user?.email}</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Organization Role</label>
                        <select value={orgRole} onChange={e => setOrgRole(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 appearance-none">
                            <option value="org_super_admin">Super Admin</option>
                            <option value="org_admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} className="flex-1 py-4 font-black text-slate-400 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                        <button onClick={() => onSave({ full_name: fullName, phone, orgRole })} className="flex-1 py-4 font-black text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-colors uppercase text-xs tracking-widest">
                            Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

const RevenueTab = ({ properties, selectedPropertyId }: { properties: any[], selectedPropertyId: string }) => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(selectedPropertyId);
    const supabase = createClient();

    useEffect(() => {
        setSelectedProperty(selectedPropertyId);
    }, [selectedPropertyId]);

    useEffect(() => {
        fetchRevenueData();
    }, [selectedProperty]);

    const fetchRevenueData = async () => {
        setIsLoading(true);
        try {
            let query = supabase.from('vendors').select('*, properties(name), vendor_daily_revenue(*)');
            if (selectedProperty !== 'all') {
                query = query.eq('property_id', selectedProperty);
            }
            const { data, error } = await query;
            if (error) throw error;
            setVendors(data || []);
        } catch (err) {
            console.error('Error fetching revenue:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportAll = () => {
        const headers = ['Property', 'Shop Name', 'Owner', 'Commission %', 'Revenue', 'Commission Due'];
        const rows = vendors.map(v => {
            const rev = v.vendor_daily_revenue?.reduce((sum: number, r: any) => sum + r.revenue_amount, 0) || 0;
            const comm = (rev * (v.commission_rate / 100)).toFixed(2);
            return [v.properties?.name, v.shop_name, v.owner_name, v.commission_rate + '%', rev, comm];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `organization_revenue_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold italic">Gathering intelligence...</div>;

    const totalRevenue = vendors.reduce((acc, v) => acc + (v.vendor_daily_revenue?.reduce((sum: number, r: any) => sum + r.revenue_amount, 0) || 0), 0);
    const totalCommission = vendors.reduce((acc, v) => {
        const rev = v.vendor_daily_revenue?.reduce((sum: number, r: any) => sum + r.revenue_amount, 0) || 0;
        return acc + (rev * (v.commission_rate / 100));
    }, 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">Revenue Analytics</h2>
                    <p className="text-slate-500 text-sm font-medium">Cross-property financial oversight.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        className="flex-1 md:flex-none p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 text-xs focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                        <option value="all">All Properties</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button
                        onClick={handleExportAll}
                        className="p-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <FileDown className="w-4 h-4" /> Export All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Revenue</p>
                    <p className="text-3xl font-black text-slate-900 relative z-10">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Commission</p>
                    <p className="text-3xl font-black text-emerald-600 relative z-10">₹{totalCommission.toLocaleString()}</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Vendors</p>
                    <p className="text-3xl font-black text-slate-900 relative z-10">{vendors.length}</p>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property / Shop</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Comm %</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Commission</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold italic">No vendor data available.</td>
                                </tr>
                            ) : (
                                vendors.map((v) => {
                                    const rev = v.vendor_daily_revenue?.reduce((sum: number, r: any) => sum + r.revenue_amount, 0) || 0;
                                    const comm = rev * (v.commission_rate / 100);
                                    return (
                                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{v.shop_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.properties?.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-slate-600">{v.owner_name}</td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-wider">{v.commission_rate}%</span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-sm text-slate-900">₹{rev.toLocaleString()}</td>
                                            <td className="px-8 py-5 text-right font-black text-sm text-emerald-600">₹{comm.toLocaleString()}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const VisitorsTab = ({ properties, selectedPropertyId }: { properties: any[], selectedPropertyId: string }) => {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(selectedPropertyId);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const supabase = createClient();

    useEffect(() => {
        setSelectedProperty(selectedPropertyId);
    }, [selectedPropertyId]);

    useEffect(() => {
        fetchVisitors();
    }, [selectedProperty, dateFilter]);

    const fetchVisitors = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('visitor_logs')
                .select('*, properties(name)')
                .order('checkin_time', { ascending: false });

            if (selectedProperty !== 'all') {
                query = query.eq('property_id', selectedProperty);
            }

            // Apply date filter
            if (dateFilter !== 'all') {
                const now = new Date();
                let startDate: Date;

                if (dateFilter === 'today') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (dateFilter === 'week') {
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                } else if (dateFilter === 'month') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else {
                    startDate = new Date(0);
                }

                query = query.gte('checkin_time', startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            setVisitors(data || []);
        } catch (err) {
            console.error('Error fetching visitors:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredVisitors = visitors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.mobile && v.mobile.includes(searchTerm))
    );

    const getDuration = (checkin: string, checkout: string | null) => {
        const start = new Date(checkin);
        const end = checkout ? new Date(checkout) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const handleExport = () => {
        const headers = ['Visitor ID', 'Property', 'Name', 'Mobile', 'Category', 'Host', 'Check In', 'Status'];
        const rows = filteredVisitors.map(v => [
            v.visitor_id,
            v.properties?.name || 'Unknown',
            v.name,
            v.mobile || '-',
            v.category,
            v.whom_to_meet,
            new Date(v.checkin_time).toLocaleString(),
            v.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "visitor_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">Visitor Management</h2>
                    <p className="text-slate-500 text-sm font-medium">Track and manage visitors across all properties.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search visitors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                        <option value="all">All Properties</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                    <button
                        onClick={handleExport}
                        className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors"
                    >
                        <FileDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Host / Purpose</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading visitors...</td></tr>
                            ) : filteredVisitors.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No visitors found matching your criteria.</td></tr>
                            ) : (
                                filteredVisitors.map((visitor) => (
                                    <tr
                                        key={visitor.id}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedVisitor(visitor)}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {visitor.photo_url ? (
                                                    <img
                                                        src={visitor.photo_url}
                                                        alt={visitor.name}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-100"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                                        {visitor.name?.[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors">{visitor.name}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{visitor.mobile || 'No mobile'}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{visitor.visitor_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-sm font-bold text-slate-700">{visitor.properties?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-bold text-slate-900">{visitor.whom_to_meet}</div>
                                            <div className="text-xs text-slate-500 capitalize">{visitor.category}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-xs font-bold text-slate-900">
                                                In: {new Date(visitor.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {visitor.checkout_time && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Out: {new Date(visitor.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${visitor.status === 'checked_in'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {visitor.status === 'checked_in' ? 'On Premise' : 'Checked Out'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visitor Info Modal */}
            <AnimatePresence>
                {selectedVisitor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedVisitor(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with Photo */}
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white relative">
                                <button
                                    onClick={() => setSelectedVisitor(null)}
                                    className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-4">
                                    {selectedVisitor.photo_url ? (
                                        <img
                                            src={selectedVisitor.photo_url}
                                            alt={selectedVisitor.name}
                                            className="w-20 h-20 rounded-2xl object-cover border-4 border-white/30"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
                                            <UserCircle className="w-10 h-10" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-2xl font-black">{selectedVisitor.name}</h3>
                                        <p className="text-white/70 font-mono text-sm">{selectedVisitor.visitor_id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                        <p className="text-slate-900 font-medium capitalize">{selectedVisitor.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</p>
                                        <p className="text-slate-900 font-medium">{selectedVisitor.mobile || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coming From</p>
                                        <p className="text-slate-900 font-medium">{selectedVisitor.coming_from || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Whom to Meet</p>
                                        <p className="text-slate-900 font-medium">{selectedVisitor.whom_to_meet}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in</p>
                                            <p className="text-slate-900 font-medium">
                                                {new Date(selectedVisitor.checkin_time).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                                            <p className="text-slate-900 font-bold">
                                                {getDuration(selectedVisitor.checkin_time, selectedVisitor.checkout_time)}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedVisitor.checkout_time && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-out</p>
                                            <p className="text-slate-900 font-medium">
                                                {new Date(selectedVisitor.checkout_time).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrgAdminDashboard;
