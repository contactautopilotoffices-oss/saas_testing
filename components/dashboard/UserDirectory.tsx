'use client';

import React, { useState, useEffect } from 'react';
import {
    Users, Search, Filter, UserPlus, Trash2, RefreshCw,
    Edit2, Check, X, ChevronDown, Building2, Star, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import InviteMemberModal from './InviteMemberModal'; // This is actually our AddMemberModal now

interface UserWithMembership {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    user_photo_url?: string;
    orgRole?: string;
    propertyRole?: string;
    propertyName?: string;
    propertyId?: string;
    organizationId?: string;
    organizationName?: string;
    is_active: boolean;
    joined_at: string;
    phone?: string;
}

interface UserDirectoryProps {
    orgId?: string;
    orgName?: string;
    propertyId?: string;
    properties?: { id: string; name: string }[];
    onUserUpdated?: () => void;
}

const UserDirectory = ({ orgId, orgName, propertyId, properties = [], onUserUpdated }: UserDirectoryProps) => {
    const [users, setUsers] = useState<UserWithMembership[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [propertyFilter, setPropertyFilter] = useState('all');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingRole, setEditingRole] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserWithMembership | null>(null);

    const supabase = createClient();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchUsers();
    }, [orgId, propertyId]);

    const fetchUsers = async () => {
        setIsLoading(true);

        if (propertyId) {
            // Fetch property-level users
            const { data, error } = await supabase
                .from('property_memberships')
                .select(`
                    role,
                    is_active,
                    created_at,
                    property:properties (id, name),
                    user:users (id, full_name, email, user_photo_url, phone)
                `)
                .eq('property_id', propertyId);

            if (!error && data) {
                const formattedUsers: UserWithMembership[] = data.map((item: any) => ({
                    id: item.user.id,
                    full_name: item.user.full_name,
                    email: item.user.email,
                    user_photo_url: item.user.user_photo_url,
                    propertyRole: item.role,
                    propertyName: item.property?.name,
                    propertyId: item.property?.id,
                    is_active: item.is_active,
                    joined_at: item.created_at,
                    phone: item.user.phone
                }));
                setUsers(formattedUsers);
            }
        } else if (orgId) {
            // Fetch org-level users + property users
            const { data: orgUsers, error: orgError } = await supabase
                .from('organization_memberships')
                .select(`
                    role,
                    is_active,
                    created_at,
                    user:users (id, full_name, email, user_photo_url, phone)
                `)
                .eq('organization_id', orgId);

            const { data: propUsers, error: propError } = await supabase
                .from('property_memberships')
                .select(`
                    role,
                    is_active,
                    created_at,
                    property:properties!inner (id, name, organization_id),
                    user:users (id, full_name, email, user_photo_url, phone)
                `)
                .eq('properties.organization_id', orgId);

            const userMap = new Map<string, UserWithMembership>();

            orgUsers?.forEach((item: any) => {
                userMap.set(item.user.id, {
                    id: item.user.id,
                    full_name: item.user.full_name,
                    email: item.user.email,
                    user_photo_url: item.user.user_photo_url,
                    orgRole: item.role,
                    organizationId: orgId,
                    is_active: item.is_active,
                    joined_at: item.created_at,
                    phone: item.user.phone
                });
            });

            propUsers?.forEach((item: any) => {
                const existing = userMap.get(item.user.id);
                if (existing) {
                    existing.propertyRole = item.role;
                    existing.propertyName = item.property?.name;
                    existing.propertyId = item.property?.id;
                } else {
                    userMap.set(item.user.id, {
                        id: item.user.id,
                        full_name: item.user.full_name,
                        email: item.user.email,
                        user_photo_url: item.user.user_photo_url,
                        propertyRole: item.role,
                        propertyName: item.property?.name,
                        propertyId: item.property?.id,
                        is_active: item.is_active,
                        joined_at: item.created_at,
                        phone: item.user.phone
                    });
                }
            });

            setUsers(Array.from(userMap.values()));
        }

        setIsLoading(false);
    };

    const handleResetPassword = async (userId: string, email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;

        try {
            const response = await fetch('/api/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                showToast('Password reset email sent!');
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to send reset email', 'error');
            }
        } catch (err) {
            showToast('Failed to send reset email', 'error');
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to remove ${userName}? This action cannot be undone.`)) return;

        try {
            // Remove from property memberships
            if (propertyId) {
                await supabase
                    .from('property_memberships')
                    .delete()
                    .eq('user_id', userId)
                    .eq('property_id', propertyId);
            } else if (orgId) {
                // Remove from org memberships
                await supabase
                    .from('organization_memberships')
                    .delete()
                    .eq('user_id', userId)
                    .eq('organization_id', orgId);

                // Also remove from property memberships for this org
                const { data: props } = await supabase
                    .from('properties')
                    .select('id')
                    .eq('organization_id', orgId);

                if (props) {
                    for (const prop of props) {
                        await supabase
                            .from('property_memberships')
                            .delete()
                            .eq('user_id', userId)
                            .eq('property_id', prop.id);
                    }
                }
            }

            showToast('User removed successfully');
            fetchUsers();
            onUserUpdated?.();
        } catch (err) {
            showToast('Failed to remove user', 'error');
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            if (propertyId) {
                await supabase
                    .from('property_memberships')
                    .update({ role: newRole })
                    .eq('user_id', userId)
                    .eq('property_id', propertyId);
            } else if (orgId) {
                await supabase
                    .from('organization_memberships')
                    .update({ role: newRole })
                    .eq('user_id', userId)
                    .eq('organization_id', orgId);
            }

            showToast('Role updated successfully');
            setEditingUserId(null);
            fetchUsers();
            onUserUpdated?.();
        } catch (err) {
            showToast('Failed to update role', 'error');
        }
    };

    const roleOptions = propertyId
        ? ['property_admin', 'staff', 'mst', 'security', 'tenant']
        : ['org_super_admin', 'property_admin', 'staff', 'mst', 'security', 'tenant'];

    const formatRole = (role: string) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const userRole = u.orgRole || u.propertyRole || '';
        const matchesRole = roleFilter === 'all' || userRole === roleFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && u.is_active) ||
            (statusFilter === 'inactive' && !u.is_active);
        const matchesProperty = propertyFilter === 'all' || u.propertyId === propertyFilter;

        return matchesSearch && matchesRole && matchesStatus && matchesProperty;
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Management</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage user access, roles, and permissions.</p>
                </div>
                {orgId && (
                    <button
                        onClick={() => {
                            // Check if a parent component (like PropertyAdminDashboard) provided a specific modal trigger
                            const parentTrigger = (onUserUpdated as any)?.__triggerModal;
                            if (parentTrigger) {
                                parentTrigger();
                            } else {
                                setShowInviteModal(true);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black text-sm rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    <option value="all">All Roles</option>
                    {roleOptions.map(role => (
                        <option key={role} value={role}>{formatRole(role)}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                {properties.length > 0 && (
                    <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                    >
                        <option value="all">All Properties</option>
                        {properties.map(prop => (
                            <option key={prop.id} value={prop.id}>{prop.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* User Cards */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No users found.</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUserForProfile(user)}
                            className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Left Side: User Info + Badges */}
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center mt-1 group-hover:scale-105 transition-transform">
                                        {user.user_photo_url || user.avatar_url ? (
                                            <img
                                                src={user.user_photo_url || user.avatar_url}
                                                alt={user.full_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <UserCircle className="w-8 h-8 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{user.full_name}</h3>
                                        <p className="text-sm text-slate-500 truncate mb-2">{user.email}</p>

                                        {/* Badges & Edit Role - Now below name/email */}
                                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {/* Role Badge */}
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-100">
                                                <Star className="w-3 h-3" />
                                                {formatRole(user.orgRole || user.propertyRole || 'member')}
                                            </span>

                                            {/* Property Badge */}
                                            {user.propertyName && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100">
                                                    <Building2 className="w-3 h-3" />
                                                    {user.propertyName}
                                                </span>
                                            )}

                                            {/* Status Badge */}
                                            <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${user.is_active
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                {user.is_active ? 'approved' : 'pending'}
                                            </span>

                                            {/* Edit Role Logic */}
                                            {editingUserId === user.id ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={editingRole}
                                                        onChange={(e) => setEditingRole(e.target.value)}
                                                        className="px-2 py-1 text-[10px] font-black uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                                    >
                                                        {roleOptions.map(role => (
                                                            <option key={role} value={role}>{formatRole(role)}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleUpdateRole(user.id, editingRole)}
                                                        className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUserId(null)}
                                                        className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingUserId(user.id);
                                                        setEditingRole(user.orgRole || user.propertyRole || 'staff');
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    Edit Role
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Action Buttons */}
                                <div className="flex items-center gap-2 shrink-0 md:self-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleResetPassword(user.id, user.email)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Reset Password
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600 transition-colors shadow-md shadow-rose-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Member Modal */}
            {orgId && (
                <InviteMemberModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    orgId={orgId}
                    orgName={orgName || 'Organization'}
                    properties={properties}
                    onSuccess={() => {
                        fetchUsers();
                        showToast('Member account created successfully!');
                    }}
                />
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success'
                            ? 'bg-emerald-900 border-emerald-500/50 text-emerald-50'
                            : 'bg-rose-900 border-rose-500/50 text-rose-50'
                            }`}>
                            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* User Profile Modal */}
            <AnimatePresence>
                {selectedUserForProfile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
                        onClick={() => setSelectedUserForProfile(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Card Header with Autopilot Logo */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col items-center">
                                {/* Autopilot Logo */}
                                <div className="flex items-center justify-center mb-6">
                                    <img
                                        src="/autopilot-logo-new.png"
                                        alt="Autopilot Logo"
                                        className="h-10 w-auto object-contain invert mix-blend-screen"
                                    />
                                </div>

                                {/* User Avatar */}
                                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4 overflow-hidden shadow-xl">
                                    {selectedUserForProfile.user_photo_url || selectedUserForProfile.avatar_url ? (
                                        <img
                                            src={selectedUserForProfile.user_photo_url || selectedUserForProfile.avatar_url}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl font-black text-white">
                                            {selectedUserForProfile.full_name?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>

                                {/* Role Badge */}
                                <span className="px-4 py-1.5 bg-amber-500 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                                    {formatRole(selectedUserForProfile.orgRole || selectedUserForProfile.propertyRole || 'User')}
                                </span>
                            </div>

                            {/* Card Body with User Info */}
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {selectedUserForProfile.full_name}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {selectedUserForProfile.phone || 'Not Set'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                                            {selectedUserForProfile.email}
                                        </span>
                                    </div>

                                    {selectedUserForProfile.propertyName && (
                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</span>
                                            <span className="text-sm font-bold text-slate-900">
                                                {selectedUserForProfile.propertyName}
                                            </span>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-center">
                                        <button
                                            onClick={() => setSelectedUserForProfile(null)}
                                            className="px-8 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all w-full"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserDirectory;
