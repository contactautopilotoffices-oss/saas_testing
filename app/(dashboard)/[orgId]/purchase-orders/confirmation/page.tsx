'use client';

import React, { useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/frontend/components/ui/button';

export default function ConfirmationPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const searchParams = useSearchParams();
    const poNumber = searchParams.get('poNumber') || '';
    const vendor = searchParams.get('vendor') || '';
    const amount = searchParams.get('amount') || '';
    const link = searchParams.get('link') || '';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => { navigator.clipboard.writeText(poNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const formattedAmount = amount ? Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '';

    return (
        <div className="max-w-lg mx-auto py-8 space-y-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-text-primary">Purchase Order Created</h2>
                <p className="text-text-secondary">Your PO has been successfully created in Zoho Books</p>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border p-6 space-y-4">
                <div>
                    <p className="text-sm text-text-tertiary uppercase tracking-wider font-medium">PO Number</p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="text-3xl font-bold text-text-primary font-display">{poNumber}</span>
                        <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-all" title="Copy PO Number">
                            {copied ? <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                        </button>
                    </div>
                </div>
                <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-left">
                    <div><p className="text-xs text-text-tertiary uppercase tracking-wider">Vendor</p><p className="text-sm font-medium text-text-primary mt-1">{vendor}</p></div>
                    <div><p className="text-xs text-text-tertiary uppercase tracking-wider">Total Amount</p><p className="text-sm font-medium text-text-primary mt-1">INR {formattedAmount}</p></div>
                </div>
            </div>
            <div className="space-y-3">
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="block"><Button variant="primary" className="w-full">View in Zoho Books<svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></Button></a>}
                <div className="flex gap-3">
                    <Link href={`/${orgId}/purchase-orders/new`} className="flex-1"><Button variant="outline" className="w-full">Create Another PO</Button></Link>
                    <Link href={`/${orgId}/purchase-orders/history`} className="flex-1"><Button variant="solid" className="w-full">View History</Button></Link>
                </div>
            </div>
        </div>
    );
}
