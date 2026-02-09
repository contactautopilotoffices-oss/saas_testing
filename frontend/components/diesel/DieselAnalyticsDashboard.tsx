'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar, TrendingUp, Download, Fuel, AlertTriangle,
    BarChart3, Plus, X, IndianRupee, Activity, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { createClient } from '@/frontend/utils/supabase/client';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, Area, AreaChart, YAxis, CartesianGrid } from 'recharts';
import DieselStaffDashboard from './DieselStaffDashboard';

interface Generator {
    id: string;
    name: string;
    capacity_kva?: number;
}

interface DieselReading {
    id: string;
    generator_id: string;
    reading_date: string;
    opening_hours: number;
    closing_hours: number;
    diesel_added_litres: number;
    computed_consumed_litres: number;
    computed_cost: number;
    tariff_rate: number;
    generator: { name: string; capacity_kva?: number };
}

interface TrendPoint {
    date: string;
    cost: number;
    litres: number;
}

interface DieselAnalyticsDashboardProps {
    propertyId?: string;
    orgId?: string;
}

const DieselAnalyticsDashboard: React.FC<DieselAnalyticsDashboardProps> = ({ propertyId: propIdFromProps, orgId }) => {
    const params = useParams();
    const propertyId = propIdFromProps || (params?.propertyId as string);
    const supabase = createClient();

    // UI State
    const [viewMode, setViewMode] = useState<'combined' | 'generator'>('combined');
    const [selectedGenId, setSelectedGenId] = useState<string>('all');
    const [costTimeframe, setCostTimeframe] = useState<'today' | 'month'>('month');
    const [litresTimeframe, setLitresTimeframe] = useState<'today' | 'month'>('month');
    const [trendMetric, setTrendMetric] = useState<'cost' | 'litres'>('cost');
    const [trendPeriod, setTrendPeriod] = useState<'7D' | '30D'>('7D');
    const [showLogModal, setShowLogModal] = useState(false);

    // Data State
    const [property, setProperty] = useState<{ name: string } | null>(null);
    const [generators, setGenerators] = useState<Generator[]>([]);
    const [rawReadings, setRawReadings] = useState<{
        today: DieselReading[];
        month: DieselReading[];
        prevMonth: DieselReading[];
        trend: DieselReading[];
    }>({ today: [], month: [], prevMonth: [], trend: [] });

    const [activeTariff, setActiveTariff] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Initial Data
    const fetchData = useCallback(async () => {
        if (!propertyId && !orgId) return;
        setIsLoading(true);

        try {
            // 1. Property Name
            if (propertyId) {
                const { data } = await supabase.from('properties').select('name').eq('id', propertyId).single();
                setProperty(data);
            }

            // 2. Generators
            const gensRes = await fetch(propertyId
                ? `/api/properties/${propertyId}/generators`
                : `/api/organizations/${orgId}/generators`);
            let gens: Generator[] = [];
            if (gensRes.ok) {
                gens = await gensRes.json();
                setGenerators(gens);
            }

            // 3. Tariff (Approximate from first gen or API)
            const today = new Date().toISOString().split('T')[0];
            if (gens.length > 0) {
                const tariffRes = await fetch(`/api/properties/${propertyId}/dg-tariffs?generator_id=${gens[0].id}&date=${today}`);
                if (tariffRes.ok) {
                    const t = await tariffRes.json();
                    setActiveTariff(t?.cost_per_litre || 0);
                }
            }

            // 4. Readings (Batch or separate)
            const dates = {
                today: today,
                monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                prevMonthStart: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
                prevMonthEnd: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0],
                trendStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            const [todayR, monthR, prevMonthR, trendR] = await Promise.all([
                fetch(`/api/properties/${propertyId}/diesel-readings?period=today`).then(r => r.json()),
                fetch(`/api/properties/${propertyId}/diesel-readings?period=month`).then(r => r.json()),
                fetch(`/api/properties/${propertyId}/diesel-readings?startDate=${dates.prevMonthStart}&endDate=${dates.prevMonthEnd}`).then(r => r.json()),
                fetch(`/api/properties/${propertyId}/diesel-readings?startDate=${dates.trendStart}`).then(r => r.json())
            ]);

            setRawReadings({
                today: todayR || [],
                month: monthR || [],
                prevMonth: prevMonthR || [],
                trend: trendR || []
            });

        } catch (error) {
            console.error('Failed to load diesel data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, orgId, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived Metrics
    const metrics = useMemo(() => {
        const filterFn = (r: DieselReading) => {
            if (viewMode === 'combined') return true;
            return r.generator_id === selectedGenId;
        };

        const calc = (readings: DieselReading[]) => {
            return readings.filter(filterFn).reduce((acc, r) => ({
                cost: acc.cost + (r.computed_cost || 0),
                litres: acc.litres + (r.computed_consumed_litres || 0)
            }), { cost: 0, litres: 0 });
        };

        const today = calc(rawReadings.today);
        const month = calc(rawReadings.month);
        const prevMonth = calc(rawReadings.prevMonth);

        // Averages (Month)
        const uniqueDays = new Set(rawReadings.month.filter(filterFn).map(r => r.reading_date)).size || 1;
        const avgDailyCost = month.cost / uniqueDays;
        const avgDailyLitres = month.litres / uniqueDays;

        return {
            today,
            month,
            prevMonth,
            averages: { cost: avgDailyCost, litres: avgDailyLitres }
        };
    }, [rawReadings, viewMode, selectedGenId]);

    // Derived Trend Data
    const chartData = useMemo(() => {
        const days = trendPeriod === '7D' ? 7 : 30;
        const result: TrendPoint[] = [];
        const now = new Date();

        const filterFn = (r: DieselReading) => {
            if (viewMode === 'combined') return true;
            return r.generator_id === selectedGenId;
        };

        const relevantReadings = rawReadings.trend.filter(filterFn);

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

            const dayReadings = relevantReadings.filter(r => r.reading_date === dateStr);
            const dayTotals = dayReadings.reduce((acc, r) => ({
                cost: acc.cost + (r.computed_cost || 0),
                litres: acc.litres + (r.computed_consumed_litres || 0)
            }), { cost: 0, litres: 0 });

            result.push({
                date: label,
                cost: Math.round(dayTotals.cost),
                litres: Math.round(dayTotals.litres)
            });
        }
        return result;
    }, [rawReadings.trend, trendPeriod, viewMode, selectedGenId]);

    // Format Helpers
    const fmtCost = (val: number) => val > 0 ? `₹${val.toLocaleString()}` : '—';
    const fmtLitres = (val: number) => val > 0 ? `${Math.round(val).toLocaleString()} L` : '—';

    // Current Display Values
    const displayCost = costTimeframe === 'today' ? metrics.today.cost : metrics.month.cost;
    const displayLitres = litresTimeframe === 'today' ? metrics.today.litres : metrics.month.litres;

    if (isLoading) return <div className="p-12 text-center text-slate-500">Loading Analytics...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        DG Power Analytics
                        {property?.name && <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{property.name}</span>}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        {activeTariff > 0 ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                Active Tariff: ₹{activeTariff}/L
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 flex items-center gap-1.5 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                No Tariff Configured - Costs will show as ₹0
                            </span>
                        )}
                        <span className="text-xs font-medium text-slate-400">
                            Updates daily based on logs
                        </span>
                    </div>
                </div>

                {/* Scope Toggle */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => { setViewMode('combined'); setSelectedGenId('all'); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'combined' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Combined
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => { setViewMode('generator'); if (generators.length && selectedGenId === 'all') setSelectedGenId(generators[0].id); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'generator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Generator-wise
                            {viewMode === 'generator' && <ChevronDown className="w-3 h-3" />}
                        </button>
                        {viewMode === 'generator' && (
                            <select
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                value={selectedGenId}
                                onChange={(e) => setSelectedGenId(e.target.value)}
                            >
                                {generators.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* 3-Tile Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tile 1: Cost (Primary) - Mint Green Theme */}
                <div className="bg-[#ecfdf5] rounded-2xl p-6 shadow-sm border border-emerald-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <IndianRupee className="w-24 h-24 text-emerald-600" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="p-2.5 bg-emerald-100 rounded-full text-emerald-600">
                                        <IndianRupee className="w-5 h-5" />
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 uppercase tracking-widest leading-tight">
                                        DIESEL<br />COST
                                    </span>
                                </div>
                                <div className="flex bg-emerald-100/50 rounded-lg p-1">
                                    <button onClick={() => setCostTimeframe('today')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${costTimeframe === 'today' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-emerald-600'}`}>Today</button>
                                    <button onClick={() => setCostTimeframe('month')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${costTimeframe === 'month' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-emerald-600'}`}>This Month</button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    {fmtCost(displayCost)}
                                </div>
                                <div className="h-1.5 w-12 bg-emerald-500 rounded-full mt-4 mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    {costTimeframe === 'today' ? 'Total today' : 'Total this month'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tile 2: Litres (Secondary) - Amber/Yellow Theme */}
                <div className="bg-[#fffbeb] rounded-2xl p-6 shadow-sm border border-amber-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Fuel className="w-24 h-24 text-amber-600" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="p-2.5 bg-amber-100 rounded-full text-amber-600">
                                        <Fuel className="w-5 h-5" />
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 uppercase tracking-widest leading-tight">
                                        LITRES<br />CONSUMED
                                    </span>
                                </div>
                                <div className="flex bg-amber-100/50 rounded-lg p-1">
                                    <button onClick={() => setLitresTimeframe('today')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${litresTimeframe === 'today' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-amber-600'}`}>Today</button>
                                    <button onClick={() => setLitresTimeframe('month')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${litresTimeframe === 'month' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-amber-600'}`}>This Month</button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    {fmtLitres(displayLitres)}
                                </div>
                                <div className="h-1.5 w-12 bg-amber-500 rounded-full mt-4 mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    {litresTimeframe === 'today' ? 'Consumed today' : 'Consumed this month'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tile 3: Averages - Peach/Orange Theme */}
                <div className="bg-[#fff7ed] rounded-2xl p-6 shadow-sm border border-orange-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Activity className="w-24 h-24 text-orange-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2.5 bg-orange-100 rounded-full text-orange-500">
                                <BarChart3 className="w-5 h-5" />
                            </span>
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-widest leading-tight">
                                DAILY<br />AVERAGE
                            </span>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-800">{fmtCost(Math.round(metrics.averages.cost))}</span>
                                </div>
                                <div className="h-1 w-8 bg-orange-500 rounded-full mt-1" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-slate-600">{fmtLitres(Math.round(metrics.averages.litres))}</span>
                                </div>
                                <div className="h-1 w-8 bg-orange-300 rounded-full mt-1" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trends Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Consumption Trends</h3>
                        <p className="text-sm text-slate-500">Analyze usage patterns over time</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Metric Toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setTrendMetric('cost')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${trendMetric === 'cost' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                                <IndianRupee className="w-3 h-3" /> Cost
                            </button>
                            <button onClick={() => setTrendMetric('litres')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${trendMetric === 'litres' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                                <Fuel className="w-3 h-3" /> Litres
                            </button>
                        </div>
                        {/* Period Toggle */}
                        <div className="flex gap-2">
                            <button onClick={() => setTrendPeriod('7D')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${trendPeriod === '7D' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>7 Days</button>
                            <button onClick={() => setTrendPeriod('30D')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${trendPeriod === '30D' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>30 Days</button>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[300px] w-full">
                    {chartData.every(d => d[trendMetric] === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                            <p className="font-medium">No data logged for selected period</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValueDiesel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={trendMetric === 'cost' ? '#10b981' : '#64748b'} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={trendMetric === 'cost' ? '#10b981' : '#64748b'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => trendMetric === 'cost' ? `₹${val}` : val}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey={trendMetric}
                                    stroke={trendMetric === 'cost' ? '#10b981' : '#64748b'}
                                    fillOpacity={1}
                                    fill="url(#colorValueDiesel)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CTA Bar */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
                <button
                    onClick={() => setShowLogModal(true)}
                    className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl hover:bg-black transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Log Entry"
                >
                    <Plus className="w-6 h-6" />
                </button>
                <button
                    onClick={() => {
                        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const today = new Date().toISOString().split('T')[0];
                        window.open(`/api/properties/${propertyId}/diesel-export?startDate=${monthAgo}&endDate=${today}`, '_blank');
                    }}
                    className="h-14 w-14 rounded-full bg-white text-slate-900 shadow-xl border border-slate-200 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Export Report"
                >
                    <Download className="w-6 h-6" />
                </button>
            </div>

            {/* Log Entry Modal */}
            <AnimatePresence>
                {showLogModal && propertyId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
                        onClick={() => setShowLogModal(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4 z-10">
                                <button onClick={() => { setShowLogModal(false); fetchData(); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <div className="p-2">
                                <DieselStaffDashboard propertyId={propertyId} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DieselAnalyticsDashboard;
