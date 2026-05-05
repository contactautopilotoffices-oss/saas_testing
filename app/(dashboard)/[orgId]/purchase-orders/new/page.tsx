'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/frontend/context/AuthContext';
import { Button } from '@/frontend/components/ui/button';
import Loader from '@/frontend/components/ui/Loader';
import { cn } from '@/backend/lib/utils';
import { usePOFlow } from '../../layout';

export default function NewPOPage() {
    const router = useRouter();
    const params = useParams();
    const orgId = params.orgId as string;
    const { user, isLoading: authLoading } = useAuth();
    const { setParsedInvoice, setCurrentStep, setUserContext } = usePOFlow();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parsedResult, setParsedResult] = useState<any>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const validateAndSet = (file: File) => {
        const MAX_SIZE = 10 * 1024 * 1024;
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) { alert('Please upload a PDF or image file'); return; }
        if (file.size > MAX_SIZE) { alert('File size must be less than 10MB'); return; }
        setSelectedFile(file);
    };

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setUploadProgress(0);
        setParseError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 300);
            const response = await fetch('/api/zoho-po/parse-invoice', { method: 'POST', body: formData });
            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();
            if (!response.ok || !data.success) {
                setParseError(data.error || 'Failed to parse invoice');
                return;
            }

            setParsedResult(data.parsed_invoice);
            setParsedInvoice(data.parsed_invoice);

            const items = (data.parsed_invoice.line_items || []).map((item: any) => ({
                description: item.description || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'pcs',
                unit_price: item.unit_price || 0,
                tax_rate: item.tax_rate || 18,
                tax_amount: item.tax_amount || 0,
                total_price: item.total_price || 0,
                hsn_code: item.hsn_code || '',
            }));
            setUserContext({ confirmed_line_items: items });
        } catch (err: any) {
            setParseError(err.message || 'Network error');
        } finally {
            setIsUploading(false);
        }
    }, [selectedFile, setParsedInvoice, setUserContext]);

    const handleContinue = useCallback(() => {
        if (parsedResult) {
            setCurrentStep(1);
            router.push(`/${orgId}/purchase-orders/context?step=1`);
        }
    }, [parsedResult, setCurrentStep, router, orgId]);

    const getConfidenceColor = (c: number) => {
        if (c >= 0.8) return 'bg-success/10 text-success border-success/30';
        if (c >= 0.6) return 'bg-warning/10 text-warning border-warning/30';
        return 'bg-error/10 text-error border-error/30';
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (authLoading) {
        return <div className="flex items-center justify-center py-20"><Loader /></div>;
    }
    if (!user) {
        return <div className="text-center py-20"><p className="text-text-secondary">Please log in to create purchase orders.</p></div>;
    }

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            {!parsedResult && (
                <>
                    <div className="text-center mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Upload Proforma Invoice</h2>
                        <p className="text-sm text-text-secondary">Upload a PDF or image of the proforma invoice to begin</p>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) validateAndSet(file); }}
                        className={cn(
                            'relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer max-w-2xl mx-auto',
                            'bg-surface hover:bg-surface-elevated',
                            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        )}
                    >
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) validateAndSet(file); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center gap-4 pointer-events-none">
                            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center', isDragOver ? 'bg-primary/10' : 'bg-surface-elevated')}>
                                <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            <p className="text-base font-medium text-text-primary">Drop Proforma Invoice here or click to browse</p>
                            <p className="text-sm text-text-tertiary">Supports PDF, JPG, PNG (max 10MB)</p>
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="mt-4 p-4 bg-surface rounded-lg border border-border max-w-2xl mx-auto">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                                        <p className="text-xs text-text-tertiary">{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                </div>
                                {!isUploading ? (
                                    <Button variant="primary" onClick={handleUpload}>Upload & Parse</Button>
                                ) : (
                                    <div className="flex items-center gap-2"><Loader size="sm" /><span className="text-sm text-text-secondary">{uploadProgress}%</span></div>
                                )}
                            </div>
                            {isUploading && (
                                <div className="mt-3 w-full bg-border rounded-full h-1.5">
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {parseError && (
                <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm max-w-2xl mx-auto">
                    {parseError}
                </div>
            )}

            {/* Parsed Result Preview */}
            {parsedResult && (
                <div className="max-w-2xl mx-auto space-y-4">
                    {parsedResult.confidence < 0.8 && (
                        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
                            <strong>Low extraction confidence.</strong> Please verify all fields in the next step.
                        </div>
                    )}

                    <div className="bg-surface-elevated rounded-lg border border-border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-text-primary">Extracted Invoice Details</h3>
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', getConfidenceColor(parsedResult.confidence))}>
                                {Math.round(parsedResult.confidence * 100)}% confidence
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-text-tertiary">Vendor</p><p className="font-medium text-text-primary">{parsedResult.vendor_name}</p></div>
                            <div><p className="text-text-tertiary">Invoice Number</p><p className="font-medium text-text-primary">{parsedResult.invoice_number}</p></div>
                            <div><p className="text-text-tertiary">Date</p><p className="font-medium text-text-primary">{parsedResult.invoice_date}</p></div>
                            <div><p className="text-text-tertiary">Total Amount</p><p className="font-medium text-text-primary">{parsedResult.currency} {parsedResult.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                            <div><p className="text-text-tertiary">Line Items</p><p className="font-medium text-text-primary">{parsedResult.line_items?.length || 0} items</p></div>
                            {parsedResult.vendor_gstin && <div><p className="text-text-tertiary">Vendor GSTIN</p><p className="font-medium text-text-primary">{parsedResult.vendor_gstin}</p></div>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => { setParsedResult(null); setParsedInvoice(null); setSelectedFile(null); }}>Start Over</Button>
                        <Button variant="primary" onClick={handleContinue}>
                            Continue
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
