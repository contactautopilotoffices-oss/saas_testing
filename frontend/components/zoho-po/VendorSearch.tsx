'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/backend/lib/utils';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import type { Vendor } from '@/frontend/types/zoho-po';
import Loader from '@/frontend/components/ui/Loader';

interface VendorSearchProps {
    orgId: string;
    invoiceVendorName: string;
    onSelect: (vendor: Vendor) => void;
    selectedVendor: Vendor | null;
    className?: string;
}

export default function VendorSearch({
    orgId,
    invoiceVendorName,
    onSelect,
    selectedVendor,
    className,
}: VendorSearchProps) {
    const [query, setQuery] = useState('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchVendors = useCallback(
        async (searchQuery: string) => {
            if (!searchQuery.trim() || !orgId) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/zoho-po/vendors?orgId=${encodeURIComponent(orgId)}&search=${encodeURIComponent(searchQuery)}`
                );
                if (!response.ok) throw new Error('Failed to fetch vendors');
                const data = await response.json();
                setVendors(data.vendors || []);
                setIsOpen(true);
            } catch (err: any) {
                setError(err.message);
                setVendors([]);
            } finally {
                setIsLoading(false);
            }
        },
        [orgId]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedVendor(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length >= 2) {
            debounceRef.current = setTimeout(() => searchVendors(value), 300);
        } else {
            setVendors([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (vendor: Vendor) => {
        onSelect(vendor);
        setQuery(vendor.vendor_name);
        setIsOpen(false);
    };

    // Check if vendor matches the invoice vendor name
    const isRecommended = (vendor: Vendor): boolean => {
        if (!invoiceVendorName || !vendor.vendor_name) return false;
        const invoiceName = invoiceVendorName.toLowerCase();
        const vendorName = vendor.vendor_name.toLowerCase();
        return (
            invoiceName.includes(vendorName) ||
            vendorName.includes(invoiceName) ||
            vendor.match_score !== null && vendor.match_score >= 0.7
        );
    };

    return (
        <div ref={containerRef} className={cn('w-full relative', className)}>
            <Label htmlFor="vendor-search" className="text-sm font-medium text-text-primary mb-2 block">
                Search Vendors <span className="text-error">*</span>
            </Label>
            <div className="relative">
                <Input
                    id="vendor-search"
                    type="text"
                    placeholder="Type vendor name (min 2 characters)..."
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (vendors.length > 0) setIsOpen(true);
                    }}
                    className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isLoading ? (
                        <Loader size="sm" />
                    ) : (
                        <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    )}
                </div>
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-error">{error}</p>
            )}

            {/* Invoice vendor hint */}
            {invoiceVendorName && (
                <p className="mt-1.5 text-xs text-text-secondary">
                    Vendor from invoice: <span className="font-medium text-text-primary">{invoiceVendorName}</span>
                </p>
            )}

            {/* Dropdown results */}
            {isOpen && vendors.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-[var(--radius-md)] shadow-md max-h-80 overflow-y-auto">
                    {vendors.map((vendor) => {
                        const recommended = isRecommended(vendor);
                        return (
                            <button
                                key={vendor.id}
                                onClick={() => handleSelect(vendor)}
                                className={cn(
                                    'w-full text-left px-4 py-3 flex items-center gap-3 transition-smooth hover:bg-surface-elevated border-b border-border last:border-b-0',
                                    selectedVendor?.id === vendor.id && 'bg-primary/5'
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-text-primary truncate">
                                            {vendor.vendor_name}
                                        </p>
                                        {recommended && (
                                            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success border border-success/20">
                                                Recommended
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        {vendor.gstin && (
                                            <span className="text-xs text-text-tertiary">GSTIN: {vendor.gstin}</span>
                                        )}
                                        {vendor.match_score !== null && (
                                            <span
                                                className={cn(
                                                    'text-xs font-medium',
                                                    vendor.match_score >= 0.7
                                                        ? 'text-success'
                                                        : vendor.match_score >= 0.4
                                                            ? 'text-warning'
                                                            : 'text-text-tertiary'
                                                )}
                                            >
                                                {Math.round(vendor.match_score * 100)}% match
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {isOpen && !isLoading && query.trim().length >= 2 && vendors.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-[var(--radius-md)] shadow-md p-4 text-center">
                    <p className="text-sm text-text-secondary">No vendors found</p>
                    <p className="text-xs text-text-tertiary mt-1">
                        Try a different search term or create a new vendor
                    </p>
                </div>
            )}
        </div>
    );
}
