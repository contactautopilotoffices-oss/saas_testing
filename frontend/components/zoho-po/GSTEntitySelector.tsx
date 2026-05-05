'use client';

import React from 'react';
import { cn } from '@/backend/lib/utils';
import { Label } from '@/frontend/components/ui/label';
import type { GSTEntity } from '@/frontend/types/zoho-po';

interface GSTEntitySelectorProps {
    entities: GSTEntity[];
    value: string;
    onChange: (entityId: string, entity: GSTEntity) => void;
    isLoading: boolean;
    error?: string | null;
    className?: string;
}

export default function GSTEntitySelector({
    entities,
    value,
    onChange,
    isLoading,
    error,
    className,
}: GSTEntitySelectorProps) {
    if (isLoading) {
        return (
            <div className={cn('w-full', className)}>
                <Label className="text-sm font-medium text-text-primary mb-2 block">
                    GST Registration Entity
                </Label>
                <div className="h-12 rounded-[var(--radius-md)] border border-border bg-surface animate-pulse flex items-center px-4">
                    <div className="w-48 h-4 bg-border rounded" />
                </div>
            </div>
        );
    }

    if (entities.length === 0) {
        return (
            <div className={cn('w-full', className)}>
                <Label className="text-sm font-medium text-text-primary mb-2 block">
                    GST Registration Entity
                </Label>
                <div className="p-4 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10">
                    <p className="text-sm text-warning flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        No GST entities found for this city
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('w-full', className)}>
            <Label htmlFor="gst-entity-select" className="text-sm font-medium text-text-primary mb-2 block">
                GST Registration Entity <span className="text-error">*</span>
            </Label>

            {/* If multiple entities, show dropdown */}
            {entities.length > 1 ? (
                <div className="relative">
                    <select
                        id="gst-entity-select"
                        value={value}
                        onChange={(e) => {
                            const entity = entities.find(ent => ent.id === e.target.value);
                            if (entity) onChange(e.target.value, entity);
                        }}
                        className={cn(
                            'flex h-12 w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm font-body text-text-primary transition-smooth appearance-none cursor-pointer',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
                            'hover:border-primary/50',
                            !value && 'text-text-tertiary',
                            error && 'border-error focus-visible:ring-error'
                        )}
                    >
                        <option value="" disabled>
                            Select GST entity...
                        </option>
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.entity_name} — {entity.gstin}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </div>
            ) : (
                /* If single entity, auto-selected card */
                <div
                    className={cn(
                        'p-4 rounded-[var(--radius-md)] border-2 bg-surface transition-smooth',
                        value === entities[0].id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 cursor-pointer'
                    )}
                    onClick={() => onChange(entities[0].id, entities[0])}
                    role="radio"
                    aria-checked={value === entities[0].id}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-text-primary">{entities[0].entity_name}</p>
                            <p className="text-xs text-text-secondary mt-1">GSTIN: {entities[0].gstin}</p>
                            <p className="text-xs text-text-tertiary mt-0.5">
                                {entities[0].billing_address.line1}, {entities[0].billing_address.city}
                            </p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                            {value === entities[0].id && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1.5 text-xs text-error flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}
