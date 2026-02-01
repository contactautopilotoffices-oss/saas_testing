'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart3, Users, Building2, LayoutDashboard,
    Settings, Bell, Search, Plus, Zap, AlertTriangle,
    History, ShieldCheck, Mail, LogOut, Command,
    ClipboardList, Package, Map, PieChart, ExternalLink, IndianRupee, Store, UsersRound
} from 'lucide-react';
import PropertyManagement from './PropertyManagement';
import UserManagement from './UserManagement';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { useAuth } from '@/frontend/context/AuthContext';
import SignOutModal from '@/frontend/components/ui/SignOutModal';
import VMSOrgSummary from '@/frontend/components/vms/VMSOrgSummary';
import { useTheme } from '@/frontend/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

type SubTab = 'dashboard' | 'properties' | 'requests' | 'alerts' | 'users' | 'analytics' | 'vendors' | 'visitors';

interface Property {
    id: string;
    name: string;
    code: string;
    status: string;
}

const OrgDashboard = ({ orgId }: { orgId: string }) => {
    const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
    const [isSidebarOpen] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const { signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const supabase = createClient();

    useEffect(() => {
        fetchProperties();
    }, [orgId]);

    const fetchProperties = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('organization_id', orgId);

        if (!error && data) {
            setProperties(data);
        }
        setIsLoading(false);
    };

    const menuItems = [
        {
            section: 'CORE OPERATIONS', items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'requests', label: 'Requests', icon: ClipboardList },
                { id: 'alerts', label: 'Alerts', icon: Bell },
                { id: 'quick-actions', label: 'Quick Actions', icon: Zap },
            ]
        },
        {
            section: 'MANAGEMENT HUB', items: [
                { id: 'properties', label: 'Entity Manager', icon: Building2 },
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'visitors', label: 'Visitors', icon: UsersRound },
                { id: 'vendors', label: 'Cafeteria Revenue', icon: Store },
                { id: 'analytics', label: 'SLA Analytics', icon: BarChart3 },
            ]
        },
    ];

    const quickActions = [
        { label: 'New Request', icon: Plus, action: () => setActiveTab('requests') },
        { label: 'Manage Prop', icon: Building2, action: () => setActiveTab('properties') },
        { label: 'Emergency', icon: AlertTriangle, action: () => alert('URGENT: Emergency SOS Signal Broadcasted to all Staff.') },
        { label: 'Quick Report', icon: History, action: () => setActiveTab('analytics') },
        { label: 'System Stat', icon: ShieldCheck, action: () => alert('System Health: 100% Operational. All nodes synced.') },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground font-inter overflow-hidden">
            {/* Sidebar */}
            <aside className={`bg-sidebar border-r border-border flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-80' : 'w-20'}`}>
                <div className="p-8 pb-12">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-text-inverse shadow-lg shadow-primary/20">
                            {/* Triangle A Icon */}
                            <svg viewBox="0 0 32 40" fill="currentColor" className="h-6">
                                <path d="M0 40 L16 0 L32 40 L24 40 L16 16 L8 40 Z" />
                            </svg>
                        </div>
                        {isSidebarOpen && (
                            <div>
                                <h1 className="text-xl font-medium text-text-primary tracking-tight flex items-center gap-0.5">
                                    {/* Triangle A + UTOPILOT */}
                                    <svg viewBox="0 0 16 20" fill="currentColor" className="h-5 -mr-0.5">
                                        <path d="M0 20 L8 0 L16 20 L12 20 L8 8 L4 20 Z" />
                                    </svg>
                                    UTOPILOT
                                </h1>
                                <p className="text-[10px] font-medium text-primary uppercase tracking-widest leading-none">Admin Portal</p>
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary transition-colors group-hover:text-text-secondary" />
                        <input
                            type="text"
                            placeholder={isSidebarOpen ? "Search features... (Ctrl+K)" : ""}
                            className={`bg-surface-elevated border border-border rounded-xl py-3 pl-12 pr-4 text-xs font-bold focus:outline-none transition-all ${isSidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}`}
                        />
                    </div>
                </div>

                <div className="flex-1 px-4 overflow-y-auto space-y-10 custom-scrollbar">
                    {isSidebarOpen && (
                        <div>
                            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Quick Actions</p>
                            <div className="grid grid-cols-2 gap-2 px-2">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={action.action}
                                        className="flex flex-col items-start gap-2 p-3 bg-surface-elevated border border-border rounded-xl hover:bg-muted transition-all text-left"
                                    >
                                        <action.icon className="w-4 h-4 text-text-secondary" />
                                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <nav className="space-y-8">
                        {menuItems.map((section, idx) => (
                            <div key={idx}>
                                {isSidebarOpen && (
                                    <p className="px-4 text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-4">{section.section}</p>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id as SubTab)}
                                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative group ${activeTab === item.id
                                                ? 'bg-brand-orange/10 text-foreground shadow-[inset_0_0_15px_rgba(242,140,51,0.1)]'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-brand-orange' : 'group-hover:text-foreground'}`} />
                                            {isSidebarOpen && <span className="text-sm font-black tracking-tight">{item.label}</span>}
                                            {activeTab === item.id && (
                                                <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-brand-orange rounded-r-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all font-bold"
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="text-sm font-black tracking-tight">Sign Out</span>}
                    </button>
                </div>
            </aside>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            {/* Main Panel */}
            <main className="flex-1 flex flex-col bg-background relative overflow-hidden">
                {/* Subtle Ambience */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Header */}
                <header className="h-24 border-b border-border flex items-center justify-between px-10 z-10 backdrop-blur-md bg-card/20">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-4 border-[#0c0c0e] bg-zinc-800 flex items-center justify-center font-bold text-xs ring-2 ring-zinc-900 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                                </div>
                            ))}
                        </div>
                        {isSidebarOpen && <p className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2 border-l border-zinc-800 italic">Org: {orgId}</p>}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            <span className="text-xs font-black text-zinc-400 tracking-tighter uppercase italic">Status: OK</span>
                        </div>
                        <div className="h-10 w-px bg-zinc-800" />
                        <button className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-inner">
                            <Command className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'dashboard' && <GlobalMetrics properties={properties} />}
                            {activeTab === 'properties' && (
                                <PropertyManagement
                                    orgId={orgId}
                                    properties={properties}
                                    onRefresh={fetchProperties}
                                />
                            )}
                            {activeTab === 'requests' && <RequestsFeed />}
                            {activeTab === 'users' && <UserManagement orgId={orgId} />}
                            {activeTab === 'alerts' && <AlertsCenter />}
                            {activeTab === 'vendors' && <VendorSummary orgId={orgId} />}
                            {activeTab === 'visitors' && <VMSOrgSummary orgId={orgId} />}
                            {activeTab === 'analytics' && <SLAAnalytics />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

// Global Metrics for Org Admin
const GlobalMetrics = ({ properties }: { properties: Property[] }) => (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
                { label: 'Total Properties', value: properties.length.toString().padStart(2, '0'), icon: Building2, trend: '+0', color: 'text-blue-500' },
                { label: 'Active Incidents', value: '0', icon: AlertTriangle, trend: '-', color: 'text-orange-500' },
                { label: 'Requests (24h)', value: '0', icon: ClipboardList, trend: '-', color: 'text-emerald-500' },
                { label: 'Active Users', value: '0', icon: Users, trend: '-', color: 'text-indigo-500' },
            ].map((stat, i) => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl backdrop-blur-sm group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <span className="text-[10px] font-black bg-zinc-950 text-zinc-500 px-2 py-1 rounded-lg border border-zinc-800 uppercase tracking-widest leading-none">{stat.trend}</span>
                    </div>
                    <h3 className="text-4xl font-black text-white tracking-widest mb-1 italic">{stat.value}</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</p>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900/30 border border-zinc-800/50 p-10 rounded-[40px] shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white mb-8 italic">Inventory Overview</h3>
                    <div className="space-y-8">
                        {[
                            { name: 'Spare Parts (Critical)', value: 12, total: 100, color: 'bg-rose-500' },
                            { name: 'Consumables', value: 85, total: 100, color: 'bg-emerald-500' },
                            { name: 'Mechanical Assets', value: 92, total: 100, color: 'bg-blue-500' },
                        ].map((inv, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em]">
                                    <span className="text-zinc-500">{inv.name}</span>
                                    <span className="text-white">{inv.value}%</span>
                                </div>
                                <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${inv.value}%` }}
                                        className={`h-full ${inv.color} rounded-full`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-[40px] flex flex-col justify-center items-center text-center group">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <PieChart className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 italic">Entity Rollover</h3>
                <p className="text-zinc-500 text-sm font-medium mb-8 max-w-[280px]">Automated reports generated for all {properties.length} active properties in this cycle.</p>
                <button className="px-8 py-3 bg-white text-black font-black text-xs rounded-xl uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95">
                    View Entity Map
                </button>
            </div>
        </div>
    </div>
);

// --- New High-Fidelity Sub-components ---

const RequestsFeed = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-white italic tracking-tighter">Command Feed</h2>
            <div className="flex gap-2">
                {['All', 'Pending', 'Resolved'].map(f => (
                    <button key={f} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${f === 'All' ? 'bg-white text-black border-white' : 'text-zinc-500 border-zinc-800'}`}>
                        {f}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            {[
                { id: 'REQ-901', user: 'Sarah Jenkins', type: 'Maintenance', sub: 'HVAC Leak - L28', time: '12m ago', status: 'Priority', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { id: 'REQ-899', user: 'David Chen', type: 'Access', sub: 'Guest Pass Request', time: '45m ago', status: 'Stable', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { id: 'REQ-895', user: 'System Auto', type: 'Security', sub: 'Door Sensor Fault', time: '2h ago', status: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((req, i) => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl ${req.bg} flex items-center justify-center font-black ${req.color} text-[10px]`}>
                            {req.id}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm tracking-tight">{req.sub}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{req.type}</span>
                                <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                                <span className="text-[10px] font-bold text-zinc-500 italic">{req.user}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-10">
                        <div className="text-right">
                            <p className="text-xs font-black text-white uppercase tracking-tighter">{req.status}</p>
                            <p className="text-[10px] text-zinc-600 font-medium">{req.time}</p>
                        </div>
                        <button className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:text-white transition-colors">
                            <ExternalLink size={14} className="text-zinc-600 group-hover:text-white" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const AlertsCenter = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-rose-500/5 border border-rose-500/20 p-10 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 animate-pulse">
                            <AlertTriangle size={20} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-widest italic uppercase">Active Alerts</h2>
                    </div>
                    <p className="text-rose-200/60 text-sm font-medium max-w-md">Immediate attention required for system inconsistencies detected in the last 60 minutes.</p>
                </div>
                <button className="px-10 py-4 bg-rose-500 text-white font-black text-xs rounded-2xl uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/20 hover:bg-rose-600 transition-all">Clear All Signals</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
                { label: 'Unusual Power Spike', loc: 'Level 14 - Server Room', time: '5m ago', risk: 'HIGH' },
                { label: 'Low Water Pressure', loc: 'Ground Floor Main', time: '22m ago', risk: 'MID' },
            ].map((alert, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl group">
                    <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20 px-2 py-1 rounded bg-rose-500/5">{alert.risk} RISK</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">{alert.time}</span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">{alert.label}</h3>
                    <p className="text-xs text-zinc-500 font-medium mb-6 uppercase tracking-widest">{alert.loc}</p>
                    <button className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Acknowledge Signal</button>
                </div>
            ))}
        </div>
    </div>
);

const SLAAnalytics = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-4xl font-black text-white tracking-widest italic uppercase mb-2">SLA Hub</h2>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.2em]">Efficiency Protocol Dynamics</p>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-emerald-400 italic leading-none">95%</span>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Compliance</span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800/50 p-10 rounded-[40px] h-[350px] relative overflow-hidden">
                <h3 className="text-xl font-black text-white mb-10 italic">Response Latency (7D)</h3>
                {/* Mock Sparkline Graph */}
                <div className="flex items-end gap-3 h-40 w-full px-2">
                    {[30, 45, 25, 60, 85, 40, 55, 70, 40, 90, 65, 80].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex-1 rounded-t-lg ${i === 9 ? 'bg-blue-500' : 'bg-zinc-800/50 group-hover:bg-zinc-700'}`}
                        />
                    ))}
                </div>
                <div className="flex justify-between mt-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest border-t border-zinc-800 pt-4">
                    <span>Mon (05.01)</span>
                    <span>System Peak reached at 14:00</span>
                    <span>Sun (11.01)</span>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-emerald-500 p-8 rounded-[40px] text-zinc-950">
                    <PieChart className="w-10 h-10 mb-4 opacity-50" />
                    <h4 className="text-2xl font-black italic mb-1 leading-none self-start">Optimal</h4>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Fleet Efficiency</p>
                    <div className="mt-8 pt-8 border-t border-black/10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-40">System note</p>
                        <p className="text-xs font-bold leading-relaxed italic">Operating 12% above seasonal average protocol.</p>
                    </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[40px]">
                    <h4 className="text-lg font-black text-white italic mb-4">Quick Audit</h4>
                    <div className="space-y-3">
                        {['P0 Tickets', 'P1 Escalations', 'Auto-resolved'].map((item, i) => (
                            <div key={i} className="flex justify-between text-[10px] font-black uppercase tracking-widest py-2 border-b border-zinc-900 last:border-0">
                                <span className="text-zinc-600">{item}</span>
                                <span className="text-white">{i === 0 ? '02' : i === 1 ? '00' : '142'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Vendor Summary for Org Admin (Multi-Property Rollup)
const VendorSummary = ({ orgId }: { orgId: string }) => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [summary, setSummary] = React.useState<any>(null);
    const [period, setPeriod] = React.useState<'today' | 'month' | 'year'>('today');

    React.useEffect(() => {
        fetchSummary();
    }, [orgId, period]);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/organizations/${orgId}/vendor-summary?period=${period}`);
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            console.error('Error fetching vendor summary:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-widest italic uppercase mb-2">Cafeteria Revenue</h2>
                    <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.2em]">Cross-Property Revenue Analytics</p>
                </div>
                <div className="flex gap-2">
                    {(['today', 'month', 'year'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${p === period ? 'bg-white text-black border-white' : 'text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${(summary?.total_revenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500' },
                    { label: 'Total Commission', value: `₹${(summary?.total_commission || 0).toLocaleString('en-IN')}`, icon: PieChart, color: 'text-blue-500' },
                    { label: 'Active Vendors', value: (summary?.total_vendors || 0).toString(), icon: Store, color: 'text-amber-500' },
                    { label: 'Properties', value: (summary?.properties?.length || 0).toString(), icon: Building2, color: 'text-indigo-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl backdrop-blur-sm group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-widest mb-1 italic">{stat.value}</h3>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Property Breakdown Table */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[40px] overflow-hidden">
                <div className="p-8 border-b border-zinc-800/50">
                    <h3 className="text-xl font-black text-white italic">Property Breakdown</h3>
                    <p className="text-zinc-500 text-xs font-medium mt-1 uppercase tracking-widest">Revenue distribution across properties</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Property</th>
                                <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center">Vendors</th>
                                <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Revenue</th>
                                <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Commission</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {summary?.properties?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-zinc-500 italic">No vendor data found for this period.</td>
                                </tr>
                            ) : (
                                summary?.properties?.map((prop: any) => (
                                    <tr key={prop.property_id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-white text-sm">{prop.property_name}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="bg-zinc-950 text-zinc-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-zinc-800">
                                                {prop.vendor_count}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className={`font-black text-sm ${prop.total_revenue > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                ₹{prop.total_revenue.toLocaleString('en-IN')}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className="font-black text-sm text-blue-400">
                                                ₹{prop.total_commission.toLocaleString('en-IN')}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrgDashboard;
