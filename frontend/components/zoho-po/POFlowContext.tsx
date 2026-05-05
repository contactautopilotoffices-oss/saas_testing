'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ParsedInvoice, UserContext, ConfirmedLineItem, POCreationResponse } from '@/backend/lib/zoho-po/types';

interface POFlowState {
    parsedInvoice: ParsedInvoice | null;
    userContext: Partial<UserContext>;
    currentStep: number;
    orgId: string;
    isSubmitting: boolean;
    result: POCreationResponse | null;
    error: string | null;
}

interface POFlowContextValue extends POFlowState {
    setParsedInvoice: (invoice: ParsedInvoice | null) => void;
    setUserContext: (ctx: Partial<UserContext> | ((prev: Partial<UserContext>) => Partial<UserContext>)) => void;
    setCurrentStep: (step: number) => void;
    setOrgId: (orgId: string) => void;
    setIsSubmitting: (v: boolean) => void;
    setResult: (r: POCreationResponse | null) => void;
    setError: (e: string | null) => void;
    resetFlow: () => void;
}

const POFlowContext = createContext<POFlowContextValue | null>(null);

export function usePOFlow() {
    const ctx = useContext(POFlowContext);
    if (!ctx) throw new Error('usePOFlow must be used within POFlowProvider');
    return ctx;
}

const initialState: POFlowState = {
    parsedInvoice: null,
    userContext: { confirmed_line_items: [] },
    currentStep: 1,
    orgId: '',
    isSubmitting: false,
    result: null,
    error: null,
};

export function POFlowProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<POFlowState>(initialState);

    const setParsedInvoice = useCallback((invoice: ParsedInvoice | null) =>
        setState(s => ({ ...s, parsedInvoice: invoice })), []);

    const setUserContext = useCallback((ctx: Partial<UserContext> | ((prev: Partial<UserContext>) => Partial<UserContext>)) =>
        setState(s => ({ ...s, userContext: typeof ctx === 'function' ? ctx(s.userContext) : { ...s.userContext, ...ctx } })), []);

    const setCurrentStep = useCallback((step: number) =>
        setState(s => ({ ...s, currentStep: step })), []);

    const setOrgId = useCallback((orgId: string) =>
        setState(s => ({ ...s, orgId })), []);

    const setIsSubmitting = useCallback((v: boolean) =>
        setState(s => ({ ...s, isSubmitting: v })), []);

    const setResult = useCallback((r: POCreationResponse | null) =>
        setState(s => ({ ...s, result: r })), []);

    const setError = useCallback((e: string | null) =>
        setState(s => ({ ...s, error: e })), []);

    const resetFlow = useCallback(() =>
        setState(initialState), []);

    return (
        <POFlowContext.Provider value={{
            ...state,
            setParsedInvoice, setUserContext, setCurrentStep,
            setOrgId, setIsSubmitting, setResult, setError, resetFlow
        }}>
            {children}
        </POFlowContext.Provider>
    );
}
