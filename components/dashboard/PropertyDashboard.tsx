'use client';

import React from 'react';
import { LayoutGrid, Users, Ticket, Activity, TrendingUp, Building2 } from 'lucide-react';
import TicketSLATile from './TicketSLATile';
import EmployeeHeatmapTile from './EmployeeHeatmapTile';
import { motion } from 'framer-motion';

interface PropertyDashboardProps {
    propertyId: string;
}

const PropertyDashboard: React.FC<PropertyDashboardProps> = ({ propertyId }) => {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Property Overview</h1>
                    <p className="text-zinc-500 font-medium">Managing SS Plaza • Property ID: {propertyId}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 font-semibold hover:text-white transition-colors">
                        Generate Signup Link
                    </button>
                    <button className="px-6 py-2 bg-[#f28c33] text-white font-bold rounded-xl shadow-lg shadow-orange-900/20 hover:scale-105 transition-transform">
                        New Ticket
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Tickets', value: '24', icon: Ticket, color: 'text-orange-500' },
                    { label: 'SLA Status', value: '98%', icon: Activity, color: 'text-emerald-500' },
                    { label: 'Staff Online', value: '12', icon: Users, color: 'text-blue-500' },
                    { label: 'Occupancy', value: '82%', icon: Building2, color: 'text-purple-500' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[24px] group hover:border-zinc-700 transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-zinc-800/50 ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 font-bold text-sm uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-4xl font-black text-white mt-1">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden min-h-[400px]">
                        <TicketSLATile />
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden min-h-[400px]">
                        <EmployeeHeatmapTile />
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Recent Activity</h3>
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className="flex gap-4 items-start pb-6 border-b border-zinc-800 last:border-0">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">New ticket raised</p>
                                        <p className="text-zinc-500 text-sm">Elevator failure in Block B</p>
                                        <p className="text-zinc-600 text-xs mt-1">2 mins ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyDashboard;
