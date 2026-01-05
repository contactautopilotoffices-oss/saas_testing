'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Plus } from 'lucide-react';

const MOCK_ORGS = [
    { id: 'autopilot-offices', name: 'Autopilot Offices', slug: 'autopilot-offices', type: 'Owner' },
    { id: 'realty-hub', name: 'Realty Hub', slug: 'realty-hub', type: 'Partner' }
];

export default function OrganizationsPage() {
    return (
        <div className="min-h-screen bg-[#fafbfc] p-12">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4">
                    <h1 className="text-5xl font-display font-black text-slate-900 tracking-tighter">SELECT<br />ORGANIZATION</h1>
                    <p className="text-slate-400 font-medium">Choose an organization to enter your workspace.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_ORGS.map((org) => (
                        <Link
                            key={org.id}
                            href={`/${org.slug}/dashboard`}
                            className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all duration-500 flex flex-col justify-between h-64"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 group-hover:text-emerald-400">{org.type}</span>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-display font-bold text-slate-800 group-hover:text-slate-900">{org.name}</h3>
                                <div className="flex items-center text-emerald-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                    Enter Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Link>
                    ))}

                    <button className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all duration-300 group h-64">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center mb-4 group-hover:border-emerald-300">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Create New Organization</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
