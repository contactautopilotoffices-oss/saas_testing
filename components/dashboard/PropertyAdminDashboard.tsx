'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Ticket, Settings, UserCircle, UsersRound,
    Search, Plus, Filter, Bell, LogOut, ChevronRight, MapPin, Building2,
    Calendar, CheckCircle2, AlertCircle, Clock, Coffee, IndianRupee, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import UserDirectory from './UserDirectory';
import SignOutModal from '@/components/ui/SignOutModal';

// Types
type Tab = 'overview' | 'requests' | 'users' | 'visitors' | 'cafeteria' | 'settings' | 'profile' | 'units' | 'vendor_revenue';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold">Loading property dashboard...</p>
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
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-slate-200">
                            {property?.name?.substring(0, 1) || 'P'}
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-tight text-slate-900 truncate max-w-[160px]">{property?.name}</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Property Manager</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Core Operations */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'overview'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'requests'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
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
                            <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'users'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                User Management
                            </button>
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'visitors'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitor Management
                            </button>
                            <button
                                onClick={() => setActiveTab('units')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'units'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Units
                            </button>
                            <button
                                onClick={() => setActiveTab('cafeteria')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'cafeteria'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                Cafeteria Management
                            </button>
                            <button
                                onClick={() => setActiveTab('vendor_revenue')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'vendor_revenue'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <IndianRupee className="w-4 h-4" />
                                Vendor Revenue
                            </button>
                        </div>
                    </div>

                    {/* System & Personal */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'settings'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'profile'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
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
                            {user?.email?.[0].toUpperCase() || 'P'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-sm text-slate-900 truncate">
                                {user?.user_metadata?.full_name || 'Property Admin'}
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

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 lg:p-12 overflow-y-auto min-h-screen">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab}</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">{property.address || 'Property Management Hub'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-black text-slate-900 tracking-tight">Access Level</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Property admin</span>
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
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'users' && <UserDirectory propertyId={propertyId} />}
                        {activeTab === 'vendor_revenue' && <VendorRevenueTab propertyId={propertyId} />}
                        {activeTab === 'requests' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Requests Management</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Requests module loading...</p>
                            </div>
                        )}
                        {activeTab === 'visitors' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <UsersRound className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Visitor Management</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Visitor tracking system coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'units' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Unit Management</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Unit inventory management loading...</p>
                            </div>
                        )}
                        {activeTab === 'cafeteria' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <Coffee className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Cafeteria Management</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Cafeteria services system coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Settings</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">Configuration panel coming soon.</p>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="p-12 text-center text-slate-400 font-bold italic bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-inter not-italic">Profile</h3>
                                <p className="text-slate-500 font-inter not-italic font-medium">User profile settings loading...</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div >
    );
};

const OverviewTab = () => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Active Tenants" value="24" icon={Users} color="text-blue-600" bg="bg-blue-50" />
            <StatCard title="Occupancy Rate" value="92%" icon={Building2} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard title="Open Tickets" value="8" icon={Ticket} color="text-amber-600" bg="bg-amber-50" />
            <StatCard title="Due Payments" value="3" icon={Clock} color="text-rose-600" bg="bg-rose-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900">Recent Activity</h3>
                    <button className="text-slate-900 text-xs font-black hover:underline uppercase tracking-widest">View All</button>
                </div>
                <div className="space-y-6">
                    <ActivityItem
                        icon={Ticket}
                        color="bg-amber-100 text-amber-600"
                        title="New Maintenance Request"
                        desc="Leaking faucet in Unit 302"
                        time="2h ago"
                    />
                    <ActivityItem
                        icon={CheckCircle2}
                        color="bg-emerald-100 text-emerald-600"
                        title="Rent Payment Received"
                        desc="Unit 105 - John Doe"
                        time="5h ago"
                    />
                    <ActivityItem
                        icon={Users}
                        color="bg-slate-100 text-slate-600"
                        title="New Tenant Check-in"
                        desc="Sarah Parker - Unit 412"
                        time="Yesterday"
                    />
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900">Upcoming Inspections</h3>
                    <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-4">
                    <InspectionItem date="Jan 15" unit="Unit 201" status="Scheduled" />
                    <InspectionItem date="Jan 18" unit="Unit 505" status="Scheduled" />
                    <InspectionItem date="Jan 20" unit="Lobby Area" status="Maintenance" />
                </div>
            </div>
        </div>
    </div>
);

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        {Icon && (
            <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
            </div>
        )}
        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
);

const ActivityItem = ({ icon: Icon, color, title, desc, time }: any) => (
    <div className="flex gap-4">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{time}</span>
    </div>
);

const InspectionItem = ({ date, unit, status }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-4">
            <div className="bg-white w-12 py-2 rounded-xl text-center border border-slate-200">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Jan</span>
                <span className="block font-black text-sm text-slate-900 leading-none">{date.split(' ')[1]}</span>
            </div>
            <div>
                <p className="font-bold text-slate-900 text-sm">{unit}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{status}</p>
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300" />
    </div>
);

const VendorRevenueTab = ({ propertyId }: { propertyId: string }) => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const handleExportAll = () => {
        const headers = ['Shop Name', 'Owner', 'Property', 'Commission %', 'Revenue', 'Commission Due'];
        const rows = vendors.map(v => {
            const rev = v.vendor_daily_revenue?.find((r: any) => r.entry_date === new Date().toISOString().split('T')[0])?.revenue_amount || 0;
            const comm = (rev * (v.commission_rate / 100)).toFixed(2);
            return [v.shop_name, v.owner_name, propertyId, v.commission_rate + '%', rev, comm];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `property_revenue_${propertyId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold">Loading Revenue Data...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Revenue (Today)"
                    value={`₹${vendors.reduce((acc, v) => acc + (v.vendor_daily_revenue?.find((r: any) => r.entry_date === new Date().toISOString().split('T')[0])?.revenue_amount || 0), 0).toLocaleString()}`}
                    icon={IndianRupee}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Expected Commission"
                    value={`₹${vendors.reduce((acc, v) => {
                        const rev = v.vendor_daily_revenue?.find((r: any) => r.entry_date === new Date().toISOString().split('T')[0])?.revenue_amount || 0;
                        return acc + (rev * (v.commission_rate / 100));
                    }, 0).toLocaleString()}`}
                    icon={Calendar}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Active Vendors"
                    value={vendors.length.toString()}
                    icon={Users}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Vendor Performance</h3>
                        <p className="text-slate-500 text-xs font-medium mt-1">Real-time revenue tracking per vendor.</p>
                    </div>
                    <button
                        onClick={handleExportAll}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-sm font-black hover:bg-slate-200 transition-all"
                    >
                        <FileDown className="w-4 h-4" /> Export All
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor / Shop</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Commission %</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Today's Revenue</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Commission Due</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">No vendors found for this property.</td>
                                </tr>
                            ) : (
                                vendors.map((vendor) => {
                                    const todayRevenue = vendor.vendor_daily_revenue?.find((r: any) => r.entry_date === new Date().toISOString().split('T')[0])?.revenue_amount || 0;
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
                                                    ₹{todayRevenue.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 text-right text-emerald-600 font-black text-sm">
                                                ₹{Number(commission).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${todayRevenue > 0
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {todayRevenue > 0 ? 'Submitted' : 'Pending Entry'}
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
        </div>
    );
};

export default PropertyAdminDashboard;
