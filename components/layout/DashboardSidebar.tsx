'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { LayoutDashboard, Users, Ticket, Package, Settings, LogOut } from 'lucide-react';
import CapabilityWrapper from '../auth/CapabilityWrapper';

export default function DashboardSidebar() {
    const pathname = usePathname();
    const params = useParams();
    const orgId = params.orgId as string;

    const NAV_ITEMS = [
        { label: 'Overview', href: `/${orgId}/dashboard`, icon: LayoutDashboard, domain: 'dashboards' as const },
        { label: 'Tickets', href: `/${orgId}/tickets`, icon: Ticket, domain: 'tickets' as const },
        { label: 'Inventory', href: `/${orgId}/procurement`, icon: Package, domain: 'procurement' as const },
        { label: 'Staff', href: `/${orgId}/users`, icon: Users, domain: 'users' as const },
    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col">
            <div className="p-8 mb-4">
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
                    Auto<br /><span className="text-emerald-500">Pilot</span>
                </h2>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Management</p>
                {NAV_ITEMS.map((item) => (
                    <CapabilityWrapper key={item.href} domain={item.domain} action="view">
                        <Link
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${pathname === item.href
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${pathname === item.href ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="font-medium tracking-tight text-sm">{item.label}</span>
                        </Link>
                    </CapabilityWrapper>
                ))}
            </nav>

            <div className="p-6 mt-auto space-y-2">
                <div className="px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">AL</div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">Amol Lokhande</span>
                            <span className="text-[10px] text-slate-500 font-medium">Property Admin</span>
                        </div>
                    </div>
                </div>

                <Link href="/settings" className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
                </Link>
                <button className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
                </button>
            </div>
        </aside>
    );
}
