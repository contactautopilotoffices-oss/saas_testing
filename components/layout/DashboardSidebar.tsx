'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { LayoutDashboard, Users, Ticket, Package, Settings, LogOut } from 'lucide-react';
import CapabilityWrapper from '../auth/CapabilityWrapper';
import { useAuth } from '@/context/AuthContext';
import SignOutModal from '../ui/SignOutModal';
import ThemeToggle from '../ui/ThemeToggle';
import { motion } from 'framer-motion';

export default function DashboardSidebar() {
    const pathname = usePathname();
    const params = useParams();
    const orgId = params.orgId as string;
    const { signOut, user } = useAuth();
    const [showSignOutModal, setShowSignOutModal] = React.useState(false);

    const NAV_ITEMS = [
        { label: 'Overview', href: `/${orgId}/dashboard`, icon: LayoutDashboard, domain: 'dashboards' as const },
        { label: 'Tickets', href: `/${orgId}/tickets`, icon: Ticket, domain: 'tickets' as const },
        { label: 'Inventory', href: `/${orgId}/procurement`, icon: Package, domain: 'procurement' as const },
        { label: 'Staff', href: `/${orgId}/users`, icon: Users, domain: 'users' as const },
    ];

    const getUserInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    return (
        <aside className="w-72 bg-[var(--sidebar-bg)] border-r border-border h-screen sticky top-0 flex flex-col transition-smooth">
            <div className="sidebar-header">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-[var(--radius-md)] flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 32 40" fill="currentColor" className="h-5 text-white">
                            <path d="M0 40 L16 0 L32 40 L24 40 L16 16 L8 40 Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-display font-semibold text-lg tracking-tight text-text-primary leading-none">
                            Autopilot
                        </span>
                        <span className="font-body font-medium text-[10px] text-text-tertiary mt-1">
                            Tenant Portal
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                <p className="px-3 text-[10px] font-medium text-text-tertiary tracking-wider mb-3 font-body">
                    Management
                </p>
                {NAV_ITEMS.map((item) => (
                    <CapabilityWrapper key={item.href} domain={item.domain} action="view">
                        <Link
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-smooth group
                                ${pathname === item.href
                                    ? 'bg-primary text-text-inverse shadow-sm'
                                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                }
                            `}
                        >
                            <item.icon className={`w-5 h-5 transition-smooth group-hover:scale-105`} />
                            <span className="font-body font-medium text-sm">{item.label}</span>
                        </Link>
                    </CapabilityWrapper>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 mt-auto space-y-3">
                {/* User Profile */}
                <div className="px-3 py-3 rounded-[var(--radius-lg)] border border-border/5">
                    <div className="flex items-center gap-3">
                        {user?.user_metadata?.avatar_url ? (
                            <img
                                src={user.user_metadata.avatar_url}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
                                {getUserInitials(user?.email || 'User')}
                            </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-semibold text-text-primary font-body truncate">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span className="text-[10px] text-text-tertiary font-body font-medium">
                                {user?.user_metadata?.role || 'User'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/${orgId}/settings`}
                            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-smooth"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="text-xs font-semibold font-body">Settings</span>
                        </Link>
                        <ThemeToggle />
                    </div>

                    <button
                        onClick={() => setShowSignOutModal(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-error hover:bg-error/10 transition-smooth"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-xs font-semibold font-body">Logout</span>
                    </button>
                </div>

                <SignOutModal
                    isOpen={showSignOutModal}
                    onClose={() => setShowSignOutModal(false)}
                    onConfirm={signOut}
                />
            </div>
        </aside>
    );
}
