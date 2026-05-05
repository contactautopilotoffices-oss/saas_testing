'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/backend/lib/utils';
import { Button } from '@/frontend/components/ui/button';
import Loader from '@/frontend/components/ui/Loader';

interface InvoiceUploadProps {
    onUpload: (file: File) => void;
    isUploading: boolean;
    uploadProgress: number;
}

export function InvoiceUpload({ onUpload, isUploading, uploadProgress }: InvoiceUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndSet(file);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) validateAndSet(file);
    }, []);

    function validateAndSet(file: File) {
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF or image file (JPG, PNG)');
            return;
        }
        if (file.size > MAX_SIZE) {
            alert('File size must be less than 10MB');
            return;
        }
        setSelectedFile(file);
    }

    const handleUpload = useCallback(() => {
        if (selectedFile) onUpload(selectedFile);
    }, [selectedFile, onUpload]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'relative border-2 border-dashed rounded-[var(--radius-lg)] p-12 text-center transition-smooth cursor-pointer',
                    'bg-surface hover:bg-surface-elevated',
                    isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
            >
                <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="invoice-upload"
                />

                <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center transition-smooth',
                        isDragOver ? 'bg-primary/10' : 'bg-surface-elevated'
                    )}>
                        <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-base font-medium text-text-primary">
                            Drop Proforma Invoice here or click to browse
                        </p>
                        <p className="text-sm text-text-tertiary mt-1">
                            Supports PDF, JPG, PNG (max 10MB)
                        </p>
                    </div>
                </div>
            </div>

            {selectedFile && (
                <div className="mt-6 p-4 bg-surface rounded-[var(--radius-md)] border border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary/10 flex items-center justify-center">
                                {selectedFile.type === 'application/pdf' ? (
                                    <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M5.25 12h13.5" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-primary truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</p>
                                <p className="text-xs text-text-tertiary">{formatFileSize(selectedFile.size)}</p>
                            </div>
                        </div>

                        {!isUploading ? (
                            <Button variant="primary" onClick={handleUpload} className="ml-4">
                                Upload & Parse
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Loader size="sm" />
                                <span className="text-sm text-text-secondary">{uploadProgress}%</span>
                            </div>
                        )}
                    </div>

                    {isUploading && (
                        <div className="mt-3 w-full bg-border rounded-full h-1.5">
                            <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
