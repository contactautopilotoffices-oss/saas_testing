'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/backend/lib/utils';

/* ===================== Context for PO Flow ===================== */
interface POFlowState {
    parsedInvoice: any;
    userContext: any;
    currentStep: number;
    isSubmitting: boolean;
    result: any;
    error: string | null;
}

interface POFlowContextType extends POFlowState {
    setParsedInvoice: (v: any) => void;
    setUserContext: (v: any) => void;
    setCurrentStep: (v: number) => void;
    setIsSubmitting: (v: boolean) => void;
    setResult: (v: any) => void;
    setError: (v: string | null) => void;
    resetFlow: () => void;
}

const POFlowContext = createContext<POFlowContextType | null>(null);

export function usePOFlow() {
    const ctx = useContext(POFlowContext);
    if (!ctx) throw new Error('usePOFlow must be used within PurchaseOrdersLayout');
    return ctx;
}

/* ===================== Step Labels ===================== */
const STEP_LABELS = ['Upload', 'City', 'GST', 'Vendor', 'Billing', 'Review'];

/* ===================== Layout ===================== */
export default function PurchaseOrdersLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const orgId = params.orgId as string;

    const [state, setState] = useState<POFlowState>({
        parsedInvoice: null,
        userContext: { confirmed_line_items: [] },
        currentStep: 1,
        isSubmitting: false,
        result: null,
        error: null,
    });

    const setParsedInvoice = useCallback((v: any) => setState(s => ({ ...s, parsedInvoice: v })), []);
    const setUserContext = useCallback((v: any) => setState(s => ({ ...s, userContext: typeof v === 'function' ? v(s.userContext) : { ...s.userContext, ...v } })), []);
    const setCurrentStep = useCallback((v: number) => setState(s => ({ ...s, currentStep: v })), []);
    const setIsSubmitting = useCallback((v: boolean) => setState(s => ({ ...s, isSubmitting: v })), []);
    const setResult = useCallback((v: any) => setState(s => ({ ...s, result: v })), []);
    const setError = useCallback((v: string | null) => setState(s => ({ ...s, error: v })), []);
    const resetFlow = useCallback(() => setState({
        parsedInvoice: null, userContext: { confirmed_line_items: [] },
        currentStep: 1, isSubmitting: false, result: null, error: null,
    }), []);

    const currentStep = state.currentStep;
    const isNew = typeof window !== 'undefined' && window.location.pathname.includes('/new');
    const isHistory = typeof window !== 'undefined' && window.location.pathname.includes('/history');

    return (
        <POFlowContext.Provider value={{
            ...state, setParsedInvoice, setUserContext, setCurrentStep,
            setIsSubmitting, setResult, setError, resetFlow
        }}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-display font-bold text-text-primary">Zoho Purchase Orders</h1>
                    <p className="text-sm text-text-secondary mt-1">Create purchase orders in Zoho Books from proforma invoices</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-surface rounded-[var(--radius-md)] p-1 w-fit border border-border">
                    <Button
                        variant={isNew ? 'primary' : 'ghost'}
                        onClick={() => router.push(`/${orgId}/purchase-orders/new`)}
                        className="text-sm"
                    >
                        New PO
                    </Button>
                    <Button
                        variant={isHistory ? 'primary' : 'ghost'}
                        onClick={() => router.push(`/${orgId}/purchase-orders/history`)}
                        className="text-sm"
                    >
                        History
                    </Button>
                </div>

                {/* Step Indicator (only during creation flow) */}
                {!isHistory && state.parsedInvoice && currentStep <= 5 && (
                    <div className="w-full py-2">
                        <div className="flex items-center justify-between max-w-3xl">
                            {STEP_LABELS.map((label, i) => {
                                const stepNum = i + 1;
                                const isCompleted = stepNum < currentStep;
                                const isCurrent = stepNum === currentStep;
                                return (
                                    <React.Fragment key={stepNum}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                                                isCompleted && 'bg-success border-success text-white',
                                                isCurrent && 'bg-primary border-primary text-white ring-2 ring-primary/20',
                                                !isCompleted && !isCurrent && 'bg-surface border-border text-text-tertiary'
                                            )}>
                                                {isCompleted ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : stepNum}
                                            </div>
                                            <span className={cn('text-[10px] font-medium hidden sm:block', isCurrent ? 'text-text-primary' : 'text-text-tertiary')}>
                                                {label}
                                            </span>
                                        </div>
                                        {stepNum < 6 && (
                                            <div className="flex-1 h-0.5 mx-1 -mt-4 sm:-mt-6">
                                                <div className={cn('h-full rounded-full transition-all', isCompleted ? 'bg-success' : 'bg-border')} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                {children}
            </div>
        </POFlowContext.Provider>
    );
}
