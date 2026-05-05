'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/frontend/context/AuthContext';
import { Button } from '@/frontend/components/ui/button';
import Loader from '@/frontend/components/ui/Loader';
import { cn } from '@/backend/lib/utils';

export default function HistoryPage() {
    const { user, isLoading: authLoading } = useAuth();
    const params = useParams();
    const orgId = params.orgId as string;
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const limit = 20;

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/zoho-po/audit-log?orgId=${orgId}&page=${page}&limit=${limit}`);
            const data = await res.json();
            setEntries(data.entries || []);
            setTotal(data.total || 0);
        } catch { setEntries([]); }
        finally { setLoading(false); }
    }, [user, page, orgId]);

    useEffect(() => { if (!authLoading) fetchHistory(); }, [fetchHistory, authLoading]);

    const statusBadge = (status: string) => {
        switch (status) {
            case 'created': return 'bg-success/10 text-success border-success/30';
            case 'failed': return 'bg-error/10 text-error border-error/30';
            case 'processing': return 'bg-primary/10 text-primary border-primary/30';
            default: return 'bg-warning/10 text-warning border-warning/30';
        }
    };

    const totalPages = Math.ceil(total / limit);

    if (authLoading || loading) return <div className="flex items-center justify-center py-20"><Loader /></div>;
    if (!user) return <div className="text-center py-20"><p className="text-text-secondary">Please log in to view PO history.</p></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-semibold text-text-primary">PO History</h2><p className="text-sm text-text-secondary">{total} purchase orders created</p></div>
                <Button variant="outline" onClick={fetchHistory} className="text-sm"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.058M20.9 14.25A10.053 10.053 0 0021.1 10c0-5.523-4.477-10-10-10S1.1 4.477 1.1 10c0 2.039.607 3.935 1.65 5.521L1 21l5.65-1.75A9.96 9.96 0 0011 20.9c1.45 0 2.833-.31 4.09-.872" /></svg>Refresh</Button>
            </div>

            {entries.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border">
                    <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                    </div>
                    <p className="text-text-secondary mb-2">No purchase orders yet</p><p className="text-sm text-text-tertiary">Create your first PO from the New PO tab</p>
                </div>
            ) : (
                <>
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border"><th className="text-left py-3 px-4 text-text-tertiary font-medium">Date</th><th className="text-left py-3 px-4 text-text-tertiary font-medium">Invoice</th><th className="text-left py-3 px-4 text-text-tertiary font-medium">Vendor</th><th className="text-left py-3 px-4 text-text-tertiary font-medium">PO Number</th><th className="text-right py-3 px-4 text-text-tertiary font-medium">Amount</th><th className="text-center py-3 px-4 text-text-tertiary font-medium">Status</th><th className="text-center py-3 px-4 text-text-tertiary font-medium">AI Model</th></tr></thead>
                            <tbody>
                                {entries.map(entry => (
                                    <React.Fragment key={entry.id}>
                                        <tr onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="border-b border-border/50 hover:bg-surface-elevated/50 cursor-pointer transition-all">
                                            <td className="py-3 px-4 text-text-secondary">{new Date(entry.created_at).toLocaleDateString('en-IN')}</td>
                                            <td className="py-3 px-4 text-text-primary font-medium truncate max-w-[150px]">{entry.invoice_filename}</td>
                                            <td className="py-3 px-4 text-text-secondary">{entry.vendor_name}</td>
                                            <td className="py-3 px-4 text-text-primary font-medium">{entry.po_number || '-'}</td>
                                            <td className="py-3 px-4 text-right text-text-primary font-medium">{entry.po_amount ? `INR ${entry.po_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                                            <td className="py-3 px-4 text-center"><span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border capitalize', statusBadge(entry.po_status))}>{entry.po_status}</span></td>
                                            <td className="py-3 px-4 text-center text-text-tertiary text-xs">{entry.ai_model_used}</td>
                                        </tr>
                                        {expandedId === entry.id && (
                                            <tr><td colSpan={7} className="px-4 py-3 bg-surface-elevated/30">
                                                <div className="text-sm space-y-1">
                                                    {entry.processing_time_ms && <p className="text-text-secondary">Processing time: {(entry.processing_time_ms / 1000).toFixed(1)}s</p>}
                                                    {entry.error_message && <p className="text-error">Error: {entry.error_message}</p>}
                                                    {!entry.error_message && <p className="text-success">Created successfully</p>}
                                                </div>
                                            </td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-sm px-3">Previous</Button>
                            <span className="text-sm text-text-secondary px-4">Page {page} of {totalPages}</span>
                            <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm px-3">Next</Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
