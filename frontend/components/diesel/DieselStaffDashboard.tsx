'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, History, Settings, CheckCircle, AlertTriangle, ArrowLeft, Fuel } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/frontend/utils/supabase/client';
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
    tariff_id?: string;
    tariff_rate?: number;
    notes?: string;
}

interface DieselStaffDashboardProps {
    propertyId?: string;
    isDark?: boolean;
}

const DieselStaffDashboard: React.FC<DieselStaffDashboardProps> = ({ propertyId: propIdFromProps, isDark = false }) => {
    const params = useParams();
    const router = useRouter();
    const propertyId = propIdFromProps || (params?.propertyId as string);
    const supabase = createClient();

    // State
    const [property, setProperty] = useState<Property | null>(null);
    const [generators, setGenerators] = useState<Generator[]>([]);
    const [readings, setReadings] = useState<Record<string, DieselReading>>({});
    const [previousClosings, setPreviousClosings] = useState<Record<string, number>>({});
    const [averages, setAverages] = useState<Record<string, number>>({});
    const [activeTariffs, setActiveTariffs] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Current date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Fetch data
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

            // Fetch yesterday's readings for opening
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

                // Fetch averages
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

                // Fetch tariffs for each generator
                const today = new Date().toISOString().split('T')[0];
                const tariffs: Record<string, any> = {};
                await Promise.all(generatorsData.map(async (gen: Generator) => {
                    try {
                        const tariffRes = await fetch(`/api/properties/${propertyId}/dg-tariffs?generator_id=${gen.id}&date=${today}`);
                        if (tariffRes.ok) {
                            const t = await tariffRes.json();
                            tariffs[gen.id] = t;
                        }
                    } catch (e) {
                        console.warn('No tariff for', gen.name);
                    }
                }));
                setActiveTariffs(tariffs);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle reading changes
    const handleReadingChange = (generatorId: string, reading: DieselReading) => {
        setReadings(prev => ({ ...prev, [generatorId]: reading }));
    };

    // Save Single Reading
    const handleSaveSingleReading = async (generatorId: string) => {
        const r = readings[generatorId];
        if (!r || r.closing_hours <= r.opening_hours) {
            setError('Invalid reading provided');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const readingToSubmit = {
                generator_id: generatorId,
                reading_date: new Date().toISOString().split('T')[0],
                ...r,
                alert_status: averages[generatorId] && r.computed_consumed_litres &&
                    r.computed_consumed_litres > averages[generatorId] * 1.25 ? 'warning' : 'normal',
            };

            const res = await fetch(`/api/properties/${propertyId}/diesel-readings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readings: [readingToSubmit] }),
            });

            if (!res.ok) throw new Error('Failed to save reading');

            setSuccessMessage('Entry saved!');
            setTimeout(() => setSuccessMessage(null), 2000);

            // Refresh data to lock in the new opening hours for next time? 
            // Or just clear current state for that generator?
            // For now, we keep it as is, maybe user wants to edit.
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDeleteGenerator = async (generatorId: string) => {
        if (!window.confirm('Delete this generator?')) return;
        try {
            const res = await fetch(`/api/properties/${propertyId}/generators?id=${generatorId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed delete');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) return <div className="p-12 text-center text-slate-500">Loading...</div>;

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#0d1117]' : 'bg-slate-50'} transition-colors duration-300`}>
            {/* Top Navigation */}
            <header className={`sticky top-0 z-30 w-full border-b ${isDark ? 'bg-[#161b22]/80 border-[#30363d]' : 'bg-white/80 border-slate-200'} backdrop-blur-md`}>
                <div className="px-4 sm:px-6 lg:px-8 py-4 mx-auto max-w-7xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100/50 border border-slate-200 px-3 py-1.5 rounded-full select-none">
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span className="text-sm font-bold text-slate-700 tracking-tight">
                                    {property?.name || 'Loading...'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                                <span>{dateStr}</span>
                                <span className="text-slate-300">•</span>
                                <span>{timeStr}</span>
                            </div>
                            <div className={`hidden sm:flex items-center gap-2 ${isDark ? 'text-emerald-500' : 'text-emerald-600'} text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full`}>
                                <CheckCircle className="w-3 h-3" />
                                <span>Auto-Sync</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <Fuel className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-primary tracking-widest uppercase">Diesel Logger</span>
                        </div>
                        <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Generator Readings
                        </h1>
                        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium max-w-2xl text-sm leading-relaxed`}>
                            Enter closing hours and fuel added for each generator. Consumption is calculated automatically.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${isDark ? 'bg-[#21262d] text-white border-[#30363d] hover:bg-[#30363d]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'} rounded-lg border transition-all`}
                        >
                            <Settings className="w-4 h-4" />
                            Reference Config
                        </button>
                    </div>
                </div>

                {/* Messages */}
                {successMessage && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2 font-bold shadow-sm">
                        <CheckCircle className="w-5 h-5" /> {successMessage}
                    </motion.div>
                )}
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2 font-bold shadow-sm">
                        <AlertTriangle className="w-5 h-5" /> {error}
                    </motion.div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generators.map(gen => (
                        <DieselLoggerCard
                            key={gen.id}
                            generator={gen}
                            previousClosing={previousClosings[gen.id]}
                            averageConsumption={averages[gen.id]}
                            activeTariff={activeTariffs[gen.id]}
                            onReadingChange={handleReadingChange}
                            onSave={handleSaveSingleReading}
                            onDelete={handleDeleteGenerator}
                            isSubmitting={isSubmitting}
                            isDark={isDark}
                        />
                    ))}
                    {generators.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-slate-400 font-bold">No generators found.</p>
                            <button onClick={() => setShowConfigModal(true)} className="mt-4 text-primary font-bold hover:underline">Configure Generators</button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer - Minimal */}
            <footer className={`fixed bottom-0 left-0 w-full ${isDark ? 'bg-[#0d1117]/80 border-[#30363d]' : 'bg-white/90 border-slate-200'} backdrop-blur-xl border-t z-50`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Analytics
                    </button>
                    {/* Only show simplified status here, no cost/units totals to avoid clutter/confusion */}
                    <div className="text-xs font-bold text-slate-400">
                        {Object.keys(readings).length} active entries
                    </div>
                </div>
            </footer>

            {/* Config Modal */}
            <GeneratorConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSubmit={async (data) => {
                    const res = await fetch(`/api/properties/${propertyId}/generators`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (res.ok) fetchData();
                }}
                isDark={isDark}
            />
        </div>
    );
};

export default DieselStaffDashboard;
