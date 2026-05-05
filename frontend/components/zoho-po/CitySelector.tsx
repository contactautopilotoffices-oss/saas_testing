'use client';

import React from 'react';
import { cn } from '@/backend/lib/utils';
import { Label } from '@/frontend/components/ui/label';
import { INDIAN_CITIES } from '@/frontend/types/zoho-po';

interface CitySelectorProps {
    value: string;
    onChange: (city: string) => void;
    error?: string | null;
    className?: string;
}

export default function CitySelector({ value, onChange, error, className }: CitySelectorProps) {
    return (
        <div className={cn('w-full', className)}>
            <Label htmlFor="city-select" className="text-sm font-medium text-text-primary mb-2 block">
                City / Site <span className="text-error">*</span>
            </Label>
            <div className="relative">
                <select
                    id="city-select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(
                        'flex h-12 w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm font-body text-text-primary transition-smooth appearance-none cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
                        'hover:border-primary/50',
                        !value && 'text-text-tertiary',
                        error && 'border-error focus-visible:ring-error'
                    )}
                >
                    <option value="" disabled>
                        Select a city...
                    </option>
                    {INDIAN_CITIES.map((city) => (
                        <option key={city} value={city} className="text-text-primary">
                            {city}
                        </option>
                    ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-error flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                </p>
            )}
            <p className="mt-1.5 text-xs text-text-tertiary">
                Select the city where goods/services will be delivered
            </p>
        </div>
    );
}
