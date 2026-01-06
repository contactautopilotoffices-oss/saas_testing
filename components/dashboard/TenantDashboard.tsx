'use client';

import React from 'react';
import { Home, Ticket, Bell, Settings, ShieldQuestion } from 'lucide-react';

const TenantDashboard = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-10 rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                    <div className="w-16 h-16 bg-[#f28c33]/10 rounded-full flex items-center justify-center">
                        <Home className="w-8 h-8 text-[#f28c33]" />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white mb-2">Welcome Home</h1>
                <p className="text-zinc-500 text-lg font-medium">SS Plaza • Unit 402</p>

                <div className="mt-10 flex gap-4">
                    <button className="px-8 py-4 bg-[#f28c33] text-white font-bold rounded-2xl shadow-xl shadow-orange-900/40 hover:scale-105 transition-transform">
                        Raise Maintenance Ticket
                    </button>
                    <button className="px-8 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-2xl hover:bg-zinc-700 transition-colors">
                        View Documents
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[32px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Your Requests</h3>
                        <span className="text-[#f28c33] font-bold text-sm">View All</span>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex justify-between items-center">
                            <div>
                                <p className="text-white font-bold">AC Not Cooling</p>
                                <p className="text-zinc-500 text-sm">Ticket #4421</p>
                            </div>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-black uppercase">In Progress</span>
                        </div>
                        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex justify-between items-center">
                            <div>
                                <p className="text-white font-bold">Tap Leakage</p>
                                <p className="text-zinc-500 text-sm">Ticket #4390</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-black uppercase">Resolved</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[32px]">
                    <h3 className="text-xl font-bold text-white mb-6">Community Updates</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-zinc-300 font-medium leading-tight">Elevator maintenance scheduled for Sunday 10AM-2PM.</p>
                                <p className="text-zinc-600 text-xs mt-1">2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                <ShieldQuestion className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-zinc-300 font-medium leading-tight">New security protocol for visitor entry starts Monday.</p>
                                <p className="text-zinc-600 text-xs mt-1">Yesterday</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantDashboard;
