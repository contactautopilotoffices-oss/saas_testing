'use client';

import React from 'react';
import { cn } from '@/backend/lib/utils';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps?: number;
    stepLabels?: string[];
}

const defaultLabels = ['Upload', 'City', 'GST', 'Vendor', 'Billing', 'Review'];

export function StepIndicator({ currentStep, totalSteps = 6, stepLabels = defaultLabels }: StepIndicatorProps) {
    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
                {Array.from({ length: totalSteps }, (_, i) => {
                    const stepNum = i + 1;
                    const isCompleted = stepNum < currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                        <React.Fragment key={stepNum}>
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-smooth border-2',
                                        isCompleted && 'bg-success border-success text-text-inverse',
                                        isCurrent && 'bg-primary border-primary text-text-inverse ring-4 ring-primary/20',
                                        !isCompleted && !isCurrent && 'bg-surface border-border text-text-secondary'
                                    )}
                                >
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        stepNum
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'text-xs font-medium transition-smooth hidden sm:block',
                                        isCurrent ? 'text-text-primary' : 'text-text-tertiary'
                                    )}
                                >
                                    {stepLabels[i]}
                                </span>
                            </div>
                            {stepNum < totalSteps && (
                                <div className="flex-1 h-0.5 mx-2 -mt-5 sm:-mt-7">
                                    <div
                                        className={cn(
                                            'h-full transition-smooth rounded-full',
                                            isCompleted ? 'bg-success' : 'bg-border'
                                        )}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
