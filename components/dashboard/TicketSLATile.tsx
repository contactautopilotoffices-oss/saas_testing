'use client';

import React from 'react';

interface TicketSLATileProps {
    openTickets: number;
    slaPercentage: number;
    highPriorityCount: number;
}

export default function TicketSLATile({
    openTickets,
    slaPercentage,
    highPriorityCount
}: TicketSLATileProps) {
    return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between h-full group hover:shadow-lg transition-all duration-500">
            <div>
                <h3 className="text-[#1a2b3c] font-display font-bold text-2xl mb-8">Tickets & SLA</h3>

                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-4xl font-display font-bold text-slate-800">{openTickets}</span>
                            <span className="text-slate-400 text-sm font-medium uppercase tracking-tighter">Open Tickets</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-12 h-4 bg-[#10b981] rounded-full"></div>
                            <div className="w-4 h-4 rounded-full bg-[#fcd34d]"></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-4xl font-display font-bold text-slate-800">{slaPercentage}%</span>
                            <span className="text-slate-400 text-sm font-medium uppercase tracking-tighter">SLA Met</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-12 h-4 bg-[#10b981] rounded-full"></div>
                            <div className="w-4 h-4 rounded-full bg-slate-100"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">!</span>
                </div>
                <span className="text-slate-600 font-semibold tracking-tight">
                    {highPriorityCount} High Priority Tickets
                </span>
            </div>
        </div>
    );
}
