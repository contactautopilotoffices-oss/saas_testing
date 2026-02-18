'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { History, Settings, CheckCircle, AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/frontend/utils/supabase/client';
import ElectricityLoggerCard from './ElectricityLoggerCard';
import ElectricityMeterConfigModal from './ElectricityMeterConfigModal';
import ElectricityReadingHistory from './ElectricityReadingHistory';
import { Toast } from '../ui/Toast';

interface ElectricityMeter {
    id: string;
    name: string;
    meter_number?: string;
    meter_type?: string;
    max_load_kw?: number;
    status: string;
    last_reading?: number;
}

interface Property {
    id: string;
    name: string;
    code: string;
}

interface ElectricityReading {
    opening_reading: number;
    closing_reading: number;
    computed_units?: number;
    multiplier_id?: string;
    multiplier_value?: number;
    notes?: string;
    reading_date?: string;
}

interface MeterMultiplier {
    id: string;
    meter_id: string;
    multiplier_value: number;
    ct_ratio_primary: number;
    ct_ratio_secondary: number;
    pt_ratio_primary: number;
    pt_ratio_secondary: number;
    meter_constant: number;
    effective_from: string;
}

interface GridTariff {
    id: string;
    rate_per_unit: number;
    utility_provider?: string;
    effective_from: string;
}

interface ElectricityStaffDashboardProps {
    isDark?: boolean;
    propertyId?: string;
}

/**
 * Staff Dashboard for daily electricity logging
 * v2.1: Simplified logger with per-card save and no cost display.
 */
const ElectricityStaffDashboard: React.FC<ElectricityStaffDashboardProps> = ({ isDark = false, propertyId: propIdFromProps }) => {
    const params = useParams();
    const router = useRouter();
    const propertyId = propIdFromProps || (params?.propertyId as string);
    const supabase = createClient();

    // State
    const [property, setProperty] = useState<Property | null>(null);
    const [meters, setMeters] = useState<ElectricityMeter[]>([]);
    const [readings, setReadings] = useState<Record<string, ElectricityReading>>({});
    const [previousClosings, setPreviousClosings] = useState<Record<string, number>>({});
    const [averages, setAverages] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error', visible: boolean }>({
        message: '',
        type: 'success',
        visible: false
    });

    // v2: Multipliers and Tariffs state
    const [multipliersMap, setMultipliersMap] = useState<Record<string, MeterMultiplier[]>>({});
    const [activeTariff, setActiveTariff] = useState<GridTariff | null>(null);



    // Fetch property and meters
    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        setError(null);

        console.log('[ElectricityDashboard] Fetching data for property:', propertyId);

        try {
            // Fetch property
            const { data: propData, error: propError } = await supabase
                .from('properties')
                .select('id, name, code')
                .eq('id', propertyId)
                .single();

            if (propError) throw propError;
            setProperty(propData);

            // Fetch meters
            const { data: metersData, error: metersError } = await supabase
                .from('electricity_meters')
                .select('*')
                .eq('property_id', propertyId)
                .is('deleted_at', null)
                .order('name');

            if (metersError) throw metersError;

            const fetchedMeters = metersData || [];
            setMeters(fetchedMeters);
            console.log('[ElectricityDashboard] Fetched', fetchedMeters.length, 'meters');

            // Fetch yesterday's readings for opening readings
            if (fetchedMeters.length > 0) {
                // We'll use the last_reading from the meter itself as the primary fallback,
                // but fetching the latest reading specifically can be redundant if last_reading is robust.
                // However, fetching strictly yesterday's reading might be intentional for daily logs.
                // Let's stick to checking the latest reading entry for relevant meters.

                const { data: latestReadings, error: latestError } = await supabase
                    .from('electricity_readings')
                    .select('meter_id, closing_reading, reading_date, created_at')
                    .eq('property_id', propertyId)
                    .order('reading_date', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(fetchedMeters.length * 2); // Get recent history

                if (!latestError && latestReadings) {
                    const closings: Record<string, number> = {};
                    // Logic: Find the most recent closing reading for each meter
                    latestReadings.forEach((r) => {
                        if (!closings[r.meter_id]) {
                            closings[r.meter_id] = r.closing_reading;
                        }
                    });
                    setPreviousClosings(closings);
                }

                // Fetch 30-day averages
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const avgRes = await fetch(
                    `/api/properties/${propertyId}/electricity-readings?startDate=${monthAgo}`
                );
                if (avgRes.ok) {
                    const avgData = await avgRes.json();
                    const avgByMeter: Record<string, number[]> = {};
                    avgData.forEach((r: any) => {
                        if (!avgByMeter[r.meter_id]) avgByMeter[r.meter_id] = [];
                        if (r.computed_units) avgByMeter[r.meter_id].push(r.computed_units);
                    });
                    const avgs: Record<string, number> = {};
                    Object.entries(avgByMeter).forEach(([meterId, values]) => {
                        if (values.length > 0) {
                            avgs[meterId] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                        }
                    });
                    setAverages(avgs);
                    console.log('[ElectricityDashboard] Averages:', avgs);
                }

                // v2: Fetch multipliers for all meters
                const multipliersRes = await fetch(`/api/properties/${propertyId}/meter-multipliers`);
                if (multipliersRes.ok) {
                    const multipliersData = await multipliersRes.json();
                    const multMap: Record<string, MeterMultiplier[]> = {};
                    multipliersData.forEach((m: any) => {
                        if (!multMap[m.meter_id]) multMap[m.meter_id] = [];
                        multMap[m.meter_id].push(m);
                    });
                    setMultipliersMap(multMap);
                    console.log('[ElectricityDashboard] Multipliers fetched for', Object.keys(multMap).length, 'meters');
                }

                // v2: Fetch active tariff for property
                const today = new Date().toISOString().split('T')[0];
                const tariffRes = await fetch(`/api/properties/${propertyId}/grid-tariffs?date=${today}`);
                if (tariffRes.ok) {
                    const tariffData = await tariffRes.json();
                    setActiveTariff(tariffData);
                    console.log('[ElectricityDashboard] Active tariff:', tariffData?.rate_per_unit);
                }
            }
        } catch (err: any) {
            console.error('[ElectricityDashboard] Error:', err.message);
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle reading changes from cards
    const handleReadingChange = (meterId: string, reading: ElectricityReading) => {
        setReadings(prev => ({ ...prev, [meterId]: reading }));
    };

    // Keep validation logic for Submit All fallback
    const validReadingsCount = Object.values(readings).filter(
        r => r.closing_reading > r.opening_reading
    ).length;

    // Submit all readings (fallback)
    const handleSubmitAll = async () => {
        if (validReadingsCount === 0) {
            setError('Please enter at least one valid reading');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        console.log('[ElectricityDashboard] Submitting', validReadingsCount, 'readings');

        try {
            const readingsToSubmit = Object.entries(readings)
                .filter(([_, r]) => r.closing_reading > r.opening_reading)
                .map(([meterId, r]) => ({
                    meter_id: meterId,
                    reading_date: r.reading_date || new Date().toISOString().split('T')[0],
                    ...r,
                    alert_status: averages[meterId] && r.computed_units &&
                        r.computed_units > averages[meterId] * 1.25 ? 'warning' : 'normal',
                }));

            const res = await fetch(`/api/properties/${propertyId}/electricity-readings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readings: readingsToSubmit }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to submit readings');
            }

            console.log('[ElectricityDashboard] Submission successful');
            setToast({ message: 'All readings submitted successfully!', type: 'success', visible: true });
            setTimeout(() => setSuccessMessage(null), 3000);

            // Reset readings
            setReadings({});
            fetchData(); // Refresh to get new last_reading values
        } catch (err: any) {
            console.error('[ElectricityDashboard] Submit error:', err.message);
            setError(err.message || 'Failed to submit readings');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit single reading
    const handleSaveSingleReading = async (meterId: string) => {
        const r = readings[meterId];
        if (!r || r.closing_reading <= r.opening_reading) return;

        console.log('[ElectricityDashboard] Saving single reading:', meterId);
        setIsSubmitting(true);
        setError(null);

        try {
            const readingToSubmit = {
                meter_id: meterId,
                reading_date: r.reading_date || new Date().toISOString().split('T')[0],
                ...r,
                alert_status: 'normal',
            };

            const res = await fetch(`/api/properties/${propertyId}/electricity-readings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readings: [readingToSubmit] }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save reading');
            }

            setToast({ message: 'Entry saved successfully', type: 'success', visible: true });
            setTimeout(() => setSuccessMessage(null), 3000);

            // Refresh
            fetchData();
        } catch (err: any) {
            console.error('[ElectricityDashboard] Save error:', err.message);
            setToast({ message: err.message, type: 'error', visible: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    // v2: Save multiplier from card flip editor
    const handleSaveMultiplier = async (meterId: string, multiplierData: any) => {
        console.log('[ElectricityDashboard] Saving multiplier for meter:', meterId, multiplierData);

        const res = await fetch(`/api/properties/${propertyId}/meter-multipliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(multiplierData),
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save multiplier');
        }

        const newMult = await res.json();
        console.log('[ElectricityDashboard] Multiplier saved:', newMult.id);

        // Update local state
        setMultipliersMap(prev => ({
            ...prev,
            [meterId]: [newMult, ...(prev[meterId] || []).slice(0, 4)], // Keep last 5
        }));

        setToast({ message: 'Multiplier saved successfully!', type: 'success', visible: true });
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Add meter
    const handleAddMeter = async (data: any) => {
        console.log('[ElectricityDashboard] Adding meter:', data);
        const { initial_multiplier, ...meterData } = data;

        const res = await fetch(`/api/properties/${propertyId}/electricity-meters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meterData),
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to add meter');
        }
        const newMeter = await res.json();
        if (initial_multiplier && newMeter?.id) {
            try {
                await fetch(`/api/properties/${propertyId}/meter-multipliers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meter_id: newMeter.id, ...initial_multiplier }),
                });
            } catch (e) { console.warn(e); }
        }
        setToast({ message: 'Meter added successfully!', type: 'success', visible: true });
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData();
    };

    // Delete meter
    const handleDeleteMeter = async (meterId: string) => {
        try {
            const { error } = await supabase
                .from('electricity_meters')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', meterId);

            if (error) throw error;

            setToast({ message: 'Meter deleted successfully', type: 'success', visible: true });
            setTimeout(() => setSuccessMessage(null), 3000);
            fetchData();
        } catch (err: any) {
            console.error('Delete error:', err);
            setToast({ message: err.message || 'Failed to delete meter', type: 'error', visible: true });
        }
    };

    // Export
    const handleExport = () => {
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        window.open(`/api/properties/${propertyId}/electricity-export?startDate=${monthAgo}&endDate=${today}`, '_blank');
    };

    if (!propertyId) return <div>Select Property</div>;
    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-background pb-24 transition-colors duration-300">


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
                            Daily Electricity Log
                        </h1>
                        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium max-w-2xl`}>
                            Enter meter readings for today. Consumption is calculated automatically based on opening/closing values.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowHistory(true)} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold ${isDark ? 'text-slate-300 bg-[#161b22] border-[#30363d]' : 'text-slate-600 bg-white border-slate-200'} rounded-lg border`}>
                            <History className="w-5 h-5" /> View History
                        </button>
                        <button onClick={() => setShowConfigModal(true)} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold ${isDark ? 'text-slate-300 bg-[#161b22] border-[#30363d]' : 'text-slate-600 bg-white border-slate-200'} rounded-lg border`}>
                            <Settings className="w-5 h-5" /> Config
                        </button>
                    </div>
                </div>

                <Toast
                    message={toast.message}
                    type={toast.type}
                    visible={toast.visible}
                    onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                />

                {/* Meters Grid */}
                {meters.length === 0 ? (
                    <div className="rounded-3xl p-12 text-center border bg-white border-slate-100 shadow-sm">
                        <Zap className="w-16 h-16 text-primary/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Meters Configured</h3>
                        <button onClick={() => setShowConfigModal(true)} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg">+ Add Meter</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {meters.map((meter) => (
                            <ElectricityLoggerCard
                                key={meter.id}
                                meter={meter}
                                previousClosing={previousClosings[meter.id]}
                                averageConsumption={averages[meter.id]}
                                multipliers={multipliersMap[meter.id] || []}
                                activeTariffRate={activeTariff?.rate_per_unit || 0}
                                onReadingChange={handleReadingChange}
                                onSave={handleSaveSingleReading}
                                onMultiplierSave={handleSaveMultiplier}
                                onDelete={handleDeleteMeter}
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
                            <button onClick={() => router.back()} className={`flex items-center gap-1 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'} font-medium text-sm`}>
                                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSubmitAll}
                                disabled={isSubmitting || validReadingsCount === 0}
                                className={`bg-primary text-white text-base font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                {isSubmitting ? 'Submitting...' : 'SUBMIT ALL'}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>

            <ElectricityMeterConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSubmit={handleAddMeter}
                isDark={isDark}
            />

            {showHistory && (
                <div className="fixed inset-0 lg:ml-64 z-[60] bg-background animate-in slide-in-from-right duration-300 shadow-2xl border-l border-slate-300">
                    <ElectricityReadingHistory
                        propertyId={propertyId}
                        isDark={isDark}
                        onBack={() => setShowHistory(false)}
                        onDeleteSuccess={fetchData}
                    />
                </div>
            )}
        </div>
    );
};

export default ElectricityStaffDashboard;
