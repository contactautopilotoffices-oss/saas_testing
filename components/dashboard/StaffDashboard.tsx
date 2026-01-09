'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Clock, CheckCircle2, AlertCircle,
    LogOut, Bell, Settings, Search, Filter, UserCircle, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';

// Types
type Tab = 'overview' | 'requests' | 'cafeteria' | 'settings' | 'profile';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
}

interface RequestData {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    description?: string;
}

const StaffDashboard = () => {
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

    // Removed navItems array as we'll use a hardcoded grouped sidebar for better control

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold">Loading staff dashboard...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-slate-600 mt-2">{errorMsg || 'Property not found.'}</p>
            <button onClick={() => router.back()} className="mt-4 text-emerald-600 font-bold hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex font-inter text-slate-900">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                            {property?.name?.substring(0, 1) || 'S'}
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-tight text-slate-900 truncate max-w-[160px]">{property?.name}</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Staff Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Core Operations */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-indigo-500 rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'overview'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'requests'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                        </div>
                    </div>

                    {/* Management Hub */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-indigo-500 rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('cafeteria')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'cafeteria'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria Management
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-indigo-500 rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'settings'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'profile'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
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
                            {user?.email?.[0].toUpperCase() || 'S'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-sm text-slate-900 truncate">
                                {user?.user_metadata?.full_name || 'Staff Member'}
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
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Profile</h3>
                                <p className="text-slate-500">Profile management coming soon.</p>
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
        </div >
    );
};

// KPI Stats for Staff
const OverviewTab = () => {
    const kpiStats = [
        { id: 'pending', label: 'Pending Requests', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'ACTION' },
        { id: 'completed', label: 'Completed Today', value: '8', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
        { id: 'urgent', label: 'Urgent Items', value: '2', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', trend: 'HIGH' },
        { id: 'avg-time', label: 'Avg Response Time', value: '24m', icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'GOOD' },
    ];

    const incomingRequests = [
        { id: 1, title: 'AC Not Working - Unit 302', priority: 'high', time: '10 min ago', status: 'New' },
        { id: 2, title: 'Plumbing Issue - Unit 105', priority: 'medium', time: '25 min ago', status: 'New' },
        { id: 3, title: 'Light Replacement - Lobby', priority: 'low', time: '1 hour ago', status: 'Assigned' },
    ];

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiStats.map((stat) => (
                    <div key={stat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
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
                    </div>
                ))}
            </div>

            {/* Incoming Requests */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900">Incoming Requests</h3>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-3 py-1 rounded-lg uppercase tracking-wider">
                        {incomingRequests.length} New
                    </span>
                </div>
                <div className="space-y-4">
                    {incomingRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${req.priority === 'high' ? 'bg-rose-500' : req.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{req.title}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{req.time}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${req.status === 'New' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {req.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Requests Directory for Staff
const RequestsTab = () => {
    const [filter, setFilter] = useState('all');

    const requests = [
        { id: 1, title: 'AC Repair - Unit 302', status: 'pending', priority: 'high', date: 'Today', assignee: 'You' },
        { id: 2, title: 'Plumbing Fix - Unit 105', status: 'in_progress', priority: 'medium', date: 'Today', assignee: 'You' },
        { id: 3, title: 'Light Replacement - Lobby', status: 'pending', priority: 'low', date: 'Yesterday', assignee: 'You' },
        { id: 4, title: 'Door Lock Issue - Unit 210', status: 'resolved', priority: 'medium', date: '2 days ago', assignee: 'You' },
        { id: 5, title: 'Water Heater - Unit 401', status: 'resolved', priority: 'high', date: '3 days ago', assignee: 'You' },
    ];

    const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900">Request Directory</h3>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-100 w-64"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-100 appearance-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>
            </div>

            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                            <td className="px-6 py-4">
                                <p className="font-bold text-slate-900 text-sm">{req.title}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${req.priority === 'high' ? 'bg-rose-100 text-rose-600' : req.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {req.priority}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${req.status === 'pending' ? 'bg-blue-100 text-blue-600' : req.status === 'in_progress' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {req.status.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-500">{req.date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StaffDashboard;
