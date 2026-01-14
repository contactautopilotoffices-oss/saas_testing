'use client';

import React, { useState, useEffect } from 'react';
import {
    IndianRupee, LogOut, CheckCircle2, LayoutDashboard,
    FileDown, Clock, Store, Percent, Wallet, ChevronRight, X, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import SignOutModal from '@/components/ui/SignOutModal';
import VendorExportModal from '@/components/vendor/VendorExportModal';

// Types
type ViewState = 'entry' | 'already_submitted' | 'dashboard';

interface VendorProfile {
    id: string;
    shop_name: string;
    commission_rate: number;
    property_id: string;
    property_name?: string;
}

interface CommissionCycle {
    id: string;
    cycle_number: number;
    cycle_start: string;
    cycle_end: string;
    total_revenue: number;
    commission_rate: number;
    commission_due: number;
    status: string;
}

const FoodVendorDashboard = () => {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const propertyId = params?.propertyId as string;
    const supabase = createClient();

    // State
    const [viewState, setViewState] = useState<ViewState>('entry');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [revenue, setRevenue] = useState('');
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [currentCycle, setCurrentCycle] = useState<CommissionCycle | null>(null);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'portal' | 'history'>('portal');
    const [todayDate] = useState(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));

    useEffect(() => {
        if (user && propertyId) {
            initializeDashboard();
        }
    }, [user, propertyId]);

    const initializeDashboard = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Vendor Profile
            const { data: vendorData, error: vendorError } = await supabase
                .from('vendors')
                .select('*, properties(name)')
                .eq('user_id', user?.id)
                .single();

            if (vendorError || !vendorData) {
                console.error('Error fetching vendor:', vendorError);
                return;
            }

            setVendor({
                id: vendorData.id,
                shop_name: vendorData.shop_name,
                commission_rate: vendorData.commission_rate,
                property_id: vendorData.property_id,
                property_name: vendorData.properties?.name
            });

            // 2. Fetch current commission cycle
            const { data: cycleData } = await supabase
                .from('commission_cycles')
                .select('*')
                .eq('vendor_id', vendorData.id)
                .eq('status', 'in_progress')
                .single();

            if (cycleData) {
                setCurrentCycle(cycleData);
            }

            // 3. Check today's entry
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: entryData } = await supabase
                .from('vendor_daily_revenue')
                .select('id')
                .eq('vendor_id', vendorData.id)
                .eq('entry_date', todayStr)
                .maybeSingle();

            if (entryData) {
                setViewState('already_submitted');
            } else {
                setViewState('entry');
            }
        } catch (err) {
            console.error('Initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitRevenue = async () => {
        if (!revenue || isNaN(Number(revenue)) || Number(revenue) <= 0) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/properties/${propertyId}/vendor-revenue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_id: vendor?.id,
                    revenue_amount: Number(revenue),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.alreadySubmitted) {
                    setViewState('already_submitted');
                    return;
                }
                throw new Error(data.error);
            }

            setViewState('already_submitted');
            // Refresh cycle data
            initializeDashboard();
        } catch (err) {
            console.error('Submission error:', err);
            alert('Failed to record revenue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = async (options: any) => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                vendorId: vendor?.id || '',
                format: options.format,
            });

            if (options.period === 'today') {
                const today = new Date().toISOString().split('T')[0];
                params.append('startDate', today);
                params.append('endDate', today);
            } else if (options.period === 'month') {
                const monthStart = new Date();
                monthStart.setDate(1);
                params.append('startDate', monthStart.toISOString().split('T')[0]);
                params.append('endDate', new Date().toISOString().split('T')[0]);
            } else if (options.period === 'year') {
                const yearStart = new Date();
                yearStart.setMonth(0, 1);
                params.append('startDate', yearStart.toISOString().split('T')[0]);
                params.append('endDate', new Date().toISOString().split('T')[0]);
            } else if (options.startDate && options.endDate) {
                params.append('startDate', options.startDate);
                params.append('endDate', options.endDate);
            }

            const response = await fetch(`/api/properties/${propertyId}/vendor-export?${params}`);

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `revenue_export.${options.format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowExportModal(false);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Calculate cycle progress
    const getCycleDay = () => {
        if (!currentCycle) return { day: 1, total: 15 };
        const start = new Date(currentCycle.cycle_start);
        const today = new Date();
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return { day: Math.min(diffDays, 15), total: 15 };
    };

    const getDaysRemaining = () => {
        if (!currentCycle) return 15;
        const end = new Date(currentCycle.cycle_end);
        const today = new Date();
        const diffTime = end.getTime() - today.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold">Initializing Portal...</p>
            </div>
        </div>
    );

    // DAILY ENTRY SCREEN (Step 1 from PRD)
    if (viewState === 'entry') {
        return (
            <div className="min-h-screen bg-white flex flex-col font-inter">
                <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md w-full"
                    >
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 leading-tight">
                            Please enter revenue for <br />
                            <span className="text-indigo-600">{todayDate}</span>
                        </h1>
                        <p className="text-slate-500 font-medium mb-12">Total daily collection from all sales.</p>

                        <div className="relative mb-8">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₹</span>
                            <input
                                type="number"
                                value={revenue}
                                onChange={(e) => setRevenue(e.target.value)}
                                placeholder="Enter total revenue"
                                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:ring-0 rounded-3xl py-8 pl-12 pr-8 text-3xl font-black text-slate-900 transition-all placeholder:text-slate-200"
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleSubmitRevenue}
                            disabled={isSubmitting || !revenue}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Submit & Exit</>
                            )}
                        </button>
                    </motion.div>
                </main>
                <footer className="p-8 flex justify-center border-t border-slate-50">
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="text-slate-400 font-bold text-sm flex items-center gap-2 hover:text-rose-600 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </footer>

                <SignOutModal
                    isOpen={showSignOutModal}
                    onClose={() => setShowSignOutModal(false)}
                    onConfirm={signOut}
                />
            </div>
        );
    }

    // ALREADY SUBMITTED SCREEN (Step 2 from PRD)
    if (viewState === 'already_submitted') {
        return (
            <div className="min-h-screen bg-indigo-600 flex flex-col font-inter text-white">
                <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                    >
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-3xl font-black mb-4">
                            Revenue for {todayDate.split(' ')[0]} {todayDate.split(' ')[1]} <br /> recorded successfully!
                        </h1>
                        <p className="text-indigo-100 font-medium mb-12 text-lg">You're all set for today.</p>

                        <div className="space-y-4">
                            <button
                                onClick={() => setViewState('dashboard')}
                                className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all shadow-lg"
                            >
                                View Dashboard
                            </button>
                            <button
                                onClick={signOut}
                                className="w-full bg-indigo-700/50 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all border border-indigo-500/30"
                            >
                                Logout
                            </button>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    // MINIMAL DASHBOARD (Step 3 from PRD) - ENHANCED with live data
    const cycleProgress = getCycleDay();
    const daysRemaining = getDaysRemaining();

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex font-inter text-slate-900">
            {/* Sidebar (Very Minimal) */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-10 p-8">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-text-inverse">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight text-slate-900 truncate max-w-[160px]">{vendor?.shop_name}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{vendor?.property_name}</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('portal')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'portal'
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Portal
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'history'
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        History
                    </button>
                </nav>

                <div className="pt-8 border-t border-slate-50">
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-sm transition-all group"
                    >
                        <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 ml-72 p-12">
                <header className="mb-12">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Vendor Portal</h1>
                    <p className="text-slate-500 font-medium">Monitoring your revenue and commissions.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                            <Store className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Store Details</p>
                        <h3 className="text-xl font-black text-slate-900">{vendor?.shop_name}</h3>
                        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600">
                            <Percent className="w-4 h-4" />
                            {vendor?.commission_rate}% Commission
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-card text-text-primary p-8 rounded-3xl border border-border shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">Current Commission Cycle</p>
                                <h3 className="text-2xl font-black text-text-primary">Day {cycleProgress.day} <span className="text-text-tertiary">/ {cycleProgress.total}</span></h3>
                            </div>
                            <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold border border-primary/20">
                                Due in {daysRemaining} Days
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">Revenue so far</p>
                                <p className="text-2xl font-black text-text-primary">
                                    ₹{(currentCycle?.total_revenue || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">Commission Accrued</p>
                                <p className="text-2xl font-black text-emerald-600">
                                    ₹{(currentCycle?.commission_due || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                        <Wallet className="w-5 h-5" />
                        Pay Commission
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="px-8 py-4 bg-white border border-slate-100 text-slate-600 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                        <FileDown className="w-5 h-5" />
                        Export Data
                    </button>
                </div>
            </main>

            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={signOut}
            />

            <VendorExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                isExporting={isExporting}
            />
        </div>
    );
};

export default FoodVendorDashboard;
