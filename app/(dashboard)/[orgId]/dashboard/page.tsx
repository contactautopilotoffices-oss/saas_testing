'use client';

import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardSummary } from '@/services/dashboardService';
import { authService } from '@/services/authService';
import TicketSLATile from '@/components/dashboard/TicketSLATile';
import EmployeeHeatmapTile from '@/components/dashboard/EmployeeHeatmapTile';
import StatTile from '@/components/dashboard/StatTile';
import CapabilityWrapper from '@/components/auth/CapabilityWrapper';
import UserManagementTable from '@/components/users/UserManagementTable';

export default function DashboardOverview() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        dashboardService.getSummary(currentUser.property_id).then(setSummary);
    }, [currentUser.property_id]);

    if (!summary) return <div className="p-8 flex items-center justify-center min-h-[60vh] text-slate-400 font-medium">Initializing Dashboard...</div>;

    return (
        <div className="space-y-12 p-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter">OVERVIEW</h1>
                    <p className="text-slate-400 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Property: <span className="text-slate-600 font-bold">{currentUser.property_id}</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">
                        Monthly
                    </button>
                    <button className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                        <span className="text-lg">↗</span>
                    </button>
                </div>
            </header>

            {/* Main Stats Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatTile
                    label="Total Revenue"
                    value="$ 873,421.39"
                    trend={{ value: '49%', isUp: true }}
                    subtitle="This month"
                    color="#10b981"
                />
                <StatTile
                    label="Active Visitors"
                    value={summary.active_visitors.toString()}
                    subtitle="On-site currently"
                    color="#3b82f6"
                />
                <StatTile
                    label="Space Occupancy"
                    value={`${summary.occupancy_percentage}%`}
                    subtitle="Target: 85%"
                    color="#f59e0b"
                />
                <StatTile
                    label="Completed Deals"
                    value="1,269"
                    trend={{ value: '36%', isUp: false }}
                    subtitle="Compared to last month"
                    color="#ef4444"
                />
            </section>

            {/* Interactive Tiles Row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <CapabilityWrapper domain="tickets" action="view">
                        <TicketSLATile
                            openTickets={summary.open_tickets}
                            slaPercentage={summary.sla_percentage}
                            highPriorityCount={summary.high_priority_count}
                        />
                    </CapabilityWrapper>
                </div>

                <div className="lg:col-span-2">
                    <CapabilityWrapper domain="dashboards" action="view">
                        <EmployeeHeatmapTile
                            occupancyPercentage={summary.occupancy_percentage}
                        />
                    </CapabilityWrapper>
                </div>
            </section>

            {/* Bottom Data Table Region */}
            <section className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Recent Activity</h2>
                    <button className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
                        View All Staff
                    </button>
                </div>
                <UserManagementTable />
            </section>
        </div>
    );
}
