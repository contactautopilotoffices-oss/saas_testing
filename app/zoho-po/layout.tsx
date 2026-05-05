'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/backend/lib/utils';
import { POFlowProvider } from '@/frontend/components/zoho-po/POFlowContext';

export default function ZohoPOLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isNew = pathname?.includes('/new') || pathname === '/zoho-po' || pathname === '/zoho-po/';
    const isHistory = pathname?.includes('/history');

    return (
        <POFlowProvider>
            <div className="min-h-screen bg-background">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
                            Zoho Purchase Orders
                        </h1>
                        <p className="text-sm text-text-secondary">
                            Create purchase orders in Zoho Books from proforma invoices
                        </p>
                    </div>

                    <div className="flex gap-1 mb-8 bg-surface rounded-[var(--radius-md)] p-1 w-fit border border-border">
                        <Link
                            href="/zoho-po/new"
                            className={cn(
                                'px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-smooth',
                                isNew
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                            )}
                        >
                            New PO
                        </Link>
                        <Link
                            href="/zoho-po/history"
                            className={cn(
                                'px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-smooth',
                                isHistory
                                    ? 'bg-primary text-text-inverse'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                            )}
                        >
                            History
                        </Link>
                    </div>

                    <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-6 sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </POFlowProvider>
    );
}
