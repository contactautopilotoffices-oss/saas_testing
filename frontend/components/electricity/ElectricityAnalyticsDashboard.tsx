'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, TrendingUp, Download, Zap, AlertTriangle,
    BarChart3, Plus, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { createClient } from '@/frontend/utils/supabase/client';
import ElectricityStaffDashboard from './ElectricityStaffDashboard';

interface ElectricityMeter {
    id: string;
    name: string;
    meter_number?: string;
    meter_type?: string;
    max_load_kw?: number;
}

interface ElectricityMetrics {
    today: number;
    month: number;
    average: number;
    todayChange: number;
    monthChange: number;
}

interface MeterBreakdown {
    id: string;
    name: string;
    meterType?: string;
    totalUnits: number;
    percentage: number;
}

interface Alert {
    id: string;
    meter_name: string;
    message: string;
    time: string;
    severity: 'warning' | 'critical';
}

/**
 * Admin/Super Admin analytics dashboard for electricity consumption
 * Read-only view - no editing capabilities
 */
interface ElectricityAnalyticsDashboardProps {
    propertyId?: string;
    orgId?: string;
}

const ElectricityAnalyticsDashboard: React.FC<ElectricityAnalyticsDashboardProps> = ({ propertyId: propIdFromProps, orgId }) => {
    const params = useParams();
    const propertyId = propIdFromProps || (params?.propertyId as string);
    const supabase = createClient();

    // State
    const [property, setProperty] = useState<{ name: string } | null>(null);
    const [metrics, setMetrics] = useState<ElectricityMetrics>({
        today: 0,
        month: 0,
        average: 0,
        todayChange: 0,
        monthChange: 0,
    });
    const [breakdown, setBreakdown] = useState<MeterBreakdown[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; value: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<'7D' | '30D'>('7D');
    const [orgData, setOrgData] = useState<any>(null);
    const [showLogModal, setShowLogModal] = useState(false);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!propertyId && !orgId) return;
        setIsLoading(true);

        try {
            if (propertyId) {
                // Fetch property name
                const { data: propData } = await supabase
                    .from('properties')
                    .select('name')
                    .eq('id', propertyId)
                    .single();
                setProperty(propData);

                // Fetch today's readings
                const todayDate = new Date().toISOString().split('T')[0];
                const todayRes = await fetch(
                    `/api/properties/${propertyId}/electricity-readings?startDate=${todayDate}&endDate=${todayDate}`
                );
                const todayData = await todayRes.json();
                const todayTotal = (todayData || []).reduce((sum: number, r: any) =>
                    sum + (r.computed_units || 0), 0);

                // Fetch this month's readings
                const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    .toISOString().split('T')[0];
                const monthRes = await fetch(
                    `/api/properties/${propertyId}/electricity-readings?startDate=${monthStart}`
                );
                const monthData = await monthRes.json();
                const monthTotal = (monthData || []).reduce((sum: number, r: any) =>
                    sum + (r.computed_units || 0), 0);

                // Fetch previous month's readings for comparison
                const prevMonthStart = new Date();
                prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
                prevMonthStart.setDate(1);
                const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
                const prevMonthRes = await fetch(
                    `/api/properties/${propertyId}/electricity-readings?startDate=${prevMonthStart.toISOString().split('T')[0]}&endDate=${prevMonthEnd.toISOString().split('T')[0]}`
                );
                const prevMonthData = await prevMonthRes.json();
                const prevMonthTotal = (prevMonthData || []).reduce((sum: number, r: any) =>
                    sum + (r.computed_units || 0), 0);

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

                // Calculate meter breakdown
                const meterBreakdown: Record<string, { units: number; name: string; meterType?: string }> = {};
                (monthData || []).forEach((r: any) => {
                    const meterId = r.meter_id;
                    if (!meterBreakdown[meterId]) {
                        meterBreakdown[meterId] = {
                            units: 0,
                            name: r.meter?.name || 'Unknown',
                            meterType: r.meter?.meter_type,
                        };
                    }
                    meterBreakdown[meterId].units += r.computed_units || 0;
                });

                const totalMonthUnits = Object.values(meterBreakdown).reduce((sum, m) => sum + m.units, 0);
                const breakdownArr: MeterBreakdown[] = Object.entries(meterBreakdown)
                    .map(([id, data]) => ({
                        id,
                        name: data.name,
                        meterType: data.meterType,
                        totalUnits: Math.round(data.units),
                        percentage: totalMonthUnits > 0 ? Math.round((data.units / totalMonthUnits) * 100) : 0,
                    }))
                    .sort((a, b) => b.totalUnits - a.totalUnits);
                setBreakdown(breakdownArr);

                // Build trend data based on selected period (7D or 30D)
                const daysToFetch = period === '30D' ? 30 : 7;
                const trendStartDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000)
                    .toISOString().split('T')[0];
                const trendRes = await fetch(
                    `/api/properties/${propertyId}/electricity-readings?startDate=${trendStartDate}`
                );
                const trendRawData = await trendRes.json();
                const dailyTotals: Record<string, number> = {};
                (trendRawData || []).forEach((r: any) => {
                    const date = r.reading_date;
                    if (!dailyTotals[date]) dailyTotals[date] = 0;
                    dailyTotals[date] += r.computed_units || 0;
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
                        meter_name: r.meter?.name || 'Unknown',
                        message: `${r.meter?.name} consumption is high (${r.computed_units} kWh)`,
                        time: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        severity: r.alert_status as 'warning' | 'critical',
                    }));
                setAlerts(alertsList);
            } else if (orgId) {
                // Fetch org-level electricity summary (if API exists)
                // For now, show placeholder or aggregate from properties
                const orgRes = await fetch(`/api/organizations/${orgId}/electricity-summary?period=${period === '30D' ? 'month' : 'week'}`);
                if (orgRes.ok) {
                    const data = await orgRes.json();
                    setOrgData(data);

                    setMetrics({
                        today: data.org_summary?.today_total || 0,
                        month: data.org_summary?.total_units || 0,
                        average: Math.round((data.org_summary?.total_units || 0) / (period === '30D' ? 30 : 7)),
                        todayChange: 0,
                        monthChange: 0,
                    });

                    // Map properties to breakdown
                    const breakdownArr: MeterBreakdown[] = (data.properties || []).map((p: any) => ({
                        id: p.property_id,
                        name: p.property_name,
                        totalUnits: p.period_total_units,
                        percentage: (data.org_summary?.total_units || 0) > 0
                            ? Math.round((p.period_total_units / data.org_summary.total_units) * 100)
                            : 0,
                    }));
                    setBreakdown(breakdownArr);
                }

                setTrendData([]);
            }
        } catch (err) {
            console.error('Failed to fetch electricity analytics:', err);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, orgId, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData, period]);

    // Export to Excel
    const handleExport = () => {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const exportUrl = propertyId
            ? `/api/properties/${propertyId}/electricity-export?startDate=${monthAgo}&endDate=${today}`
            : `/api/organizations/${orgId}/electricity-export?startDate=${monthAgo}&endDate=${today}`;
        window.open(exportUrl, '_blank');
    };

    // Handle modal close and refresh data
    const handleLogModalClose = () => {
        setShowLogModal(false);
        fetchData(); // Refresh analytics after logging
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
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold">Loading analytics...</p>
                </div>
            </div>
        );
    }

    // No property selected state
    if (!propertyId && !orgId) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Zap className="w-16 h-16 text-amber-500/20 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Property</h3>
                <p className="text-slate-500 text-center max-w-md">
                    Please select a specific property from the dropdown above to view electricity analytics.
                </p>
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
                            Electricity Analytics
                        </span>
                        {property?.name && (
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">/ {property.name}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-amber-500 font-medium">
                        <Calendar className="w-4 h-4" />
                        {currentMonth}
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors bg-white"
                >
                    <Download className="w-4 h-4" />
                    <span>Report</span>
                </button>
            </div>

            {/* Metrics Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-500/10 rounded-md text-amber-500">
                                <Calendar className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">Today&apos;s Consumption</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.today} kWh</p>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className={`w-4 h-4 ${metrics.todayChange >= 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                                <p className={`text-sm font-bold ${metrics.todayChange >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {metrics.todayChange >= 0 ? '+' : ''}{metrics.todayChange}%
                                </p>
                                <p className="text-slate-500 text-sm">vs avg</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* This Month */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-500/10 rounded-md text-amber-500">
                                <Calendar className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">This Month</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.month.toLocaleString()} kWh</p>
                            <p className="text-slate-500 text-sm mt-1">On track for {Math.round((metrics.month / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).toLocaleString()} kWh</p>
                        </div>
                    </div>
                </div>

                {/* Daily Average */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-500/10 rounded-md text-amber-500">
                                <BarChart3 className="w-4 h-4" />
                            </span>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-70">Daily Average</p>
                        </div>
                        <div>
                            <p className="text-slate-900 text-4xl font-bold leading-tight tracking-tight">{metrics.average} kWh</p>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                <p className="text-amber-500 text-sm font-bold">{metrics.monthChange >= 0 ? '+' : ''}{metrics.monthChange}%</p>
                                <p className="text-slate-500 text-sm">vs last month</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chart & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {propertyId ? 'Consumption Trends' : 'Aggregated Consumption'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {propertyId ? 'Last 7 days vs 30-day average' : 'Total consumption across all properties'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span
                                onClick={() => setPeriod('7D')}
                                className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${period === '7D' ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                7D
                            </span>
                            <span
                                onClick={() => setPeriod('30D')}
                                className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${period === '30D' ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:bg-slate-50'
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
                            className="absolute left-0 right-0 bg-amber-50 border-y border-dashed border-amber-200 pointer-events-none"
                            style={{
                                top: `${chartHeight - (metrics.average / maxValue) * (chartHeight - 40) - 40}px`,
                                height: '40px'
                            }}
                        />
                        <div className="absolute right-2 text-[10px] text-slate-400 font-medium" style={{ top: '40%' }}>
                            30-day avg band
                        </div>

                        <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="gradientAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
                                    <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                            {/* Area Fill */}
                            <path d={areaD} fill="url(#gradientAmber)" />
                            {/* Line Stroke */}
                            <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                            {/* Data Points */}
                            {points.map((p, i) => (
                                <g key={i}>
                                    <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                                    {i === points.length - 1 && (
                                        <>
                                            <circle cx={p.x} cy={p.y} r="6" fill="#f59e0b" />
                                            <circle cx={p.x} cy={p.y} r="12" fill="#f59e0b" opacity="0.2">
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
                                Today: {trendData[trendData.length - 1]?.value} kWh
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                            </div>
                        )}
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between mt-2 px-2 text-xs font-medium text-slate-500">
                        {trendData.map((d, i) => (
                            <span
                                key={i}
                                className={i === trendData.length - 1 ? 'text-amber-500 font-bold' : ''}
                            >
                                {d.date}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Meter Breakdown */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">
                                {propertyId ? 'Meter Breakdown' : 'Property Breakdown'}
                            </h3>
                            <button className="text-xs font-bold text-amber-500 hover:underline">View Details</button>
                        </div>

                        {breakdown.map((meter, i) => (
                            <div key={meter.id} className={`flex flex-col gap-2 ${i > 0 ? 'pt-2 border-t border-slate-100' : ''}`}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {meter.name}
                                            {meter.meterType && (
                                                <span className="text-xs font-normal text-slate-500 ml-1">({meter.meterType})</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">{meter.totalUnits.toLocaleString()} kWh</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${meter.percentage}%` }}
                                        transition={{ duration: 0.5 }}
                                        className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-amber-500/50'}`}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                    <span>{i === 0 ? 'Primary Load' : 'Secondary Load'}</span>
                                    <span>{meter.percentage}%</span>
                                </div>
                            </div>
                        ))}

                        {breakdown.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No meter data available</p>
                        )}
                    </div>

                    {/* Alerts Panel */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-8 -mt-8 z-0" />
                        <div className="flex items-center gap-2 z-10 relative mb-1">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            <h3 className="text-base font-bold text-slate-900">Active Alerts</h3>
                        </div>

                        {alerts.length > 0 ? (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex gap-3 items-start p-3 rounded-lg bg-rose-50/50 border border-rose-100 z-10"
                                >
                                    <div className="min-w-[4px] h-8 bg-rose-400 rounded-full mt-1" />
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
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 px-6 py-4">
                <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Electricity Analytics</span>
                    </div>
                    <div className="flex w-full md:w-auto gap-3">
                        {propertyId && (
                            <button
                                onClick={() => setShowLogModal(true)}
                                className="flex-1 md:flex-none h-11 px-6 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Log Entry
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="flex-1 md:flex-none h-11 px-6 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Entry Modal */}
            <AnimatePresence>
                {showLogModal && propertyId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
                        onClick={handleLogModalClose}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="h-full w-full max-w-3xl bg-white shadow-2xl overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Log Daily Reading</h2>
                                        <p className="text-sm text-slate-500">{property?.name || 'Property'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogModalClose}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Embedded Logger */}
                            <div className="p-6">
                                <ElectricityStaffDashboard propertyId={propertyId} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ElectricityAnalyticsDashboard;
