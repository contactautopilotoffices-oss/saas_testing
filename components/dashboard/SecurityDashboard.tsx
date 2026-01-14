'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Ticket, Bell, Settings, LogOut, Plus,
    CheckCircle2, Clock, MessageSquare, UsersRound, Coffee, UserCircle, Shield, Fuel, LogIn, LogOut as LogOutIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';
import DieselStaffDashboard from '@/components/diesel/DieselStaffDashboard';
import VMSAdminDashboard from '@/components/vms/VMSAdminDashboard';
import VMSKiosk from '@/components/vms/VMSKiosk';
import TenantTicketingDashboard from '@/components/tickets/TenantTicketingDashboard';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

// Types
type Tab = 'overview' | 'requests' | 'checkinout' | 'visitors' | 'diesel' | 'cafeteria' | 'settings' | 'profile';

interface Property {
    id: string;
    name: string;
    code: string;
    address: string;
    organization_id: string;
}

const SecurityDashboard = () => {
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
                <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin" />
                <p className="text-muted-foreground font-bold">Loading security dashboard...</p>
            </div>
        </div>
    );

    if (!property) return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-muted-foreground mt-2">{errorMsg || 'Property not found.'}</p>
            <button onClick={() => router.back()} className="mt-4 text-foreground font-bold hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex font-inter text-foreground">
            {/* Sidebar */}
            <aside className="w-72 bg-sidebar border-r border-border flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-text-inverse font-bold text-lg shadow-lg shadow-slate-200">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-tight text-foreground truncate max-w-[160px]">{property?.name}</h2>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Security Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 overflow-y-auto">
                    {/* Quick Actions */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-slate-900 rounded-full"></span>
                            Quick Actions
                        </p>
                        <div className="grid grid-cols-2 gap-2 px-2">
                            <button
                                onClick={() => setActiveTab('requests')}
                                className="flex flex-col items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
                            >
                                <Plus className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">New Request</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('checkinout')}
                                className="flex flex-col items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-left"
                            >
                                <LogIn className="w-4 h-4 text-emerald-600" />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Check In/Out</span>
                            </button>
                            <button
                                onClick={() => alert('URGENT: Emergency SOS Signal Broadcasted to all Staff.')}
                                className="flex flex-col items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all text-left"
                            >
                                <Shield className="w-4 h-4 text-rose-600" />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Emergency</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className="flex flex-col items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left"
                            >
                                <UsersRound className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">View Visitors</span>
                            </button>
                        </div>
                    </div>

                    {/* Core Operations */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            Core Operations
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'overview'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'requests'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('checkinout')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'checkinout'
                                    ? 'bg-secondary text-text-inverse shadow-lg shadow-secondary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <LogIn className="w-4 h-4" />
                                Check In / Out
                            </button>
                        </div>
                    </div>

                    {/* Management Hub */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            Management Hub
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('visitors')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'visitors'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Visitor Registry
                            </button>
                            <button
                                onClick={() => setActiveTab('diesel')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'diesel'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Fuel className="w-4 h-4" />
                                Diesel Logger
                            </button>
                            <button
                                onClick={() => setActiveTab('cafeteria')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'cafeteria'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
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
                            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
                            System & Personal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'settings'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === 'profile'
                                    ? 'bg-primary text-text-inverse shadow-lg shadow-primary/25'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <UserCircle className="w-4 h-4" />
                                Profile
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="p-6 border-t border-border mt-auto">
                    {/* User Profile Section */}
                    <div className="flex items-center gap-3 px-2 mb-6">
                        <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange font-bold text-sm shadow-lg shadow-orange-500/10">
                            {user?.email?.[0].toUpperCase() || 'S'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm text-foreground truncate">
                                {user?.user_metadata?.full_name || 'Security Officer'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate font-medium">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-all font-bold text-sm"
                        >
                            {theme === 'light' ? (
                                <>
                                    <Moon className="w-4 h-4" />
                                    <span>Dark Mode</span>
                                </>
                            ) : (
                                <>
                                    <Sun className="w-4 h-4" />
                                    <span>Light Mode</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowSignOutModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all font-bold text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
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
                        {activeTab === 'requests' && property && user && (
                            <TenantTicketingDashboard
                                propertyId={property.id}
                                organizationId={property.organization_id || ''}
                                user={{ id: user.id, full_name: user.user_metadata?.full_name || 'Security' }}
                                propertyName={property.name}
                            />
                        )}
                        {activeTab === 'checkinout' && property && (
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                                <VMSKiosk propertyId={propertyId} propertyName={property.name} />
                            </div>
                        )}
                        {activeTab === 'visitors' && <VMSAdminDashboard propertyId={propertyId} />}
                        {activeTab === 'diesel' && <DieselStaffDashboard />}
                        {activeTab === 'cafeteria' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Coffee className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Cafeteria</h3>
                                <p className="text-slate-500">Property cafeteria services.</p>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Settings</h3>
                                <p className="text-slate-500">Notification and portal settings.</p>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Profile</h3>
                                <p className="text-slate-500">Officer profile information.</p>
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

const OverviewTab = () => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Active Visitors', value: '0', icon: UsersRound, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Pending Clearances', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Incidents Today', value: '0', icon: AlertCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Security Alerts', value: '0', icon: Bell, color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
                </div>
            ))}
        </div>
    </div>
);

import { AlertCircle } from 'lucide-react';

export default SecurityDashboard;
