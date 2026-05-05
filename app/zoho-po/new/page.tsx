'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/frontend/context/AuthContext';
import { InvoiceUpload } from '@/frontend/components/zoho-po/InvoiceUpload';
import { Button } from '@/frontend/components/ui/button';
import Loader from '@/frontend/components/ui/Loader';
import { cn } from '@/backend/lib/utils';
import { usePOFlow } from '@/frontend/components/zoho-po/POFlowContext';
import type { ParsedInvoice } from '@/backend/lib/zoho-po/types';

export default function NewPOPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { setParsedInvoice, setCurrentStep, setUserContext, setOrgId } = usePOFlow();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parsedResult, setParsedResult] = useState<ParsedInvoice | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        setParseError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const progressInterval = setInterval(() => {
                setUploadProgress(p => Math.min(p + 15, 85));
            }, 300);

            const response = await fetch('/api/zoho-po/parse-invoice', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (!response.ok || !data.success) {
                setParseError(data.error || 'Failed to parse invoice');
                return;
            }

            setParsedResult(data.parsed_invoice);
            setParsedInvoice(data.parsed_invoice);

            // Initialize line items in user context
            const items = data.parsed_invoice.line_items.map((item: any) => ({
                description: item.description || '',
                quantity: item.quantity || 0,
                unit: item.unit || 'pcs',
                unit_price: item.unit_price || 0,
                tax_rate: item.tax_rate || 18,
                tax_amount: item.tax_amount || 0,
                total_price: item.total_price || 0,
                hsn_code: item.hsn_code || '',
            }));
            setUserContext({ confirmed_line_items: items });

        } catch (err: any) {
            setParseError(err.message || 'Network error during upload');
        } finally {
            setIsUploading(false);
        }
    }, [setParsedInvoice, setUserContext]);

    const handleContinue = useCallback(() => {
        if (parsedResult) {
            setCurrentStep(1);
            router.push('/zoho-po/context?step=1');
        }
    }, [parsedResult, setCurrentStep, router]);

    const getConfidenceColor = (c: number) => {
        if (c >= 0.8) return 'bg-success/10 text-success border-success/30';
        if (c >= 0.6) return 'bg-warning/10 text-warning border-warning/30';
        return 'bg-error/10 text-error border-error/30';
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20">
                <p className="text-text-secondary">Please log in to create purchase orders.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-xl font-display font-semibold text-text-primary mb-2">
                    Upload Proforma Invoice
                </h2>
                <p className="text-sm text-text-secondary">
                    Upload a PDF or image of the proforma invoice to begin
                </p>
            </div>

            <InvoiceUpload
                onUpload={handleUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
            />

            {parseError && (
                <div className="p-4 bg-error/10 border border-error/30 rounded-[var(--radius-md)] text-error text-sm max-w-2xl mx-auto">
                    {parseError}
                </div>
            )}

            {parsedResult && (
                <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {parsedResult.confidence < 0.8 && (
                        <div className="p-4 bg-warning/10 border border-warning/30 rounded-[var(--radius-md)] text-warning text-sm">
                            <strong>Low extraction confidence.</strong> Please verify all fields in the next step.
                        </div>
                    )}

                    <div className="bg-surface-elevated rounded-[var(--radius-md)] border border-border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-text-primary">Extracted Invoice Details</h3>
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', getConfidenceColor(parsedResult.confidence))}>
                                {Math.round(parsedResult.confidence * 100)}% confidence
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-text-tertiary mb-0.5">Vendor</p>
                                <p className="font-medium text-text-primary">{parsedResult.vendor_name}</p>
                            </div>
                            <div>
                                <p className="text-text-tertiary mb-0.5">Invoice Number</p>
                                <p className="font-medium text-text-primary">{parsedResult.invoice_number}</p>
                            </div>
                            <div>
                                <p className="text-text-tertiary mb-0.5">Date</p>
                                <p className="font-medium text-text-primary">{parsedResult.invoice_date}</p>
                            </div>
                            <div>
                                <p className="text-text-tertiary mb-0.5">Total Amount</p>
                                <p className="font-medium text-text-primary">
                                    {parsedResult.currency} {parsedResult.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-text-tertiary mb-0.5">Line Items</p>
                                <p className="font-medium text-text-primary">{parsedResult.line_items?.length || 0} items</p>
                            </div>
                            {parsedResult.vendor_gstin && (
                                <div>
                                    <p className="text-text-tertiary mb-0.5">Vendor GSTIN</p>
                                    <p className="font-medium text-text-primary">{parsedResult.vendor_gstin}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="primary" onClick={handleContinue} className="px-8">
                            Continue
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
