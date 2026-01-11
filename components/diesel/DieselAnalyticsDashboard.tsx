'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, TrendingUp, Download, Fuel, AlertTriangle,
    Plus, ChevronRight, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import LiquidDieselGauge from './LiquidDieselGauge';

interface Generator {
    id: string;
    name: string;
    make?: string;
    capacity_kva?: number;
}

interface DieselMetrics {
    today: number;
    month: number;
    average: number;
    todayChange: number;
    monthChange: number;
}

interface GeneratorBreakdown {
    id: string;
    name: string;
    capacity_kva?: number;
    totalLitres: number;
    percentage: number;
}

interface Alert {
    id: string;
    generator_name: string;
    message: string;
    time: string;
    severity: 'warning' | 'critical';
}

/**
 * Admin/Super Admin analytics dashboard for diesel consumption
 * Matches the provided HTML mockup design with golden theme
 */
const DieselAnalyticsDashboard: React.FC = () => {
    const params = useParams();
    const propertyId = params?.propertyId as string;
    const supabase = createClient();

    // State
    const [property, setProperty] = useState<{ name: string } | null>(null);
    const [metrics, setMetrics] = useState<DieselMetrics>({
        today: 0,
        month: 0,
        average: 0,
        todayChange: 0,
        monthChange: 0,
    });
    const [breakdown, setBreakdown] = useState<GeneratorBreakdown[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; value: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<'7D' | '30D'>('7D');
    const [tankCapacity, setTankCapacity] = useState(1000);
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState<Date | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);

        try {
            // Fetch property name
            const { data: propData } = await supabase
                .from('properties')
                .select('name')
                .eq('id', propertyId)
                .single();
            setProperty(propData);

            // Fetch generators for tank capacity and maintenance date
            const gensRes = await fetch(`/api/properties/${propertyId}/generators`);
            const generators = await gensRes.json() || [];
            const totalTankCapacity = generators.reduce((sum: number, g: any) => sum + (g.tank_capacity_litres || 1000), 0);
            const nextMaintenance = generators
                .filter((g: any) => g.next_maintenance_date)
                .map((g: any) => new Date(g.next_maintenance_date))
                .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

            // Fetch today's readings
            const todayRes = await fetch(`/api/properties/${propertyId}/diesel-readings?period=today`);
            const todayData = await todayRes.json();
            const todayTotal = (todayData || []).reduce((sum: number, r: any) =>
                sum + (r.computed_consumed_litres || 0), 0);

            // Fetch this month's readings
            const monthRes = await fetch(`/api/properties/${propertyId}/diesel-readings?period=month`);
            const monthData = await monthRes.json();
            const monthTotal = (monthData || []).reduce((sum: number, r: any) =>
                sum + (r.computed_consumed_litres || 0), 0);

            // Fetch previous month's readings for comparison
            const prevMonthStart = new Date();
            prevMonthStart.setMonth(prevMonthStart.getMonth() - 2);
            const prevMonthEnd = new Date();
            prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);
            const prevMonthRes = await fetch(
                `/api/properties/${propertyId}/diesel-readings?startDate=${prevMonthStart.toISOString().split('T')[0]}&endDate=${prevMonthEnd.toISOString().split('T')[0]}`
            );
            const prevMonthData = await prevMonthRes.json();
            const prevMonthTotal = (prevMonthData || []).reduce((sum: number, r: any) =>
                sum + (r.computed_consumed_litres || 0), 0);

            // Calculate daily average
            const uniqueDays = new Set((monthData || []).map((r: any) => r.reading_date)).size;
            const avgDaily = uniqueDays > 0 ? Math.round(monthTotal / uniqueDays) : 0;

            // Calculate month-over-month change
            const monthChange = prevMonthTotal > 0
                ? Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100)
                : 0;

            setMetrics({
                today: Math.round(todayTotal),
                month: Math.round(monthTotal),
                average: avgDaily,
                todayChange: avgDaily > 0 ? Math.round(((todayTotal - avgDaily) / avgDaily) * 100) : 0,
                monthChange,
            });

            // Store additional data for UI
            setTankCapacity(totalTankCapacity);
            setNextMaintenanceDate(nextMaintenance || null);

            // Calculate generator breakdown
            const genBreakdown: Record<string, { litres: number; name: string; capacity?: number }> = {};
            (monthData || []).forEach((r: any) => {
                const genId = r.generator_id;
                if (!genBreakdown[genId]) {
                    genBreakdown[genId] = {
                        litres: 0,
                        name: r.generator?.name || 'Unknown',
                        capacity: r.generator?.capacity_kva,
                    };
                }
                genBreakdown[genId].litres += r.computed_consumed_litres || 0;
            });

            const totalMonthLitres = Object.values(genBreakdown).reduce((sum, g) => sum + g.litres, 0);
            const breakdownArr: GeneratorBreakdown[] = Object.entries(genBreakdown)
                .map(([id, data]) => ({
                    id,
                    name: data.name,
                    capacity_kva: data.capacity,
                    totalLitres: Math.round(data.litres),
                    percentage: totalMonthLitres > 0 ? Math.round((data.litres / totalMonthLitres) * 100) : 0,
                }))
                .sort((a, b) => b.totalLitres - a.totalLitres);
            setBreakdown(breakdownArr);

            // Build trend data based on selected period (7D or 30D)
            const daysToFetch = period === '30D' ? 30 : 7;
            const trendRes = await fetch(`/api/properties/${propertyId}/diesel-readings?period=${period === '30D' ? 'month' : 'week'}`);
            const trendRawData = await trendRes.json();
            const dailyTotals: Record<string, number> = {};
            (trendRawData || []).forEach((r: any) => {
                const date = r.reading_date;
                if (!dailyTotals[date]) dailyTotals[date] = 0;
                dailyTotals[date] += r.computed_consumed_litres || 0;
            });

            // Fill in missing days
            const trend: { date: string; value: number }[] = [];
            for (let i = daysToFetch - 1; i >= 0; i--) {
                const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                const dateStr = d.toISOString().split('T')[0];
                trend.push({
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: Math.round(dailyTotals[dateStr] || 0),
                });
            }
            setTrendData(trend);

            // Get alerts (high consumption readings)
            const alertsList: Alert[] = (monthData || [])
                .filter((r: any) => r.alert_status === 'warning' || r.alert_status === 'critical')
                .slice(0, 5)
                .map((r: any) => ({
                    id: r.id,
                    generator_name: r.generator?.name || 'Unknown',
                    message: `${r.generator?.name} consumption is high (${r.computed_consumed_litres}L)`,
                    time: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    severity: r.alert_status as 'warning' | 'critical',
                }));
            setAlerts(alertsList);

        } catch (err) {
            console.error('Failed to fetch diesel analytics:', err);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData, period]);

    // Export to Excel
    const handleExport = () => {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        window.open(
            `/api/properties/${propertyId}/diesel-export?startDate=${monthAgo}&endDate=${today}`,
            '_blank'
        );
    };

    // Chart SVG renderer
    const maxValue = Math.max(...trendData.map(d => d.value), 1);
    const chartWidth = 800;
    const chartHeight = 280;
    const points = trendData.map((d, i) => ({
        x: (i / (trendData.length - 1)) * chartWidth,
        y: chartHeight - (d.value / maxValue) * (chartHeight - 40) - 20,
    }));

    const pathD = points.length > 1
        ? `M${points[0].x},${points[0].y} ${points.slice(1).map(p => `L${p.x},${p.y}`).join(' ')}`
        : '';
    const areaD = pathD
        ? `${pathD} L${chartWidth},${chartHeight} L0,${chartHeight} Z`
        : '';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                            Diesel Analytics
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 font-medium">
                        <Calendar className="w-4 h-4" />
                        {currentMonth}
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-lg border border-amber-200 text-slate-900 text-sm font-bold hover:bg-amber-50 transition-colors bg-white"
                >
                    <Download className="w-4 h-4" />
                    <span>Report</span>
                </button>
            </div>

            {/* Metrics Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today */}
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Fuel className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                                <Calendar className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">Today&apos;s Consumption</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.today} L</p>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className={`w-4 h-4 ${metrics.todayChange >= 0 ? 'text-amber-500' : 'text-green-500'}`} />
                                <p className={`text-sm font-bold ${metrics.todayChange >= 0 ? 'text-amber-500' : 'text-green-500'}`}>
                                    {metrics.todayChange >= 0 ? '+' : ''}{metrics.todayChange}%
                                </p>
                                <p className="text-slate-500 text-sm">vs avg</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* This Month */}
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                                <Calendar className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">This Month</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.month.toLocaleString()} L</p>
                            <p className="text-slate-500 text-sm mt-1">On track for {Math.round((metrics.month / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).toLocaleString()} L</p>
                        </div>
                    </div>
                </div>

                {/* Daily Average */}
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                                <BarChart3 className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">Daily Average</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.average} L</p>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                <p className="text-amber-500 text-sm font-bold">+{metrics.monthChange}%</p>
                                <p className="text-slate-500 text-sm">vs last month</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chart & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Consumption Trends</h3>
                            <p className="text-sm text-slate-500">Last 7 days vs 30-day average</p>
                        </div>
                        <div className="flex gap-2">
                            <span
                                onClick={() => setPeriod('7D')}
                                className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${period === '7D' ? 'text-amber-600 bg-amber-100' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                7D
                            </span>
                            <span
                                onClick={() => setPeriod('30D')}
                                className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${period === '30D' ? 'text-amber-600 bg-amber-100' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                30D
                            </span>
                        </div>
                    </div>

                    {/* SVG Chart */}
                    <div className="relative w-full h-[280px]">
                        {/* Average band */}
                        <div
                            className="absolute left-0 right-0 bg-amber-50/50 border-y border-dashed border-amber-200 pointer-events-none"
                            style={{
                                top: `${chartHeight - (metrics.average / maxValue) * (chartHeight - 40) - 40}px`,
                                height: '40px'
                            }}
                        />
                        <div className="absolute right-2 text-[10px] text-amber-400 font-medium" style={{ top: '40%' }}>
                            30-day avg band
                        </div>

                        <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="gradientGold" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 0.2 }} />
                                    <stop offset="100%" style={{ stopColor: '#F59E0B', stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                            {/* Area Fill */}
                            <path d={areaD} fill="url(#gradientGold)" />
                            {/* Line Stroke */}
                            <path d={pathD} fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            {/* Data Points */}
                            {points.map((p, i) => (
                                <g key={i}>
                                    <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#F59E0B" strokeWidth="2" />
                                    {i === points.length - 1 && (
                                        <>
                                            <circle cx={p.x} cy={p.y} r="6" fill="#F59E0B" />
                                            <circle cx={p.x} cy={p.y} r="12" fill="#F59E0B" opacity="0.2">
                                                <animate attributeName="r" from="6" to="16" dur="1.5s" repeatCount="indefinite" />
                                                <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                                            </circle>
                                        </>
                                    )}
                                </g>
                            ))}
                        </svg>

                        {/* Tooltip for today */}
                        {trendData.length > 0 && (
                            <div className="absolute top-[35px] right-[10px] bg-slate-900 text-white text-xs py-1 px-2 rounded shadow-lg pointer-events-none">
                                Today: {trendData[trendData.length - 1]?.value} L
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                            </div>
                        )}
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between mt-2 px-2 text-xs font-medium text-slate-500">
                        {trendData.map((d, i) => (
                            <span
                                key={i}
                                className={i === trendData.length - 1 ? 'text-amber-600 font-bold' : ''}
                            >
                                {d.date}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Generator Breakdown */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Generator Breakdown</h3>
                            <button className="text-xs font-bold text-amber-600 hover:underline">View Details</button>
                        </div>

                        {breakdown.map((gen, i) => (
                            <div key={gen.id} className={`flex flex-col gap-2 ${i > 0 ? 'pt-2 border-t border-slate-100' : ''}`}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {gen.name}
                                            {gen.capacity_kva && (
                                                <span className="text-xs font-normal text-slate-500 ml-1">({gen.capacity_kva}kVA)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">{gen.totalLitres.toLocaleString()} L</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${gen.percentage}%` }}
                                        transition={{ duration: 0.5 }}
                                        className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-amber-300'}`}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                    <span>{i === 0 ? 'Primary Load' : 'Secondary Load'}</span>
                                    <span>{gen.percentage}%</span>
                                </div>
                            </div>
                        ))}

                        {breakdown.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No generator data available</p>
                        )}
                    </div>

                    {/* Alerts Panel */}
                    <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8 z-0" />
                        <div className="flex items-center gap-2 z-10 relative mb-1">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-base font-bold text-slate-900">Active Alerts</h3>
                        </div>

                        {alerts.length > 0 ? (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex gap-3 items-start p-3 rounded-lg bg-amber-50/50 border border-amber-100/50 z-10"
                                >
                                    <div className="min-w-[4px] h-8 bg-amber-400 rounded-full mt-1" />
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-slate-900">High Consumption</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {alert.message}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">{alert.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4 z-10">No active alerts</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating CTA Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 py-4">
                <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        <span>Next scheduled maintenance: <strong>{nextMaintenanceDate ? nextMaintenanceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled'}</strong></span>
                    </div>
                    <div className="flex w-full md:w-auto gap-3">
                        <button
                            onClick={handleExport}
                            className="flex-1 md:flex-none h-11 px-6 rounded-lg border border-amber-200 text-slate-900 font-bold text-sm hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Data
                        </button>
                        <button
                            onClick={() => window.location.href = `../staff`}
                            className="flex-1 md:flex-none h-11 px-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-200/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Log Tomorrow
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DieselAnalyticsDashboard;
