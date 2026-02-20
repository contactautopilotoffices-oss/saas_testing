'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';
import Skeleton from '@/frontend/components/ui/Skeleton';

interface StockReportViewProps {
    propertyId?: string;
    orgId?: string;
}

interface StockReport {
    id: string;
    report_date: string;
    total_items: number;
    low_stock_count: number;
    total_added: number;
    total_removed: number;
    property_name?: string;
    property_code?: string;
}

const StockReportView: React.FC<StockReportViewProps> = ({ propertyId, orgId }) => {
    const [reports, setReports] = useState<StockReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const supabase = React.useMemo(() => createClient(), []);

    const fetchReports = useCallback(async () => {
        try {
            setIsLoading(true);
            let url = '';

            if (propertyId) {
                url = `/api/properties/${propertyId}/stock/reports`;
            } else if (orgId) {
                url = `/api/organizations/${orgId}/stock/reports`;
            } else {
                return;
            }

            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${url}?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to load reports');

            setReports(data.reports || []);
        } catch (err) {
            setToast({ message: 'Error loading reports', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, orgId, startDate, endDate]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleGenerateReport = async () => {
        const reportDate = new Date().toISOString().split('T')[0];

        try {
            const response = await fetch(`/api/properties/${propertyId}/stock/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportDate }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate report');

            setToast({ message: 'Report generated successfully', type: 'success' });
            fetchReports();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error generating report', type: 'error' });
        }
    };

    const handleExportCSV = async () => {
        try {
            if (!orgId) {
                setToast({ message: 'CSV export only available at organization level', type: 'error' });
                return;
            }

            const params = new URLSearchParams();
            params.append('format', 'csv');
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/organizations/${orgId}/stock/reports?${params.toString()}`);

            if (!response.ok) throw new Error('Failed to export');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-reports-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setToast({ message: 'Report exported successfully', type: 'success' });
        } catch (err) {
            setToast({ message: 'Error exporting report', type: 'error' });
        }
    };

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-xl font-bold">Stock Reports</h3>
                <div className="flex gap-2">
                    {propertyId && (
                        <button
                            onClick={handleGenerateReport}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Generate Today's Report
                        </button>
                    )}
                    {orgId && (
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Date Filters */}
            <div className="flex gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-2">From Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-2">To Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchReports}
                        className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map(report => (
                    <div key={report.id} className="border border-border-primary rounded-xl p-4 hover:border-accent-primary/50 transition-colors">
                        <div className="text-sm text-text-secondary mb-3">
                            {report.property_name && `${report.property_name} • `}
                            {new Date(report.report_date).toLocaleDateString()}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Total Items:</span>
                                <span className="font-semibold">{report.total_items}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Low Stock:</span>
                                <span className="font-semibold text-orange-500">{report.low_stock_count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Added:</span>
                                <span className="font-semibold text-green-500">+{report.total_added}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Removed:</span>
                                <span className="font-semibold text-red-500">-{report.total_removed}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {reports.length === 0 && (
                <div className="text-center py-12 text-text-secondary">
                    No reports available. {propertyId && 'Generate a report to get started!'}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    visible={true}
                    onClose={() => setToast(null)}
                    duration={3000}
                />
            )}
        </div>
    );
};

export default StockReportView;
