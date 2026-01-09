'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Bell, Settings, LogOut, Plus,
    CheckCircle2, Clock, MessageSquare, UsersRound, Coffee, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';

// Types
type Tab = 'overview' | 'requests' | 'visitors' | 'cafeteria' | 'settings' | 'profile';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
}

const TenantDashboard = () => {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const propertyId = params?.propertyId as string;

    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSignOutModal, setShowSignOutModal] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold">Loading your dashboard...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-slate-600 mt-2">{errorMsg || 'Property not found.'}</p>
            <button onClick={() => router.back()} className="mt-4 text-orange-600 font-bold hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex font-inter text-slate-900">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#f28c33] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-200">
                            {property?.name?.substring(0, 1) || 'T'}
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-tight text-slate-900 truncate max-w-[160px]">{property?.name}</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Tenant Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Core Operations */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-[#f28c33] rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'overview'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'requests'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                My Requests
                            </button>
                        </div>
                    </div>

                    {/* Management Hub */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-[#f28c33] rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'visitors'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitor Management
                            </button>
                            <button
                                onClick={() => setActiveTab('cafeteria')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'cafeteria'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-[#f28c33] rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'settings'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'profile'
                                    ? 'bg-[#f28c33] text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4" />
                                Profile
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="pt-6 border-t border-slate-100 p-6">
                    {/* User Profile Section */}
                    <div className="flex items-center gap-3 px-2 mb-6">
                        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-slate-200">
                            {user?.email?.[0].toUpperCase() || 'T'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-sm text-slate-900 truncate">
                                {user?.user_metadata?.full_name || 'Tenant'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate font-medium">
                                {user?.email}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-full transition-all duration-200 text-sm font-bold group"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 min-h-screen p-8 lg:p-12 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'requests' && <RequestsTab />}
                        {activeTab === 'visitors' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <UsersRound className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Visitor Management</h3>
                                <p className="text-slate-500">Manage your pre-registered visitors and invites.</p>
                            </div>
                        )}
                        {activeTab === 'cafeteria' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Coffee className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Cafeteria</h3>
                                <p className="text-slate-500">Order from property cafeteria coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Settings</h3>
                                <p className="text-slate-500">Personal settings and notifications.</p>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Profile</h3>
                                <p className="text-slate-500">Update your profile information.</p>
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

// Overview Tab for Tenant
const OverviewTab = () => {
    return (
        <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f28c33]/20 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2">Need Assistance?</h3>
                    <p className="text-slate-400 text-sm mb-6">Raise a maintenance request and we'll take care of it.</p>
                    <button className="px-6 py-3 bg-[#f28c33] text-white font-bold rounded-xl shadow-lg shadow-orange-900/30 hover:scale-105 transition-transform flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Raise Maintenance Request
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-1">2</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Requests</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-1">12</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                        <MessageSquare className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-1">3</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unread Updates</p>
                </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900">Your Recent Requests</h3>
                    <button className="text-[#f28c33] font-bold text-sm hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                            <p className="font-bold text-slate-900">AC Not Cooling</p>
                            <p className="text-xs text-slate-400">Ticket #4421</p>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 bg-blue-100 text-blue-600 rounded-lg uppercase tracking-wider">In Progress</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                            <p className="font-bold text-slate-900">Tap Leakage</p>
                            <p className="text-xs text-slate-400">Ticket #4390</p>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg uppercase tracking-wider">Resolved</span>
                    </div>
                </div>
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
                <h3 className="text-xl font-black text-slate-900">All Requests</h3>
                <button className="px-5 py-2.5 bg-[#f28c33] text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Request
                </button>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                <td className="px-6 py-4 font-bold text-slate-500 text-sm">#{req.id}</td>
                                <td className="px-6 py-4 font-bold text-slate-900 text-sm">{req.title}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${req.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-500">{req.date}</td>
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
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6">Community Updates</h3>
            <div className="space-y-6">
                {updates.map((update) => (
                    <div key={update.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center">
                            <update.icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-slate-700 font-medium leading-tight">{update.title}</p>
                            <p className="text-slate-400 text-xs mt-1 font-bold">{update.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TenantDashboard;
