'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, History, Settings, CheckCircle, AlertTriangle, Download, ArrowLeft, Fuel } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DieselLoggerCard from './DieselLoggerCard';
import LiquidDieselGauge from './LiquidDieselGauge';
import GeneratorConfigModal from './GeneratorConfigModal';

interface Generator {
    id: string;
    name: string;
    make?: string;
    capacity_kva?: number;
    tank_capacity_litres?: number;
    fuel_efficiency_lphr?: number;
    status: string;
}

interface Property {
    id: string;
    name: string;
    code: string;
}

interface DieselReading {
    opening_hours: number;
    diesel_added_litres: number;
    closing_hours: number;
    computed_consumed_litres?: number;
    notes?: string;
}

/**
 * Staff Dashboard for daily diesel logging
 * Matches the provided HTML mockup design
 */
const DieselStaffDashboard: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => {
    const params = useParams();
    const router = useRouter();
    const propertyId = params?.propertyId as string;
    const supabase = createClient();

    // State
    const [property, setProperty] = useState<Property | null>(null);
    const [generators, setGenerators] = useState<Generator[]>([]);
    const [readings, setReadings] = useState<Record<string, DieselReading>>({});
    const [previousClosings, setPreviousClosings] = useState<Record<string, number>>({});
    const [averages, setAverages] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Current date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Fetch property and generators
    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        setError(null);

        try {
            // Fetch property
            const { data: propData, error: propError } = await supabase
                .from('properties')
                .select('id, name, code')
                .eq('id', propertyId)
                .single();

            if (propError) throw propError;
            setProperty(propData);

            // Fetch generators
            const generatorsRes = await fetch(`/api/properties/${propertyId}/generators`);
            if (!generatorsRes.ok) throw new Error('Failed to fetch generators');
            const generatorsData = await generatorsRes.json();
            setGenerators(generatorsData);

            // Fetch yesterday's readings for opening hours
            if (generatorsData.length > 0) {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const readingsRes = await fetch(
                    `/api/properties/${propertyId}/diesel-readings?startDate=${yesterday}&endDate=${yesterday}`
                );
                if (readingsRes.ok) {
                    const readingsData = await readingsRes.json();
                    const closings: Record<string, number> = {};
                    readingsData.forEach((r: any) => {
                        closings[r.generator_id] = r.closing_hours;
                    });
                    setPreviousClosings(closings);
                }

                // Fetch 30-day averages
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const avgRes = await fetch(
                    `/api/properties/${propertyId}/diesel-readings?startDate=${monthAgo}`
                );
                if (avgRes.ok) {
                    const avgData = await avgRes.json();
                    const avgByGen: Record<string, number[]> = {};
                    avgData.forEach((r: any) => {
                        if (!avgByGen[r.generator_id]) avgByGen[r.generator_id] = [];
                        if (r.computed_consumed_litres) avgByGen[r.generator_id].push(r.computed_consumed_litres);
                    });
                    const avgs: Record<string, number> = {};
                    Object.entries(avgByGen).forEach(([genId, values]) => {
                        if (values.length > 0) {
                            avgs[genId] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                        }
                    });
                    setAverages(avgs);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle reading changes from cards
    const handleReadingChange = (generatorId: string, reading: DieselReading) => {
        setReadings(prev => ({ ...prev, [generatorId]: reading }));
    };

    // Calculate totals
    const totalConsumption = Object.values(readings).reduce(
        (sum, r) => sum + (r.computed_consumed_litres || 0), 0
    );
    const totalRunTime = Object.values(readings).reduce(
        (sum, r) => sum + (r.closing_hours - r.opening_hours), 0
    );
    const warningsCount = Object.entries(readings).filter(([genId, r]) => {
        const avg = averages[genId];
        return avg && r.computed_consumed_litres && r.computed_consumed_litres > avg * 1.25;
    }).length;
    const validReadingsCount = Object.values(readings).filter(
        r => r.closing_hours > r.opening_hours
    ).length;

    // Submit all readings
    const handleSubmitAll = async () => {
        if (validReadingsCount === 0) {
            setError('Please enter at least one valid reading');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const readingsToSubmit = Object.entries(readings)
                .filter(([_, r]) => r.closing_hours > r.opening_hours)
                .map(([generatorId, r]) => ({
                    generator_id: generatorId,
                    reading_date: new Date().toISOString().split('T')[0],
                    ...r,
                    alert_status: averages[generatorId] && r.computed_consumed_litres &&
                        r.computed_consumed_litres > averages[generatorId] * 1.25 ? 'warning' : 'normal',
                }));

            const res = await fetch(`/api/properties/${propertyId}/diesel-readings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readings: readingsToSubmit }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to submit readings');
            }

            setSuccessMessage('All readings submitted successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Reset readings
            setReadings({});
        } catch (err: any) {
            setError(err.message || 'Failed to submit readings');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add generator
    const handleAddGenerator = async (data: any) => {
        const res = await fetch(`/api/properties/${propertyId}/generators`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to add generator');
        }

        fetchData();
    };

    // Export to Excel
    const handleExport = async () => {
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        window.open(
            `/api/properties/${propertyId}/diesel-export?startDate=${monthAgo}&endDate=${today}`,
            '_blank'
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-12 h-12 border-4 ${isDark ? 'border-primary/20 border-t-primary' : 'border-slate-200 border-t-primary'} rounded-full animate-spin`} />
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold`}>Loading diesel logger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/80 backdrop-blur-md">
                <div className="px-4 sm:px-6 lg:px-8 py-3 mx-auto max-w-[1440px]">
                    <div className="flex items-center justify-between">
                        {/* Left: Property Context Lock */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-surface-elevated border-border px-3 py-1.5 rounded-full border select-none">
                                <Lock className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-text-primary tracking-tight">
                                    {property?.name || 'Property'}
                                </span>
                            </div>
                        </div>

                        {/* Right: Meta Info */}
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className={`hidden sm:flex items-center gap-2 ${isDark ? 'text-primary' : 'text-primary'} text-sm font-medium animate-pulse`}>
                                <CheckCircle className="w-4 h-4" />
                                <span>Auto-saved</span>
                            </div>
                            <div className={`flex items-center gap-2 ${isDark ? 'text-white bg-[#0d1117] border-[#21262d]' : 'text-slate-900 bg-white border-slate-100'} text-sm font-bold shadow-sm rounded-lg px-3 py-1.5 border`}>
                                <span className="hidden sm:inline">{dateStr} ·</span> {timeStr}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Feature Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-primary' : 'text-primary'} font-bold tracking-wider text-xs uppercase`}>
                            <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-primary' : 'bg-primary'}`} />
                            Live Logging
                        </div>
                        <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Daily Diesel Log
                        </h1>
                        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium max-w-2xl`}>
                            Enter readings for today. Consumption is calculated automatically based on opening/closing values.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold ${isDark ? 'text-slate-300 bg-[#161b22] border-[#30363d] hover:bg-[#21262d]' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'} rounded-lg transition-colors border`}
                        >
                            <History className="w-5 h-5" />
                            View History
                        </button>
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold ${isDark ? 'text-slate-300 bg-[#161b22] border-[#30363d] hover:bg-[#21262d]' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'} rounded-lg transition-colors border`}
                        >
                            <Settings className="w-5 h-5" />
                            Config
                        </button>
                    </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className={`${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'} mb-6 px-4 py-3 rounded-xl flex items-center gap-2 border`}>
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${isDark ? 'bg-primary/10 border-primary/20 text-primary-light' : 'bg-green-50 border-green-200 text-green-700'} mb-6 px-4 py-3 rounded-xl flex items-center gap-2 border`}
                    >
                        <CheckCircle className="w-5 h-5" />
                        {successMessage}
                    </motion.div>
                )}

                {/* Liquid Gauge Summary */}
                {totalConsumption > 0 && (
                    <div className="mb-8 flex justify-center">
                        <LiquidDieselGauge
                            value={Math.min(100, (totalConsumption / (generators.reduce((sum, g) => sum + (g.tank_capacity_litres || 1000), 0) || 1000)) * 100)}
                            size={200}
                            consumedLitres={totalConsumption}
                            tankCapacity={generators.reduce((sum, g) => sum + (g.tank_capacity_litres || 1000), 0)}
                            label="Today's Total"
                            isDark={isDark}
                        />
                    </div>
                )}

                {/* Generators Grid */}
                {generators.length === 0 ? (
                    <div className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-100 shadow-sm'} rounded-3xl p-12 text-center border`}>
                        <Fuel className={`w-16 h-16 ${isDark ? 'text-primary/20' : 'text-primary/20'} mx-auto mb-4`} />
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>No Generators Configured</h3>
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-500'} mb-6`}>Add your first diesel generator to start logging.</p>
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className={`px-6 py-3 ${isDark ? 'bg-primary hover:bg-primary-dark shadow-primary/40' : 'bg-primary hover:bg-primary-dark shadow-primary/20'} text-white font-bold rounded-xl transition-colors shadow-lg`}
                        >
                            + Add Generator
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {generators.map((gen) => (
                            <DieselLoggerCard
                                key={gen.id}
                                generator={gen}
                                previousClosing={previousClosings[gen.id]}
                                averageConsumption={averages[gen.id]}
                                onReadingChange={handleReadingChange}
                                isSubmitting={isSubmitting}
                                isDark={isDark}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Sticky Footer */}
            <footer className={`fixed bottom-0 left-0 w-full ${isDark ? 'bg-[#161b22]/90 border-[#21262d]' : 'bg-white/90 border-slate-200'} backdrop-blur-lg border-t z-50`}>
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.back()}
                                className={`hidden sm:flex items-center gap-1 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors font-medium text-sm`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </button>
                            <div className={`h-8 w-[1px] ${isDark ? 'bg-[#21262d]' : 'bg-slate-200'} hidden sm:block`} />
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Today Total</span>
                                <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>{totalConsumption} L</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 pl-4">
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Total Run</span>
                                <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                                    {Math.floor(totalRunTime)}h {Math.round((totalRunTime % 1) * 60)}m
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {warningsCount > 0 && (
                                <div className={`hidden lg:flex items-center gap-2 text-xs font-medium ${isDark ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-rose-600 bg-rose-50 border-rose-100'} px-3 py-1.5 rounded-full border`}>
                                    <AlertTriangle className="w-4 h-4" />
                                    {warningsCount} Warning{warningsCount > 1 ? 's' : ''} pending review
                                </div>
                            )}
                            <button
                                onClick={handleSubmitAll}
                                disabled={isSubmitting || validReadingsCount === 0}
                                className={`${isDark ? 'bg-primary hover:bg-primary-dark shadow-primary/40' : 'bg-primary hover:bg-primary-dark shadow-primary/20'} text-white text-base font-bold py-3 px-8 rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <CheckCircle className={`w-5 h-5 ${!isSubmitting ? 'group-hover:animate-bounce' : ''}`} />
                                {isSubmitting ? 'Submitting...' : 'SUBMIT ALL'}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Config Modal */}
            <GeneratorConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSubmit={handleAddGenerator}
                isDark={isDark}
            />
        </div>
    );
};

export default DieselStaffDashboard;
